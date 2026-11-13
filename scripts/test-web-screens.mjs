#!/usr/bin/env node
// Build the public web trial and open every screen on it.
//
// Nothing else in `npm run check` does: `build` and `screens` run in local
// mode, and test-web.mjs drives the engine through tsc-transpiled modules, so
// it never sees next.config.ts and never renders a page. Without this step a
// server-rendered screen that reads the record outside `withEmptyRecord`
// passes all of the other checks and 500s on the deployed trial — which is
// exactly what happened to two of them (the architecture review, F5/F9).
//
// It builds into its own folder and never touches a running dev server's.
import assert from "node:assert/strict";
import {spawn, spawnSync} from "node:child_process";
import {createServer} from "node:net";

const DIST = ".next-webcheck";
const env = {...process.env, FORTHREE_MODE: "web", FORTHREE_DIST_DIR: DIST};

const free = await new Promise((done, fail) => {
  const probe = createServer();
  probe.on("error", fail);
  probe.listen(0, "127.0.0.1", () => {
    const {port} = probe.address();
    probe.close(() => done(port));
  });
});

const built = spawnSync("npx", ["next", "build", "--webpack"], {encoding: "utf8", env, maxBuffer: 64 * 1024 * 1024});
assert.equal(built.status, 0, `the web trial does not build:\n${built.stdout}\n${built.stderr}`);

const server = spawn("npx", ["next", "start", "--hostname", "127.0.0.1", "--port", String(free)], {env, stdio: ["ignore", "pipe", "pipe"]});
let log = "";
server.stdout.on("data", chunk => { log += chunk; });
server.stderr.on("data", chunk => { log += chunk; });

const base = `http://127.0.0.1:${free}`;
try {
  const until = Date.now() + 30000;
  for (;;) {
    try { await fetch(base, {signal: AbortSignal.timeout(2000)}); break; }
    catch {
      assert.ok(Date.now() < until, `the web trial never answered on ${base}:\n${log}`);
      await new Promise(done => setTimeout(done, 200));
    }
  }

  // Every screen the trial serves, rendered on a server that holds no record.
  for (const [path, holds] of [
    ["/", "one line through"],
    ["/curriculum", "Ten blocks"],
    // Drawn in the browser on the trial, so the server sends its waiting line.
    ["/board", "Reading what this browser has kept"],
    ["/reading-log", "Reading log"],
    ["/sessions/1", "Get code to run at all"],
    // Not the Shell's own class: that is on RecordError and on the runner's
    // error state too, so it would pass on a screen that failed. This is the
    // runner's own waiting line, which only the real component emits.
    ["/session/s01-lab-a", "Opening your work"],
  ]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, `${path} answered ${response.status} on the web trial:\n${log.slice(-1500)}`);
    const body = await response.text();
    assert.ok(body.includes(holds), `${path} rendered without "${holds}"`);
    console.log(`  ok  ${path} renders with no record on the server`);
  }

  // And the local addresses stay shut, on a real build rather than a stub.
  const shut = await fetch(`${base}/api/part/s01-lab-a/attempt/1`);
  assert.equal(shut.status, 404, `the local API answered ${shut.status} on the trial`);

  // The one door answers, and the course's own files were carried into the
  // build: a missing content/ or curriculum/ shows up here as a 500.
  const door = await fetch(`${base}/api/web`, {
    method: "POST",
    headers: {"content-type": "application/json", origin: base},
    body: JSON.stringify({path: "/api/part/s01-lab-a/attempt/1", method: "GET", record: {}}),
  });
  assert.equal(door.status, 200, `the web door answered ${door.status}:\n${log.slice(-1500)}`);
  assert.equal((await door.json()).data.part.id, "s01-lab-a");
  console.log("  ok  one door answers, and the course's files are in the build");
} finally {
  server.kill("SIGTERM");
}
console.log("The web trial builds, and every screen on it renders.");
