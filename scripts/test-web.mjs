#!/usr/bin/env node
// The public web trial's one door (PUBLISH.md §6), driven the way a browser
// drives it: the record travels with each call and the server keeps nothing.
//
// What this proves, and test-study.mjs cannot: that a session advances across
// requests with no state on the server, that a visitor who arrives with an
// empty record gets a fresh course rather than someone else's, and that
// another site cannot drive the trial.
import assert from "node:assert/strict";
import {mkdtemp, writeFile} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {createRequire} from "node:module";

process.env.FORTHREE_MODE = "web";
const temporary = await mkdtemp(path.join(os.tmpdir(), "forthree-web-test-"));
const compiled = path.join(temporary, "compiled");
const result = spawnSync(process.execPath, ["node_modules/typescript/bin/tsc",
  "--target", "ES2020", "--module", "commonjs", "--moduleResolution", "node",
  "--esModuleInterop", "--strict", "--skipLibCheck", "--outDir", compiled,
  "src/lib/study/service.ts", "src/lib/study/http.ts"], {encoding: "utf8"});
assert.equal(result.status, 0, result.stdout + result.stderr);

const require = createRequire(import.meta.url);
const ts = require("typescript");
const Module = require("node:module");
const originalLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === "server-only") return {};
  if (id.startsWith("@/lib/study/")) return require(path.join(compiled, id.slice("@/lib/study/".length) + ".js"));
  return originalLoad.call(this, id, ...args);
};
const source = await readRoute("src/app/api/web/route.ts");
await writeFile(path.join(temporary, "web.cjs"), source);
const web = require(path.join(temporary, "web.cjs"));
await writeFile(path.join(temporary, "attempt.cjs"), await readRoute("src/app/api/part/[id]/attempt/[n]/[[...action]]/route.ts"));

async function readRoute(relative) {
  const {readFile} = await import("node:fs/promises");
  const text = await readFile(relative, "utf8");
  return ts.transpileModule(text, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;
}

const SITE = "https://forthree.example";
const call = (body, headers = {}) => new Request(`${SITE}/api/web`, {
  method: "POST",
  headers: {"content-type": "application/json", host: "forthree.example", origin: SITE, "sec-fetch-site": "same-origin", ...headers},
  body: JSON.stringify(body),
});
async function ask(path, {method = "GET", body, record = {}, status = 200} = {}) {
  const response = await web.POST(call({path, method, body, record}));
  const said = await response.json();
  assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(said).slice(0, 300)}`);
  return said;
}

const part = "s01-lab-a";
// A visitor who has never been here.
const first = await ask(`/api/part/${part}/attempt/1`);
assert.equal(first.data.part.id, part, "the first call serves the part");
assert.equal(first.data.part.predict.correct, undefined, "the answer is not in what it serves");
assert.ok(Object.keys(first.record).length > 0, "the first call hands back a record to keep");
console.log("  ok  a visitor with no record gets the first part, and a record to keep");

// The next call carries what came back, and the session moves on.
const sealed = await ask(`/api/part/${part}/attempt/1/seal`, {method: "POST", body: {choice: 1}, record: first.record});
assert.ok(sealed.record["sessions/s01-lab-a-1.json"], "the sealed prediction is in the record it hands back");
assert.match(sealed.record["sessions/s01-lab-a-1.json"], /sealed_at/, "and it is sealed");
console.log("  ok  a session advances across two requests, each carrying the record");

// Nothing stayed on the server: the same call with an empty record is a
// visitor who has just arrived, not the one above.
const stranger = await ask(`/api/part/${part}/attempt/1`);
// Not `stranger.data.record?.prediction?.sealed_at ?? null`: every optional
// link in that chain is a way for this assertion to pass while checking
// nothing, and it is the only guard against the worst failure here.
assert.deepEqual(Object.keys(stranger.record).sort(), Object.keys(first.record).sort(),
  "a second visitor's record holds what a first visit makes, no more");
assert.equal(stranger.data.record.prediction, undefined, "and is served with no prediction on it");
assert.equal(JSON.stringify(stranger.record).includes("sealed_at"), false, "and carries no part of the first visitor's work");
console.log("  ok  the server kept nothing: an empty record is a new visitor");

// Two calls in flight at once, with different records: the design rests on
// AsyncLocalStorage keeping them apart, and nothing else holds that.
const [left, right] = await Promise.all([
  ask(`/api/part/${part}/attempt/1`, {record: sealed.record}),
  ask(`/api/part/${part}/attempt/1`, {record: {}}),
]);
assert.ok(left.record["sessions/s01-lab-a-1.json"].includes("sealed_at"), "the sealed caller keeps its seal");
assert.equal(JSON.stringify(right.record).includes("sealed_at"), false, "the empty caller gets no part of the other's work");
assert.equal(right.data.record.prediction, undefined, "and is served as the new visitor it is");
console.log("  ok  two overlapping requests with different records stay apart");

// And the one who kept theirs is still sealed.
const returning = await ask(`/api/part/${part}/attempt/1`, {record: sealed.record});
assert.ok(returning.data.record.prediction.sealed_at, "the record the browser kept restores the work");
console.log("  ok  the record the browser kept restores the session");

// A refused call never costs a visitor their work.
const refused = await ask(`/api/part/${part}/attempt/1/seal`, {method: "POST", body: {choice: 0}, record: sealed.record, status: 409});
assert.equal(refused.error, "already_sealed", `refused with ${refused.error}`);
assert.deepEqual(refused.record, sealed.record, "a refusal hands the record back untouched");
console.log("  ok  a refused call hands the record back untouched");

// The lab escape: a web page has no terminal, so a visitor can move past the
// lab, and the record keeps that it was not run.
let record = sealed.record;
const task = await ask(`/api/part/${part}/attempt/1/task/0`, {method: "POST", body: {did_pass: true}, record});
record = task.record;
const toAttempt = await ask(`/api/part/${part}/attempt/1/step`, {method: "POST", body: {step: "attempt"}, record});
record = toAttempt.record;
const blocked = await ask(`/api/part/${part}/attempt/1/step`, {method: "POST", body: {step: "compare"}, record, status: 409});
assert.equal(blocked.error, "receipt_not_accepted", `expected the lab to gate, got ${blocked.error}`);
const escaped = await ask(`/api/part/${part}/attempt/1/skip-lab`, {method: "POST", body: {}, record});
record = escaped.record;
assert.match(record["sessions/s01-lab-a-1.json"], /lab_skipped_at/, "the record keeps that the lab was not run");
const moved = await ask(`/api/part/${part}/attempt/1/step`, {method: "POST", body: {step: "compare"}, record});
assert.equal(moved.data.record.step, "compare", "the session moves on");
assert.equal(moved.data.record.passed_at ?? null, null, "and nothing recorded it as a pass");
console.log("  ok  the lab can be moved past unrun, and the record says it was not run");

// The escape is terminal for the attempt it was used in: one call past the
// closed paste box would otherwise set passed_at on a lab nobody ran, and the
// board counts passed labs.
const afterSkip = await ask(`/api/part/${part}/attempt/1/receipt`, {method: "POST", body: {raw: "anything"}, record, status: 409});
assert.equal(afterSkip.error, "already_skipped", `expected already_skipped, got ${afterSkip.error}`);
console.log("  ok  a receipt is refused once the lab was moved past unrun");

// A record grows without a bound — attempts are unlimited and each receipt
// holds up to 100 KB of pasted output — and both ceilings above it (the host's
// body limit, localStorage) fail silently and brick the trial. This one does
// not: it refuses while there is still a server to say what to do.
const huge = {...record, "receipts/pad.json": "x".repeat(2_100_000)};
const tooBig = await ask(`/api/part/${part}/attempt/1`, {record: huge, status: 413});
assert.equal(tooBig.error, "record_too_large", `expected record_too_large, got ${tooBig.error}`);
assert.match(tooBig.message, /Save your record/, "and the refusal says what to do about it");
assert.equal("record" in tooBig, false, "a record it would not read is not one it hands back");
console.log("  ok  a record past the ceiling is refused, with a way out");

// Another site cannot drive it, and neither can a call with no body.
assert.equal((await web.POST(call({path: `/api/part/${part}/attempt/1`}, {"sec-fetch-site": "cross-site"}))).status, 403);
assert.equal((await web.POST(call({path: `/api/part/${part}/attempt/1`}, {origin: "https://elsewhere.example"}))).status, 403);
assert.equal((await web.POST(call({path: "not-an-api-path"}))).status, 422);
assert.equal((await web.POST(new Request(`${SITE}/api/web`, {method: "POST", headers: {host: "forthree.example", origin: SITE}, body: "{"}))).status, 422);
console.log("  ok  a cross-site call, a foreign origin and an unreadable body are refused");

// None of those refusals may hand back a record. They happen before this
// call's record has been read, so there is nothing to hand back, and an empty
// one written to the browser would erase everything the visitor had done.
for (const [what, refused] of [
  ["a cross-site call", await web.POST(call({path: `/api/part/${part}/attempt/1`, record: sealed.record}, {"sec-fetch-site": "cross-site"}))],
  ["a foreign origin", await web.POST(call({path: `/api/part/${part}/attempt/1`, record: sealed.record}, {origin: "https://elsewhere.example"}))],
  ["a path that is not an address", await web.POST(call({path: "not-an-api-path", record: sealed.record}))],
  ["an unreadable body", await web.POST(new Request(`${SITE}/api/web`, {method: "POST", headers: {host: "forthree.example", origin: SITE}, body: "{"}))],
]) {
  const said = await refused.json();
  assert.equal("record" in said, false, `${what} must hand back no record at all, not an empty one`);
}
console.log("  ok  a refusal before the record is read hands back no record");

// The trial never calls a provider, and not because a key was left unset: in
// web mode the spend ledger the caps read is part of the record the caller
// sent, so a cap computed from it could never trip.
{
  process.env.OPENROUTER_API_KEY = "test-key-that-must-not-be-used";
  const asked = await ask("/api/llm", {method: "POST", body: {feature: "followup", question: "what is a prompt?"}});
  assert.equal(asked.data.text, null, "the trial returns no model text");
  assert.equal(asked.data.reason, "not_configured", `expected not_configured, got ${asked.data.reason}`);
  assert.equal(JSON.stringify(asked.record).includes("llm_usage"), false, "and nothing was billed to the record it was handed");
  delete process.env.OPENROUTER_API_KEY;
  console.log("  ok  the trial calls no provider even with a key set");
}

// And the local addresses are shut on the trial: one door, not five.
const local = require(path.join(temporary, "attempt.cjs"));
assert.equal((await local.GET(new Request(`${SITE}/api/part/${part}/attempt/1`))).status, 404);
console.log("  ok  the local addresses are shut on the trial: one door, not five");

// The door does not exist in her own copy.
process.env.FORTHREE_MODE = "local";
assert.equal((await web.POST(call({path: `/api/part/${part}/attempt/1`}))).status, 404);
console.log("  ok  the web door is a 404 in the local app");

// The browser side: each call carries the whole record, so two calls in flight
// would both start from the same copy and the later reply would erase the
// earlier one's change (a note save and a tick on one screen). studyFetch
// sends one at a time. A first reply slower than the second must still leave
// both changes in the kept record.
{
  const {readFile, mkdir} = await import("node:fs/promises");
  const out = path.join(temporary, "client");
  await mkdir(out, {recursive: true});
  for (const [from, to] of [["src/lib/mode.ts", "mode.js"], ["src/lib/study-fetch.ts", "study-fetch.js"]]) {
    const code = ts.transpileModule(await readFile(from, "utf8"), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;
    await writeFile(path.join(out, to), code.replace('"@/lib/mode"', '"./mode.js"'));
  }
  const kept = new Map();
  globalThis.localStorage = {getItem: key => kept.get(key) ?? null, setItem: (key, value) => kept.set(key, value)};
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    const {body, record} = JSON.parse(init.body);
    await new Promise(done => setTimeout(done, calls++ === 0 ? 120 : 5));
    return new Response(JSON.stringify({data: {}, record: {...record, ...body}}), {status: 200});
  };
  process.env.NEXT_PUBLIC_FORTHREE_MODE = "web";
  const client = require(path.join(out, "study-fetch.js"));
  await Promise.all([
    client.studyFetch("/api/reading-log/2", {method: "POST", body: JSON.stringify({a: "note"})}),
    client.studyFetch("/api/reading-log/2", {method: "POST", body: JSON.stringify({b: "tick"})}),
  ]);
  assert.deepEqual(client.readRecord(), {a: "note", b: "tick"}, "two overlapping calls both keep their change");
  console.log("  ok  two overlapping calls from one screen both keep their change");
}

// The other half of the same hole: whatever the server does, a reply that
// carries no record — or an empty one — must never overwrite what this
// browser is holding.
{
  const kept = new Map([["forthree.record.v1", JSON.stringify({"plan.json": "{\"version\":1}"})]]);
  globalThis.localStorage = {getItem: key => kept.get(key) ?? null, setItem: (key, value) => kept.set(key, value)};
  const {readFile, mkdir} = await import("node:fs/promises");
  const out = path.join(temporary, "client2");
  await mkdir(out, {recursive: true});
  for (const [from, to] of [["src/lib/mode.ts", "mode.js"], ["src/lib/study-fetch.ts", "study-fetch.js"]]) {
    const code = ts.transpileModule(await readFile(from, "utf8"), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;
    await writeFile(path.join(out, to), code.replace('"@/lib/mode"', '"./mode.js"'));
  }
  const client = require(path.join(out, "study-fetch.js"));
  const before = client.readRecord();
  for (const reply of [{error: "origin_rejected", message: "no"}, {error: "store_error", record: {}}]) {
    globalThis.fetch = async () => new Response(JSON.stringify(reply), {status: 403});
    const response = await client.studyFetch("/api/part/s01-lab-a/attempt/1");
    assert.equal(response.status, 403, "the refusal reaches the caller");
    assert.deepEqual(client.readRecord(), before, "and the kept record is untouched");
  }
  console.log("  ok  a refused reply never overwrites the record this browser holds");

  // Storage full: the call reached the server, but nothing of it survives
  // here, and saying "saved" would have the visitor work into a void.
  globalThis.localStorage = {getItem: () => null, setItem: () => { throw new Error("QuotaExceededError"); }};
  globalThis.fetch = async () => new Response(JSON.stringify({data: {}, record: {"plan.json": "{}"}}), {status: 200});
  const full = await client.studyFetch("/api/part/s01-lab-a/attempt/1", {method: "POST", body: "{}"});
  assert.equal(full.status, 507, "a record this browser cannot keep is not a success");
  assert.match((await full.json()).message, /can no longer save/, "and it says so");
  console.log("  ok  a browser that cannot keep the record says so instead of reporting success");
}

// "Load a record" takes a file from anywhere, and some of what a record holds
// is rendered as markup. The authored markup has to survive; nothing else may.
{
  const {readFile} = await import("node:fs/promises");
  const source = (await readFile("src/components/html.tsx", "utf8"))
    .replace(/export function Html[\s\S]*?\n}\n/, "")
    .replace(/export function HtmlFromRecord[\s\S]*?\n}\n/, "");
  const js = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;
  const box = {exports: {}};
  new Function("exports", "module", js)(box.exports, box);
  const {sanitize} = box.exports;
  // What the curriculum actually writes has to survive.
  for (const [given, want] of [
    ['<span class="mo">python3</span>', '<span class="mo">python3</span>'],
    ["<b>3.12.16</b> and <code>which</code>", "<b>3.12.16</b> and <code>which</code>"],
    ['<SPAN CLASS="mo">u</SPAN>', '<span class="mo">u</span>'],
  ]) assert.equal(sanitize(given), want, `sanitize(${given})`);

  // And nothing else may. The five below are the ones that defeated the first
  // version of this function: it decided where an attribute ended by counting
  // quotes, while the parser decides at the `=` before them, so a quote in
  // attribute-name position made it miss the tag and pass it through whole.
  // Two of them fired a live handler in Chrome (architecture review,
  // 2026-11-13). The rule now is the output, not a list of shapes: after
  // sanitize, the only tags left are the eight that are allowed.
  const KEEP = /^(\/?)(span|b|i|em|strong|code|pre|br)( class="[A-Za-z0-9 _-]*")?$/;
  for (const given of [
    '<img src=x " onerror=alert(4)>',
    '<svg x" onload=alert(5)>',
    '<img x" y onerror=alert(1)>',
    '<img " onerror=alert(3)>',
    "<img x' y onerror=alert(2)>",
    '<img src=x onerror="alert(1)">gone',
    '<span onmouseover="alert(1)">hi</span>',
    '<span class="mo" onclick="x()">c</span>',
    "<script>alert(1)</script>",
    '<a href="https://evil">x</a>',
    '<img src="x" alt=">" onerror="alert(1)">',
    '<iframe srcdoc="<img src=x onerror=alert(9)>">',
    "a < b and 2 > 1",
  ]) {
    const out = sanitize(given);
    for (const [, tag] of out.matchAll(/<([^>]*)>/g)) {
      assert.ok(KEEP.test(tag), `sanitize(${given}) left <${tag}>`);
    }
    // Not "no `onerror` anywhere": escaped text may say the word. What must
    // not survive is a `<` the parser can still act on, so take the allowed
    // tags out and there must be none left.
    const rest = out.replace(/<\/?(?:span|b|i|em|strong|code|pre|br)(?: class="[A-Za-z0-9 _-]*")?>/g, "");
    assert.equal(rest.includes("<"), false, `sanitize(${given}) left a tag the parser can act on: ${out}`);
  }
  console.log("  ok  a loaded record keeps the authored markup and no other tag at all");
}

console.log("The web trial answers over one stateless door.");
