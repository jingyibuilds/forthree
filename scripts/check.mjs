#!/usr/bin/env node
// Every check, in one command, in the order that fails fastest.
//
//   npm run check        before every commit: about half a minute
//
// It stops at the first failure and says which step it was. Nothing here
// touches the owner's own record in study/: the tests and the screens run on
// temporary records of their own.
import {spawnSync} from "node:child_process";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const node = process.execPath;
const steps = [
  ["content", "the course content is well-formed and leaks no answer", node, ["scripts/validate-content.mjs"]],
  ["measure", "every sentence about a program matches what the program prints", node, ["scripts/measure-content.mjs"]],
  ["lint", "the code follows the project's rules", "npx", ["eslint"]],
  // tsc needs the route types Next generates; a fresh clone has none yet.
  ["typegen", "Next generates the route types the type check needs", "npx", ["next", "typegen"]],
  ["types", "the code type-checks", "npx", ["tsc", "--noEmit"]],
  ["engine", "the study engine keeps its rules", node, ["scripts/test-study.mjs"]],
  ["store", "the disk store and the web trial's in-memory store answer the same way", node, ["scripts/test-store.mjs"]],
  ["web", "the public web trial answers over one stateless door and keeps nothing", node, ["scripts/test-web.mjs"]],
  ["build", "the app builds", "npx", ["next", "build", "--webpack"]],
  ["screens", "every screen draws and its controls work, in a real browser", node, ["scripts/smoke-ui.mjs"]],
  ["trial", "the public web trial builds, and every screen on it renders", node, ["scripts/test-web-screens.mjs"]],
];

const results = [];
for (const [name, what, command, args] of steps) {
  const started = Date.now();
  // Builds go to .next-check, never the .next her dev server uses (next.config.ts).
  const env = ["build", "screens"].includes(name) ? {...process.env, FORTHREE_DIST_DIR: ".next-check"} : process.env;
  const result = spawnSync(command, args, {cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env});
  const seconds = ((Date.now() - started) / 1000).toFixed(0);
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (result.status !== 0) {
    console.error(output.split("\n").slice(-40).join("\n"));
    console.error(`\ncheck: FAILED at "${name}" — ${what}. ${results.length} step(s) passed before it.`);
    process.exit(1);
  }
  // A check that did not run has not passed.
  const skipped = /SKIPPED/.test(output);
  results.push([name, skipped ? "SKIPPED" : "ok", `${seconds}s`, skipped ? output.split("\n").at(-1) : what]);
  console.log(`${skipped ? "SKIP" : " ok "}  ${name.padEnd(8)} ${seconds.padStart(4)}s  ${skipped ? output.split("\n").at(-1) : what}`);
}
const skipped = results.filter(([, state]) => state === "SKIPPED");
console.log(skipped.length
  ? `\ncheck: ${results.length - skipped.length} of ${results.length} steps passed; ${skipped.length} did not run (above).`
  : `\ncheck: all ${results.length} steps passed.`);
process.exit(skipped.length ? 2 : 0);
