#!/usr/bin/env node
// Every sentence about a program is measured by running the program
// (docs/LESSONS.md L-AUTH-02). Seven such sentences shipped wrong in sessions
// 1-3 and were caught only by reviewers who re-ran the code. This does it
// without a reviewer:
//
//   1. It runs every lab, interview and reference program in the course's own
//      Python and compares what each prints with the recorded snapshot in
//      curriculum/measured/<block>.json. A program that now prints something
//      else fails the check: re-measure, and re-read every sentence about it.
//   2. It checks every claim in curriculum/claims/<block>.json: the quoted
//      text must be in the named content field AND in what the named program
//      prints. A claim that is in neither place any more is stale.
//   3. It requires every program to be named by at least one claim, so a
//      program cannot be added without saying what the content says about it.
//
//   node scripts/measure-content.mjs            check (the default)
//   node scripts/measure-content.mjs --write    re-record the snapshot
//
// It needs the course environment (scripts/setup-python.sh). Without it the
// check is skipped, loudly, and exits 0 — CI has no .venv — unless --require.
import {createHash} from "node:crypto";
import {existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {dirname, join, relative, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const python = join(root, ".venv/bin/python3");
const BLOCK = "a1";
const snapshotPath = join(root, "curriculum/measured", `${BLOCK}.json`);
const claimsPath = join(root, "curriculum/claims", `${BLOCK}.json`);
const write = process.argv.includes("--write");
const required = process.argv.includes("--require");

if (!existsSync(python)) {
  const message = "measure-content: SKIPPED — the course environment (.venv) is not installed, so no program was run. "
    + "Run scripts/setup-python.sh, then this again.";
  console.log(message);
  process.exit(required ? 1 : 0);
}

/** Every .py under a folder, one level of sub-folders deep, sorted. */
function programsIn(folder) {
  const base = join(root, folder);
  if (!existsSync(base)) return [];
  const found = [];
  for (const entry of readdirSync(base, {withFileTypes: true})) {
    if (entry.isFile() && entry.name.endsWith(".py")) found.push(join(folder, entry.name));
    if (entry.isDirectory()) {
      for (const inner of readdirSync(join(base, entry.name))) {
        if (inner.endsWith(".py")) found.push(join(folder, entry.name, inner));
      }
    }
  }
  return found.sort();
}

function run(args, cwd) {
  const result = spawnSync(python, args, {
    cwd, encoding: "utf8", timeout: 30_000,
    // No colour, no user site, nothing of the caller's Python in the way.
    env: {PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", NO_COLOR: "1", PYTHONNOUSERSITE: "1"},
  });
  const stderrLines = (result.stderr ?? "").split("\n").map(line => line.trimEnd()).filter(Boolean);
  return {
    exit: result.status,
    stdout: result.stdout ?? "",
    // Only the last line: the rest of a traceback carries this machine's paths.
    stderr_last: stderrLines.at(-1) ?? "",
  };
}

// This checkout's own path is not part of what a program prints.
const portable = text => text.split(root).join("<repo>");
const measure = path => {
  const result = run([path.split("/").at(-1)], join(root, dirname(path)));
  return {
    sha256: createHash("sha256").update(readFileSync(join(root, path))).digest("hex"),
    exit: result.exit, stdout: portable(result.stdout), stderr_last: portable(result.stderr_last),
  };
};
// A program that reports on the machine it runs on prints something different
// on every machine. For those only the exit status is compared; what the
// content says about them is still held by their claims.
const claimsFile = existsSync(claimsPath) ? JSON.parse(readFileSync(claimsPath, "utf8")) : null;
const volatile = new Set(claimsFile?.volatile ?? []);

const programs = [
  ...programsIn("content/interviews"),
  ...programsIn("public/labs"),
  ...programsIn("curriculum/reference"),
];
const measured = Object.fromEntries(programs.map(path => [path, measure(path)]));
const versions = run(["-c", "import platform\ntry:\n    import numpy\n    n = numpy.__version__\nexcept Exception:\n    n = 'absent'\nprint(platform.python_version(), platform.machine(), 'numpy', n)"], root).stdout.trim();

if (write) {
  mkdirSync(dirname(snapshotPath), {recursive: true});
  writeFileSync(snapshotPath, JSON.stringify({measured_with: versions, programs: measured}, null, 2) + "\n");
  console.log(`measure-content: recorded ${programs.length} programs with ${versions} -> ${relative(root, snapshotPath)}`);
  console.log("Now re-read every sentence the content says about any program whose output changed (git diff shows which).");
  process.exit(0);
}

const errors = [];
const snapshot = existsSync(snapshotPath) ? JSON.parse(readFileSync(snapshotPath, "utf8")) : null;
if (!snapshot) errors.push(`${relative(root, snapshotPath)} is missing: run this with --write once, and commit it`);

// 1. Nothing prints anything other than what was recorded.
for (const path of programs) {
  const before = snapshot?.programs?.[path];
  const now = measured[path];
  if (!before) { errors.push(`${path}: not in the snapshot — a new program; record it with --write and add its claims`); continue; }
  for (const field of volatile.has(path) ? ["exit"] : ["exit", "stdout", "stderr_last"]) {
    if (before[field] !== now[field]) {
      errors.push(`${path}: ${field} changed since it was measured.\n    recorded: ${JSON.stringify(before[field])}\n    now:      ${JSON.stringify(now[field])}\n    Re-read every sentence about this program, then re-record with --write.`);
    }
  }
}
for (const path of Object.keys(snapshot?.programs ?? {})) {
  if (!measured[path]) errors.push(`${path}: in the snapshot but no longer in the tree; re-record with --write`);
}

// 2. Every claim is in the content and in what the program prints.
const block = JSON.parse(readFileSync(join(root, "curriculum", `${BLOCK}.json`), "utf8"));
const parts = new Map(block.sessions.flatMap(session => session.parts.map(part => [part.id, part])));
const claims = claimsFile?.claims ?? null;
if (!claims) errors.push(`${relative(root, claimsPath)} is missing`);
// Compared as she reads it: markup off, and typeset quotes as plain ones, so a
// program's straight apostrophe matches the content's curly one.
const straight = text => text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
const plain = value => straight((typeof value === "string" ? value : JSON.stringify(value))
  .replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"));
const fieldOf = (part, path) => path.split(".").reduce((value, key) => (value == null ? value : value[key]), part);
const named = new Set();

for (const [index, claim] of (claims ?? []).entries()) {
  const where = `claim ${index + 1} (${claim.part} ${claim.in})`;
  const part = parts.get(claim.part);
  if (!part) { errors.push(`${where}: no such part`); continue; }
  const field = fieldOf(part, claim.in);
  if (field == null) { errors.push(`${where}: no such field`); continue; }
  const said = plain(field);
  let output;
  for (const file of claim.uses ?? []) named.add(file);
  if (claim.from) {
    named.add(claim.from);
    const result = measured[claim.from];
    if (!result) { errors.push(`${where}: ${claim.from} is not a measured program`); continue; }
    output = result.stdout + "\n" + result.stderr_last;
  } else if (claim.code) {
    const result = run(["-c", claim.code], root);
    if (result.exit !== 0) { errors.push(`${where}: its code did not run: ${result.stderr_last}`); continue; }
    output = result.stdout;
  } else { errors.push(`${where}: needs "from" (a program) or "code"`); continue; }
  const lines = output.split("\n").map(line => line.trim());
  for (const line of claim.lines ?? []) {
    if (!lines.includes(line)) errors.push(`${where}: the program does not print the line ${JSON.stringify(line)}`);
    // `content_lines: false` — the line proves a quoted number is on the
    // right line of output, and the content quotes only the number.
    if (claim.content_lines !== false && !said.includes(line)) errors.push(`${where}: the content no longer says ${JSON.stringify(line)} — the claim is stale`);
  }
  // What the content quotes from the program's own text, such as the request
  // in its header, must be there word for word.
  const source = claim.from ? straight(readFileSync(join(root, claim.from), "utf8")) : "";
  for (const quote of claim.source_quotes ?? []) {
    if (!source.includes(straight(quote))) errors.push(`${where}: ${claim.from} does not contain ${JSON.stringify(quote)}`);
    if (!said.includes(straight(quote))) errors.push(`${where}: the content no longer says ${JSON.stringify(quote)} — the claim is stale`);
  }
  for (const quote of claim.quotes ?? []) {
    if (!output.includes(quote)) errors.push(`${where}: the program's output does not contain ${JSON.stringify(quote)}`);
    if (!said.includes(quote)) errors.push(`${where}: the content no longer says ${JSON.stringify(quote)} — the claim is stale`);
  }
  if (!(claim.lines ?? []).length && !(claim.quotes ?? []).length && !(claim.source_quotes ?? []).length) errors.push(`${where}: claims nothing`);
}

// 3. Every program is spoken for.
for (const path of programs) {
  if (!named.has(path)) errors.push(`${path}: no claim names this program. Say what the content says about it in ${relative(root, claimsPath)}.`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`\nmeasure-content: ${errors.length} problem(s).`);
  process.exit(1);
}
console.log(`measure-content: ${programs.length} programs print what was recorded (${versions}); ${claims.length} claims hold; every program is named by a claim.`);
