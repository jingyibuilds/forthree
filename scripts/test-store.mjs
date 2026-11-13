#!/usr/bin/env node
// The two store drivers answer the same way.
//
// `src/lib/study/store.ts` writes the owner's record to disk; in web mode
// (PUBLISH.md §6) it keeps the visitor's record in memory instead. The engine
// above it is one piece of code either way, so what has to be proved is that
// the five primitives behave identically — otherwise the web trial grades by
// rules the local course does not have.
//
// Every assertion runs twice: once against a temporary folder, once against a
// Map. The filesystem driver's own durability machinery (atomic rename,
// fsync, torn lines, corruption markers) is tested by test-study.mjs; in
// memory those failures cannot happen, and this file does not pretend they can.
//
// One difference is deliberate and is not asserted here: on failure. A
// mutation that writes two files and throws between them leaves the first
// write committed on disk — `transaction` has no rollback — while on the web
// trial the response simply never carries the new record, so the browser
// keeps the old one whole. The web behaviour is the safer of the two; it is
// written down because "the five primitives behave identically" is this
// file's claim and failure atomicity is where that stops being true.
import assert from "node:assert/strict";
import {mkdtemp} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {createRequire} from "node:module";

const temporary = await mkdtemp(path.join(os.tmpdir(), "forthree-store-test-"));
const compiled = path.join(temporary, "compiled");
const result = spawnSync(process.execPath, ["node_modules/typescript/bin/tsc",
  "--target", "ES2020", "--module", "commonjs", "--moduleResolution", "node",
  "--esModuleInterop", "--strict", "--skipLibCheck", "--outDir", compiled,
  "src/lib/study/store.ts"], {encoding: "utf8"});
assert.equal(result.status, 0, result.stdout + result.stderr);
const require = createRequire(import.meta.url);
const store = require(path.join(compiled, "store.js"));
const memory = require(path.join(compiled, "store-memory.js"));

process.env.FORTHREE_STUDY_ROOT = path.join(temporary, "records");

const code = async (run, expected) => {
  await assert.rejects(run, error => {
    assert.equal(error.code, expected, `expected ${expected}, got ${error.code}`);
    return true;
  });
};

// One body, run under each driver. `enter` gives the memory driver a record to
// work in, the way a request does.
async function contract(driver) {
  const where = `the ${driver} driver`;

  assert.equal(await store.readJson("plan.json"), null, `${where}: a file that was never written reads as null`);
  assert.deepEqual(await store.readJsonl("ledger.jsonl"), [], `${where}: a log that was never written reads as no rows`);

  await store.writeJson("plan.json", {version: 1, current_session: 1, note: "kept"});
  assert.deepEqual(await store.readJson("plan.json"), {version: 1, current_session: 1, note: "kept"}, `${where}: what was written reads back`);

  await store.writeJson("plan.json", {version: 1, current_session: 2});
  assert.equal((await store.readJson("plan.json")).current_session, 2, `${where}: a second write replaces the first`);

  await store.writeJson("sessions/s01-lab-a-1.json", {version: 1, part: "s01-lab-a"});
  assert.equal((await store.readJson("sessions/s01-lab-a-1.json")).part, "s01-lab-a", `${where}: a record in a folder reads back`);

  await store.appendJsonl("ledger.jsonl", {ts: "a", cleared: false});
  await store.appendJsonl("ledger.jsonl", {ts: "b", cleared: true});
  const rows = await store.readJsonl("ledger.jsonl");
  assert.equal(rows.length, 2, `${where}: two appends are two rows`);
  assert.deepEqual(rows[1], {ts: "b", cleared: true}, `${where}: the second row is the second append`);

  assert.equal(await store.transaction(async () => "value"), "value", `${where}: a transaction returns what its body returns`);
  await assert.rejects(() => store.transaction(async () => { throw new Error("inside"); }),
    /inside/, `${where}: a transaction lets its body's failure through`);

  await store.writeJson("recall.json", {version: 1});
  assert.equal(await store.transaction(async () => (await store.readJson("recall.json")).version), 1, `${where}: a read inside a transaction sees the record`);
}

// Only the version refusal is shared: a record the driver did not write. On
// disk the test plants a file; in memory it plants a map entry.
async function refusals(driver, plant) {
  await plant("future.json", JSON.stringify({version: 2}));
  await code(() => store.readJson("future.json"), "unsupported_version");
  await plant("broken.json", "{not json");
  await code(() => store.readJson("broken.json"), "corrupt_record");
  await plant("broken.jsonl", '{"ok":1}\n{not json\n');
  await code(() => store.readJsonl("broken.jsonl"), "corrupt_record");
  console.log(`  ok  ${driver}: a record of an unknown version or unreadable JSON refuses`);
}

// Pass 1: the filesystem.
const {writeFile, mkdir} = await import("node:fs/promises");
const diskPlant = async (relative, text) => {
  const file = path.join(process.env.FORTHREE_STUDY_ROOT, relative);
  await mkdir(path.dirname(file), {recursive: true});
  await writeFile(file, text);
};
await contract("filesystem");
await refusals("filesystem", diskPlant);
console.log("  ok  filesystem: the five primitives hold");

// Pass 2: memory, inside a record the way a request supplies one.
process.env.FORTHREE_MODE = "web";
const record = new Map();
await memory.enterRecord(record, async () => {
  await contract("memory");
  await refusals("memory", async (relative, text) => { record.set(relative, text); });
  console.log("  ok  memory: the five primitives hold");

  // What the response hands back to the browser, and reads back in.
  const carried = memory.recordTo(record);
  assert.equal(typeof carried["plan.json"], "string", "the record serialises as path to text");
  const again = memory.recordFrom(JSON.parse(JSON.stringify(carried)));
  assert.deepEqual([...again.keys()].sort(), [...record.keys()].sort(), "a record survives the round trip through JSON");
  assert.equal(memory.recordFrom({"a.json": 7, "b.json": "kept"}).size, 1, "a key whose value is not text is dropped");
  console.log("  ok  memory: a record survives the round trip to the browser and back");
});

// Without a record, and without the test harness's opt-in, web mode refuses
// rather than sharing one record between visitors.
delete process.env.FORTHREE_ALLOW_GLOBAL_RECORD;
await code(() => store.readJson("plan.json"), "no_record");
console.log("  ok  memory: a request that carried no record refuses");

console.log("Both store drivers answer the same way.");
