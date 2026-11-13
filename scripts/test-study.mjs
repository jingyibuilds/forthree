import assert from "node:assert/strict";
import {mkdtemp, readFile, writeFile, readdir, mkdir, rm} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {spawn, spawnSync} from "node:child_process";
import {createRequire} from "node:module";

// Compile the server library into an isolated temporary folder: these tests
// never read or modify the learner's real study/ record.
const temporary = await mkdtemp(path.join(os.tmpdir(), "forthree-study-test-"));
const compiled = path.join(temporary, "compiled");
const result = spawnSync(process.execPath, ["node_modules/typescript/bin/tsc",
  "--target", "ES2020", "--module", "commonjs", "--moduleResolution", "node",
  "--esModuleInterop", "--strict", "--skipLibCheck", "--outDir", compiled,
  "src/lib/study/service.ts", "src/lib/study/http.ts"], {encoding: "utf8"});
assert.equal(result.status, 0, result.stdout + result.stderr);
const require = createRequire(import.meta.url);
const Module = require("node:module");
const originalLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === "server-only") return {};
  if (id === "@/lib/study/service") return require(path.join(compiled, "service.js"));
  if (id === "@/lib/study/types") return require(path.join(compiled, "types.js"));
  // The routes are addresses; their rules are one table in @/lib/study/http.
  if (id === "@/lib/study/http") return require(path.join(compiled, "http.js"));
  return originalLoad.call(this, id, ...args);
};
const service = require(path.join(compiled, "service.js"));
const store = require(path.join(compiled, "store.js"));
const content = require(path.join(compiled, "content.js"));
const id = "s01-lab-a";
// Session 1's receipts are real runs (curriculum/receipts/s01-lab-a.json).
const s01Receipts = JSON.parse(await readFile("curriculum/receipts/s01-lab-a.json", "utf8")).receipts;
const raw = s01Receipts.find(entry => entry.name.startsWith("stopped before")).raw;
const swapped = s01Receipts.find(entry => entry.name.startsWith("environment switched on")).raw;
const native = s01Receipts.find(entry => entry.name.includes("3.15")).raw;
const root = path.join(temporary, "records");
process.env.FORTHREE_STUDY_ROOT = root;
const mutate = (action, body, n = 1) => service.mutateAttempt(id, n, action.split("/"), body);
const fails = async (fn, code) => assert.rejects(fn, error => error.code === code);

// She looks at anything and works in order, so a test about a later part
// first has the earlier ones finished: `seedDone` writes them as finished
// records, and the walkers finish a part through the service the short way.
const STAMP = "2026-11-10T00:00:00.000Z";
const doneRecord = (part, sealed = true) => ({
  version: 1, part, session: Number(part.slice(1, 3)), block: "A1", attempt: 1,
  started_at: STAMP, step_entered_at: STAMP, step: "done", max_step: 1, task_predictions: [], finished_at: STAMP,
  // A finished lab has a locked guess; an interview's program opens on it.
  ...(sealed ? {prediction: {choice: 0, value: null, why: "", sealed_at: STAMP}} : {}),
});
async function seedDone(storeRoot, parts, plan = {}, unsealed = []) {
  await mkdir(path.join(storeRoot, "sessions"), {recursive: true});
  for (const part of parts) {
    await writeFile(path.join(storeRoot, "sessions", `${part}-1.json`), JSON.stringify(doneRecord(part, !unsealed.includes(part))));
  }
  await writeFile(path.join(storeRoot, "plan.json"), JSON.stringify({
    version: 1, current_session: 1, current_attempt: Object.fromEntries(parts.map(part => [part, 1])),
    next_checkpoint: 9, pull_checkpoint_forward: false, ...plan,
  }));
}
async function missCheck(part, n = 1) {
  await service.getAttempt(part, n);
  for (const k of [0, 1, 2]) await service.mutateAttempt(part, n, ["item", String(k), "seal"], {text: "deliberately wrong"});
  await service.mutateAttempt(part, n, ["step"], {step: "compare"});
  if ((await service.getAttempt(part, n)).part.steps.includes("resurface")) await service.mutateAttempt(part, n, ["step"], {step: "resurface"});
  await service.mutateAttempt(part, n, ["step"], {step: "done"});
}
async function talkThrough(part, n = 1) {
  await service.getAttempt(part, n);
  await service.mutateAttempt(part, n, ["answers"], {q1: "a".repeat(20), q2: "b".repeat(20), q3: "c".repeat(20)});
  await service.mutateAttempt(part, n, ["step"], {step: "done"});
}

const overview = await service.getStudyOverview();
assert.equal(overview.completed, false);
assert.equal(overview.session.session, 1);
// Session 1 is the one session whose no-help check is offered last: its bank
// holds nothing from an earlier session (§4).
assert.equal(overview.session.check_first, false);
assert.equal(overview.parts.at(-1).kind, "withdraw");
assert.deepEqual(overview.wires, []);
const base = await service.getAttempt(id, 1);
assert.equal(base.part.predict.correct, undefined);
assert.equal(base.part.predict.because, undefined, "what each option means is part of the answer");
for (const field of ["compare", "acceptance_checks", "concepts", "labels", "receipt_hint"]) assert.equal(base.part[field], undefined, field);
assert.equal(base.part.setup_command, undefined);
assert.equal(base.part.activate_command, undefined);
assert.equal(base.part.provenance.measured, undefined);
assert(base.part.tasks.every(task => task.passes_when === undefined));
assert.equal(base.part.minutes, undefined);
assert(base.part.tasks.every(task => task.minutes === undefined));
assert.deepEqual(base.part.steps, ["predict", "attempt", "compare", "done"]);
assert.deepEqual(base.part.step_labels, ["Guess", "Write it", "Compare"]);
// §8's locks are derived from state the client cannot choose: the part is
// required, and omitting it no longer falls back to a permissive default.
// `/curriculum` and `/board` hold no prediction open, so a part-less plain
// question is allowed there (§17.1) — but only a plain one.
await service.assertAssistantAllowed({feature: "followup"});
await fails(() => service.assertAssistantAllowed({feature: "annotate"}), "ai_not_allowed");
await fails(() => service.assertAssistantAllowed({part: id, feature: "followup"}), "not_sealed");
await fails(() => service.assertAssistantAllowed({part: id, feature: "nonsense"}), "invalid_body");
await fails(() => service.getBeyondPrediction(id, 1), "not_sealed");
await fails(() => service.getAttempt(id, 3), "not_found");
await fails(() => mutate("seal", {choice: 9}), "invalid_body");
await mutate("seal", {choice: 0, why: "A new folder might find a newer tool."});
await fails(() => mutate("seal", {choice: 1}), "already_sealed");
assert.equal((await service.getAttempt(id, 1)).record.predict_result.correct, false);
let gated = (await service.getBeyondPrediction(id, 1)).part;
// The gloss is behind the prediction gate, which is this route, and no later:
// the attempt step is where she is stuck and it is the only explanation there.
assert(gated.concepts.length >= 1, "the gloss is served once the prediction is in");
assert.equal(gated.setup_command, "bash '" + path.join(process.cwd(), "scripts/setup-python.sh") + "'");
assert.equal(gated.activate_command, "source '" + path.join(process.cwd(), ".venv/bin/activate") + "'");
// A second gate on the measured truth: session 1's `compare.mine` is itself a
// complete passing receipt for that lab's only acceptance check.
assert.equal(gated.compare, undefined, "compare is withheld until the receipt is accepted");
// A checkout name must survive shell quoting exactly, without shell evaluation.
// The UI receives raw text and must render it as escaped code, not authored HTML.
const unusualRoot = "/tmp/course space/'<tag>&$(unexpected)`command`";
const commands = content.environmentCommands(unusualRoot);
const shellProbe = spawnSync("bash", ["-c", "set -- " + commands.setup_command + '; printf "%s" "$2"'], {encoding: "utf8"});
assert.equal(shellProbe.status, 0);
assert.equal(shellProbe.stdout, path.join(unusualRoot, "scripts/setup-python.sh"));
// Her lab environment is made from the course's Python and given its pinned
// packages; both paths survive the same quoting.
const venvProbe = spawnSync("bash", ["-c", "set -- " + commands.venv_command + '; printf "%s|%s|%s" "$1" "$2" "$3"'], {encoding: "utf8"});
assert.equal(venvProbe.stdout, path.join(unusualRoot, ".venv/bin/python3") + "|-m|venv");
const packagesProbe = spawnSync("bash", ["-c", "set -- " + commands.packages_command + '; printf "%s" "$6"'], {encoding: "utf8"});
assert.equal(packagesProbe.stdout, path.join(unusualRoot, "requirements-course.txt"));
assert.equal(gated.predict.correct, undefined);
assert.equal(gated.tasks[2].passes_when, undefined);
await mutate("step", {step: "attempt"});
await service.assertAssistantAllowed({part: id, feature: "followup"});
await fails(() => mutate("step", {step: "compare"}), "receipt_not_accepted");
await fails(() => mutate("receipt", {raw}), "task_not_marked");
await fails(() => mutate("task/2", {did_pass: true}), "task_not_predicted");
const predicted = await mutate("task/2", {will_pass: false});
assert(predicted.passes_when);
await fails(() => mutate("task/2", {will_pass: true}), "already_predicted");
await mutate("task/2", {did_pass: true});
await mutate("task/0", {did_pass: false});
await mutate("receipt", {raw: gated.receipt_hint});
assert.equal((await service.getAttempt(id, 1)).record.step, "attempt");
assert.equal((await service.getAttempt(id, 1)).record.checks[0].pass, false);
await mutate("receipt", {raw: swapped});
assert.equal((await service.getAttempt(id, 1)).record.checks[0].pass, false);
await mutate("receipt", {raw: native});
assert.equal((await service.getAttempt(id, 1)).record.checks[0].pass, true);
const explained = (await service.getBeyondPrediction(id, 1)).part;
assert(explained.compare.note.length > 0, "and served once it is");
// One explanation, no reference panes: nothing that is not hers sits beside her run (REBUILD.md, R2).
assert.equal(explained.compare.mine, undefined);
assert.equal(explained.reveal.answer, explained.predict.options[1]);
const receiptBefore = await readFile(path.join(root, `receipts/${id}-1.json`), "utf8");
await fails(() => mutate("receipt", {raw}), "already_passed");
await fails(() => mutate("task/0", {did_pass: true}), "already_passed");
assert.equal(await readFile(path.join(root, `receipts/${id}-1.json`), "utf8"), receiptBefore);
await mutate("step", {step: "compare"});
// No step asks her why she missed (REBUILD.md, R2): the label route is gone.
await fails(() => mutate("label", {label: 1}), "not_found");
// This run failed two receipts before it passed, so the ledger holds an open
// miss — but a part never resurfaces its own misses two steps after the screen
// that explained them, so session 1's lab stays four steps, as the demo stages
// it. A later part of the same session is where that miss comes back.
const afterRecord = await service.getAttempt(id, 1);
assert.deepEqual(afterRecord.part.steps, ["predict", "attempt", "compare", "done"]);
await mutate("step", {step: "done"});
// Her guess is filed when the part ends, and comes back later if she missed it.
assert((await store.readJsonl("ledger.jsonl")).some(row => row.check_id === `${id}-prediction` && row.cleared === false && row.mental_model === null));
// Three parts, so finishing the lab alone must not advance the session.
assert.equal((await service.getStudyOverview()).plan.current_session, 1);
await mutate("step", {step: "predict"});
await mutate("step", {step: "compare"});
assert.equal((await service.getAttempt(id, 1)).record.prediction.choice, 0);
assert.equal((await service.getStudyOverview()).plan.current_session, 1);
assert(!(await readdir(root)).includes("board.json"), "Session 1 must not move a skill");

// ---- the interview: no prediction, no comparison, no skill moved ----
const interviewId = "s01-interview-a";
const interview = await service.getAttempt(interviewId, 1);
assert.deepEqual(interview.part.steps, ["attempt", "done"]);
assert.equal(interview.part.questions.length, 3);
assert(interview.part.target_text.includes("check_setup.py"), "the program itself is served");
assert(interview.part.target_note.includes("import sys"), "with its note beside it");
// What each question was getting at is feedback, not an answer key: it is
// served only once her own answers are in.
assert.equal(interview.part.looks_for, undefined, "withheld before she writes");
await service.mutateAttempt(interviewId, 1, ["answers"], {q1: "a", q2: "b", q3: "c"});
assert.equal((await service.getAttempt(interviewId, 1)).part.looks_for, undefined, "one character in each box is not an answer");
await service.mutateAttempt(interviewId, 1, ["answers"], {q1: "a".repeat(20), q2: "b".repeat(20), q3: "c"});
assert.equal((await service.getAttempt(interviewId, 1)).part.looks_for, undefined, "two real answers are not three");
await service.mutateAttempt(interviewId, 1, ["answers"], {q1: "a".repeat(20), q2: "b".repeat(20), q3: "c".repeat(20)});
assert.equal((await service.getAttempt(interviewId, 1)).part.looks_for.length, 3, "and served after three real answers");
await fails(() => service.mutateAttempt(interviewId, 1, ["answers"], {q4: "x"}), "invalid_body");
// An interview answers only its own feature; a general question box there is
// indistinguishable from the three questions it asks.
await fails(() => service.assertAssistantAllowed({part: interviewId, feature: "followup"}), "ai_not_allowed");
await service.assertAssistantAllowed({part: interviewId, feature: "interview"});
await fails(() => service.assertAssistantAllowed({part: id, feature: "interview"}), "ai_not_allowed");
await service.mutateAttempt(interviewId, 1, ["step"], {step: "done"});
assert((await store.readJsonl(`notes/${interviewId}.jsonl`)).length >= 1);
assert.equal((await service.getStudyOverview()).plan.current_session, 1);

// ---- the no-help check: the gate is every drawn item, not a prediction ----
const checkId = "s01-withdraw-a";
const drawn = await service.getAttempt(checkId, 1);
assert.equal(drawn.record.drawn.length, 3);
assert.equal(new Set(drawn.record.drawn).size, 3, "no item is drawn twice");
assert.equal(drawn.part.predict, undefined, "a no-help check has no prediction of its own");
// The lab left an open miss in another part, so this check carries the fifth
// step: that is where a current-session miss legitimately comes back.
assert.deepEqual(drawn.part.steps, ["attempt", "compare", "resurface", "done"]);
assert.deepEqual(drawn.part.step_labels, ["Answer them", "Compare", "From before"]);
assert.equal(drawn.part.ai_allowed, false);
await fails(() => service.getBeyondPrediction(checkId, 1), "not_sealed");
await fails(() => service.assertAssistantAllowed({part: checkId, feature: "followup"}), "check_open");
const firstItem = await service.getItem(checkId, 1, 0);
assert(firstItem.prompt.length > 0);
for (const field of ["accept_sha256", "accept", "explain"]) {
  assert.equal(firstItem[field], undefined, `${field} is the grading key and may not reach the browser`);
}
await fails(() => service.getItem(checkId, 1, 3), "not_found");
// Lock one, in the direction HANDOVER §11's own recipe never tested: with the
// no-help check open, naming a different, passed, AI-allowed part is refused.
// The session-wide lock has its own code, so the screen can say which rule
// it is rather than "off for this part" on a screen that is not a part.
await fails(() => service.assertAssistantAllowed({part: checkId, feature: "followup"}), "check_open");
await fails(() => service.assertAssistantAllowed({part: id, feature: "followup"}), "check_open");
await fails(() => service.assertAssistantAllowed({feature: "followup"}), "check_open");
await service.mutateAttempt(checkId, 1, ["item", "0", "seal"], {text: "deliberately wrong"});
await fails(() => service.mutateAttempt(checkId, 1, ["item", "0", "seal"], {text: "again"}), "already_sealed");
// The row is written at the item's seal, not at `record`: a part abandoned
// here must never leave the item re-servable (§17.4).
const recallAfterOne = JSON.parse(await readFile(path.join(root, "recall.json"), "utf8"));
assert.equal(Object.keys(recallAfterOne.items).length, 1);
assert.equal(Object.values(recallAfterOne.items)[0].last_result, "fail");
await fails(() => service.getBeyondPrediction(checkId, 1), "not_sealed");
await service.mutateAttempt(checkId, 1, ["item", "1", "seal"], {text: "also wrong"});
await service.mutateAttempt(checkId, 1, ["item", "2", "seal"], {text: "wrong again"});
const checkCompare = await service.getBeyondPrediction(checkId, 1);
assert.equal(checkCompare.items.length, 3);
assert(checkCompare.items.every(entry => entry.pass === false));
assert(checkCompare.items.every(entry => entry.explain.length > 0), "a failed item still teaches its fact");
await service.mutateAttempt(checkId, 1, ["step"], {step: "compare"});
await service.mutateAttempt(checkId, 1, ["step"], {step: "resurface"});
const checkResurface = await service.getAttempt(checkId, 1);
assert(checkResurface.resurface.length >= 1, "the step is skipped, never shown empty");
assert(checkResurface.resurface.some(entry => entry.pool === "A" && entry.part === id));
assert(!checkResurface.resurface.some(entry => (drawn.record.drawn ?? []).includes(entry.id)),
  "an item this very attempt drew may not come back inside it");
// What `From before` shows is fixed the first time it is shown, and
// `resurfaced` with it — not recomputed later from pools her answers changed.
const shownIds = checkResurface.resurface.map(entry => entry.id);
assert.deepEqual(checkResurface.record.resurfaced, shownIds);
// The lab's guess was wrong, so its question is back because it caught her —
// not because a paste was sent back.
assert.equal(checkResurface.resurface.find(entry => entry.part === id).cause, "missed");
// §17.5's pool-A clear: the pool is sent with the answer, because every drawn
// item has a row in BOTH recall.json and the ledger and guessing routed every
// cold-check miss to the wrong branch. The answer names the attempt that
// asked, because that is where it is stored.
const poolA = checkResurface.resurface[0];
assert(["recall", "choice"].includes(poolA.kind));
assert.equal(poolA.answered, undefined);
const from = {part: checkId, attempt: 1};
await fails(() => service.postResurface(poolA.id, {pool: "A", choice: 1}), "invalid_body");
// The pool travels with the answer and has to be the pool it was shown in.
await fails(() => service.postResurface(poolA.id, {pool: "B", choice: 1, text: "x", ...from}), "not_found");
const reply = poolA.kind === "choice" ? {choice: 1} : {text: "deliberately wrong again"};
const clearedRow = await service.postResurface(poolA.id, {pool: "A", ...reply, ...from});
assert.equal(clearedRow.pool, "A");
assert.equal(typeof clearedRow.cleared, "boolean");
assert.equal(clearedRow.cleared, poolA.kind === "choice");
const answeredView = await service.getAttempt(checkId, 1);
assert.deepEqual(answeredView.resurface.map(entry => entry.id), shownIds, "her answer does not change the list she is looking at");
assert.equal(answeredView.resurface[0].answered.pass, clearedRow.cleared);
await fails(() => service.postResurface(poolA.id, {pool: "A", ...reply, ...from}), "already_recorded");
// Leaving the step and coming back does not choose again: her answer has
// changed the pools by now, and the list is still the one she was shown.
await service.mutateAttempt(checkId, 1, ["step"], {step: "compare"});
await service.mutateAttempt(checkId, 1, ["step"], {step: "resurface"});
assert.deepEqual((await service.getAttempt(checkId, 1)).resurface.map(entry => entry.id), shownIds);
await fails(() => service.postResurface(poolA.id, {cleared: true}), "invalid_body");
assert(!checkResurface.resurface.some(entry => entry.prompt === undefined || entry.prompt === entry.id),
  "a resurfaced item is never rendered as its id");
// Every open row the lab filed resolves to that one question, so one right
// answer clears them all and the question is not asked once per row.
if (poolA.kind === "choice") {
  assert(!(await require(path.join(compiled, "resurface.js")).openLedger()).some(row => row.part === id && !row.cleared),
    "one answer settles every row that resolves to the same question");
}
await service.mutateAttempt(checkId, 1, ["step"], {step: "done"});
// Going back over the finished part shows what it showed and what she
// answered, and takes no new answer.
await service.mutateAttempt(checkId, 1, ["step"], {step: "resurface"});
const reread = await service.getAttempt(checkId, 1);
assert.deepEqual(reread.resurface.map(entry => entry.id), shownIds);
assert.equal(reread.resurface[0].answered.pass, clearedRow.cleared);
await service.mutateAttempt(checkId, 1, ["step"], {step: "done"});
// Every part of session 1 has finishedawait service.mutateAttempt(checkId, 1, ["step"], {step: "done"});
// Every part of session 1 has finished, so Today moves on — and nothing moved
// on the board, because A1's gates are both session 9.
assert.equal((await service.getStudyOverview()).plan.current_session, 2);
assert(!(await readdir(root)).includes("board.json"), "no skill may move before session 9");

// ---- session 2: the check is offered first, and the teardown is a read ----
const second = await service.getStudyOverview();
assert.equal(second.session.session, 2);
assert.equal(second.session.check_first, true, "from session 2 the no-help check gates the session");
assert.equal(second.parts[0].kind, "withdraw");
assert.equal(second.parts.length, 4);
// The order is the design's: a part opens once the ones before it are done.
assert.deepEqual(second.parts.map(entry => entry.open), [true, false, false, false]);
await fails(() => service.getAttempt("s02-lab-a", 1), "not_open_yet");
await missCheck("s02-withdraw-a");

// ---- session 2's lab: a different grader, and a variant at compare ----
const labTwo = "s02-lab-a";
const two = await service.getAttempt(labTwo, 1);
assert.equal(two.part.predict.correct, undefined);
assert.equal(two.part.compare, undefined);
assert.deepEqual(two.part.steps.slice(0, 3), ["predict", "attempt", "compare"]);
await service.mutateAttempt(labTwo, 1, ["seal"], {choice: 1, why: "the body runs once per row"});
assert.equal((await service.getAttempt(labTwo, 1)).record.predict_result.correct, true);
const twoGated = await service.getBeyondPrediction(labTwo, 1);
assert(twoGated.variant, "every lab after session 1 declares a re-attempt variant");
assert.equal(twoGated.variant.options.length >= 3, true);
assert.equal(twoGated.variant.correct, undefined, "the variant's key stays on the server");
assert.equal(twoGated.part.reveal, undefined, "her guess is explained with her run, not before it");
assert.equal(twoGated.part.predict.because, undefined);
await service.mutateAttempt(labTwo, 1, ["step"], {step: "attempt"});
await service.mutateAttempt(labTwo, 1, ["task", "1", "will_pass"] && ["task", "1"], {will_pass: true});
await service.mutateAttempt(labTwo, 1, ["task", "1"], {did_pass: true});
const twoRejected = await service.mutateAttempt(labTwo, 1, ["receipt"], {raw: twoGated.part.receipt_hint});
assert(twoRejected.record.checks.some(entry => entry.pass === false), "the placeholder is not a passing receipt");
const twoReceipt = "$ python3 rows.py\nAna\nBo\nCy\nDi\nEve\nFei\ncount 3 83\nCy 61";
const twoAccepted = await service.mutateAttempt(labTwo, 1, ["receipt"], {raw: twoReceipt});
assert(twoAccepted.record.checks.every(entry => entry.pass), JSON.stringify(twoAccepted.record.checks));
// Once her run is accepted, her own pick is set beside the answer, with what
// that pick expects. It names her choice, not a verdict.
const twoReveal = (await service.getBeyondPrediction(labTwo, 1)).part.reveal;
assert.equal(twoReveal.right, true);
assert.equal(twoReveal.picked, twoReveal.answer);
assert(twoReveal.because.length > 20);
// The pass wording shown is today's, not the wording saved when it was graded.
const twoOpen = (await service.getBeyondPrediction(labTwo, 1)).part;
assert(Object.values(twoOpen.pass_messages).every(text => typeof text === "string" && text.length > 0));
assert.equal(twoGated.part.pass_messages, undefined, "and not before her run is accepted");
await service.mutateAttempt(labTwo, 1, ["step"], {step: "compare"});
await fails(() => service.mutateAttempt(labTwo, 1, ["variant"], {choice: 99}), "invalid_body");
const variantResult = await service.mutateAttempt(labTwo, 1, ["variant"], {choice: 0});
assert.equal(typeof variantResult.pass, "boolean");
await fails(() => service.mutateAttempt(labTwo, 1, ["variant"], {choice: 1}), "already_sealed");
await fails(() => service.getAttempt("s02-teardown-a", 1), "not_open_yet");
if ((await service.getAttempt(labTwo, 1)).part.steps.includes("resurface")) await service.mutateAttempt(labTwo, 1, ["step"], {step: "resurface"});
await service.mutateAttempt(labTwo, 1, ["step"], {step: "done"});

// ---- session 2's teardown is a read ----
const teardownId = "s02-teardown-a";
const teardown = await service.getAttempt(teardownId, 1);
assert.deepEqual(teardown.part.steps, ["attempt", "done"]);
assert.deepEqual(teardown.part.teardown_fields, ["parts"], "all ten simple entries omit flow and tricky");
assert.equal(teardown.part.teardown_reveal.parts.length, 5);
assert.equal(teardown.part.teardown_reveal.flow, undefined);
assert(teardown.part.reading.length > 0, "a guided read names what to read");
// §17.1's `answers` row for a teardown, which no test walked.
await fails(() => service.mutateAttempt(teardownId, 1, ["answers"], {flow: "x"}), "invalid_body");
await service.mutateAttempt(teardownId, 1, ["answers"], {recall: {parts: "a web app and a database"}, picked: [0]});
assert.deepEqual((await service.getAttempt(teardownId, 1)).record.answers,
  {recall: {parts: "a web app and a database"}, picked: [0]});
await service.mutateAttempt(teardownId, 1, ["step"], {step: "done"});
// An exposure teardown has no `From before`, so it records none — recording
// items it never showed hid them from the parts that would have shown them.
assert.equal((await service.getAttempt(teardownId, 1)).record.resurfaced, undefined);

await talkThrough("s02-interview-a");
assert.equal((await service.getStudyOverview()).plan.current_session, 3);
await missCheck("s03-withdraw-a");

// ---- session 3's lab grades eight exception names and two silent outputs ----
const labThree = "s03-lab-a";
const three = await service.getAttempt(labThree, 1);
await service.mutateAttempt(labThree, 1, ["seal"], {choice: 2, why: "one is rebound, one is changed in place"});
const threeGated = await service.getBeyondPrediction(labThree, 1);
assert.equal(threeGated.part.activate_command.endsWith(".venv/bin/activate'"), true, "a lab that needs numpy prints this checkout's own activate command");
assert.equal(three.part.activate_command, undefined, "and not before the seal");
await service.mutateAttempt(labThree, 1, ["step"], {step: "attempt"});
await service.mutateAttempt(labThree, 1, ["task", "0"], {will_pass: true});
await service.mutateAttempt(labThree, 1, ["task", "0"], {did_pass: true});
const eight = ["NameError", "TypeError", "UnboundLocalError", "AttributeError", "KeyError", "IndexError", "ZeroDivisionError", "RecursionError"];
const threeReceipt = eight.map((name, index) => `$ python3 0${index + 1}_x.py\n${name}: measured`).join("\n")
  + "\n$ python3 09_money.py\n0.30000000000000004\n$ python3 10_overflow.py\n-2147483648";
const threeAccepted = await service.mutateAttempt(labThree, 1, ["receipt"], {raw: threeReceipt});
assert(threeAccepted.record.checks.every(entry => entry.pass), JSON.stringify(threeAccepted.record.checks));
// Swapping the two silent outputs under each other's commands must fail: which
// program printed which is the whole of that pair.
const swappedSilent = threeReceipt
  .replace("09_money.py\n0.30000000000000004", "09_money.py\n-2147483648")
  .replace("10_overflow.py\n-2147483648", "10_overflow.py\n0.30000000000000004");
const swapRun = await service.getAttempt(labThree, 2);
assert.equal(swapRun.record.prediction, undefined);
await service.mutateAttempt(labThree, 2, ["seal"], {choice: 0});
await service.mutateAttempt(labThree, 2, ["step"], {step: "attempt"});
await service.mutateAttempt(labThree, 2, ["task", "0"], {will_pass: true});
await service.mutateAttempt(labThree, 2, ["task", "0"], {did_pass: true});
const swapResult = await service.mutateAttempt(labThree, 2, ["receipt"], {raw: swappedSilent});
assert.equal(swapResult.record.checks.find(entry => entry.id === "two-that-do-not").pass, false);
const repeat = await service.getAttempt(id, 2);
assert.equal(repeat.record.prediction, undefined);
await fails(() => service.getBeyondPrediction(id, 2), "not_sealed");
assert((await store.readJsonl("timing.jsonl")).length >= 5);
// Rows carry no label since the rebuild; a missed guess is still a row.
assert((await store.readJsonl("ledger.jsonl")).some(row => row.check_id.endsWith("-prediction")));
const torn = '{"check_id":"unfinished';
await writeFile(path.join(root, "torn.jsonl"), '{"check_id":"complete"}\n' + torn);
assert.deepEqual(await store.readJsonl("torn.jsonl"), [{check_id: "complete"}]);
await fails(() => store.transaction(() => store.appendJsonl("torn.jsonl", {check_id: "new"})), "torn_record");
assert.equal(await readFile(path.join(root, "torn.jsonl"), "utf8"), '{"check_id":"complete"}\n' + torn);
const recovery = (await readdir(root)).find(name => name.startsWith("torn.jsonl.torn-"));
assert(recovery);
assert.equal(await readFile(path.join(root, recovery), "utf8"), torn);

// Independent OS processes race one seal, demonstrating that the exclusion
// works beyond a module-level promise or a single Next process.
const worker = `
  const Module = require('node:module'), old = Module._load;
  Module._load = function(id, ...args) { return id === 'server-only' ? {} : old.call(this, id, ...args); };
  require(${JSON.stringify(path.join(compiled, "service.js"))}).mutateAttempt('${id}', 2, ['seal'], {choice: 1})
    .then(() => console.log('sealed')).catch(error => console.log(error.code));
`;
function raceWorker() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["-e", worker], {env: {...process.env}});
    let output = "";
    child.stdout.on("data", data => output += data);
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve(output.trim()) : reject(new Error(`worker exit ${code}`)));
  });
}
assert.deepEqual((await Promise.all([raceWorker(), raceWorker()])).sort(), ["already_sealed", "sealed"]);

// An unreadable file is quarantined exactly once; a retry must never create
// a replacement and hide the only semester record.
await writeFile(path.join(root, `sessions/${id}-2.json`), '{"version":1,');
await fails(() => service.getAttempt(id, 2), "corrupt_record");
await fails(() => service.getAttempt(id, 2), "corrupt_record");
assert((await readdir(path.join(root, "sessions"))).some(name => name.startsWith(`${id}-2.json.corrupt-`)));
assert(!(await readdir(path.join(root, "sessions"))).includes(`${id}-2.json`));

// Unknown versions also fail closed, with the original file unchanged.
const unknownRoot = path.join(temporary, "unknown-version");
process.env.FORTHREE_STUDY_ROOT = unknownRoot;
await mkdir(unknownRoot);
await writeFile(path.join(unknownRoot, "plan.json"), '{"version":2}');
await fails(() => service.getStudyOverview(), "unsupported_version");
assert.equal(await readFile(path.join(unknownRoot, "plan.json"), "utf8"), '{"version":2}');

service.assertLocalRequest(new Request("http://localhost:3000/api/test", {headers: {origin: "http://localhost:3000"}}));
service.assertLocalRequest(new Request("http://localhost:3000/api/test", {headers: {host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000"}}));
assert.throws(() => service.assertLocalRequest(new Request("http://localhost:3000/api/test", {headers: {host: "127.0.0.1:3000", origin: "http://127.0.0.1:4000"}})), error => error.code === "origin_rejected");
assert.throws(() => service.assertLocalRequest(new Request("http://localhost:3000/api/test", {headers: {origin: "https://elsewhere.example"}})), error => error.code === "origin_rejected");
assert.throws(() => service.assertLocalRequest(new Request("http://localhost:3000/api/test", {headers: {origin: "null"}})), error => error.code === "origin_rejected");
assert.throws(() => service.assertLocalRequest(new Request("http://public.example/api/test")), error => error.code === "local_only");

// Walk the HTTP handler itself, including actual 409/422/404 responses and
// Next's localhost normalization when the browser connects to 127.0.0.1.
const ts = require("typescript");
async function routeModule(relative, filename) {
  const source = await readFile(relative, "utf8");
  const output = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;
  const target = path.join(temporary, filename);
  await writeFile(target, output);
  return require(target);
}
const route = await routeModule("src/app/api/part/[id]/attempt/[n]/[[...action]]/route.ts", "route.cjs");
const llm = await routeModule("src/app/api/llm/route.ts", "llm.cjs");
process.env.FORTHREE_STUDY_ROOT = path.join(temporary, "http-records");
const context = (action = [], n = "1") => ({params: Promise.resolve({id, n, action})});
const request = (action, body) => new Request(`http://localhost:3000/api/part/${id}/attempt/1/${action}`, {
  method: "POST", headers: {"content-type": "application/json", host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000"}, body: JSON.stringify(body),
});
async function post(action, body, status = 200) {
  const response = await route.POST(request(action, body), context(action.split("/")));
  const result = await response.json();
  assert.equal(response.status, status, JSON.stringify(result));
  return result;
}
let response = await route.GET(new Request(`http://localhost:3000/api/part/${id}/attempt/1`), context());
assert.equal(response.status, 200);
assert.equal(response.headers.get("cache-control"), "no-store");
const served = await response.json();
assert.equal(served.part.predict.correct, undefined);
response = await route.GET(new Request(`http://localhost:3000/api/part/${id}/attempt/1/beyond-predict`), context(["beyond-predict"]));
assert.equal(response.status, 409);
assert.equal((await response.json()).error, "not_sealed");
// Over HTTP: the part is required, and naming it before the seal is refused.
// The assistant answers at its own address; every route dispatches on the
// path it was asked for, so the attempt's URL is not a door into it.
const askRequest = body => new Request("http://localhost:3000/api/llm", {
  method: "POST", headers: {"content-type": "application/json", host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000"}, body: JSON.stringify(body),
});
assert.equal((await llm.POST(askRequest({feature: "followup", question: "what is a prompt?"}))).status, 200);
assert.equal((await llm.POST(askRequest({part: id, feature: "followup", question: "what is a prompt?"}))).status, 409);
// A path with no entry in the table is a 404, whichever address served it.
assert.equal((await route.POST(new Request("http://localhost:3000/api/nothing", {
  method: "POST", headers: {"content-type": "application/json", host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000"}, body: "{}",
}))).status, 404);
await post("seal", {choice: 100}, 422);
await post("seal", {choice: 1});
await post("seal", {choice: 0}, 409);
await post("not-a-route", {}, 404);
// The web trial's lab escape is not a door in her own copy: here the lab is
// the session, and it is finished by a receipt that graded (PUBLISH.md §6).
await post("skip-lab", {}, 404);
await post("step", {step: "attempt"});
assert.equal((await llm.POST(askRequest({part: id, feature: "followup", question: "what is a prompt?"}))).status, 200);
await post("task/0", {did_pass: true});
const rejected = await post("receipt", {raw: swapped});
assert.equal(rejected.record.checks[0].pass, false);
assert.equal(rejected.record.step, "attempt");
await post("step", {step: "compare"}, 409);
// The teacher (REBUILD.md R3/R4), on a fake provider so the suite never spends:
// refused before her run is accepted, then explains it once.
const annotateRequest = () => llm.POST(askRequest({part: id, attempt: 1, feature: "annotate"}));
const teacherOff = process.env.OPENROUTER_API_KEY;
delete process.env.OPENROUTER_API_KEY;
process.env.FORTHREE_LLM_FAKE = "1";
assert.equal((await annotateRequest()).status, 409, "no explanation before her run is accepted");
const accepted = await post("receipt", {raw: native});
assert.equal(accepted.record.checks[0].pass, true);
const explainedRun = await (await annotateRequest()).json();
assert(explainedRun.text, "the teacher explains her run once it is accepted");
const usageRows = async () => (await readFile(path.join(process.env.FORTHREE_STUDY_ROOT, "llm_usage.jsonl"), "utf8")).trim().split("\n").length;
assert.equal(await usageRows(), 1, "one call, one cost row");
assert.equal((await (await annotateRequest()).json()).text, explainedRun.text, "re-reading shows the same note");
assert.equal(await usageRows(), 1, "and costs nothing again");
// An attempt graded against checks the part no longer has gets no note: its
// paste answers an earlier version of the tasks.
const graded = path.join(process.env.FORTHREE_STUDY_ROOT, "sessions", `${id}-1.json`);
const kept = await readFile(graded, "utf8");
await writeFile(graded, JSON.stringify({...JSON.parse(kept), checks: [{id: "architectures", pass: true, message: "old"}]}));
await rm(path.join(process.env.FORTHREE_STUDY_ROOT, "llm_notes"), {recursive: true, force: true});
assert.equal((await (await annotateRequest()).json()).reason, "older_version");
await writeFile(graded, kept);
// Over the cap, and with no key, the page keeps its own answer and nothing breaks.
await writeFile(path.join(process.env.FORTHREE_STUDY_ROOT, "llm_usage.jsonl"), JSON.stringify({ts: new Date().toISOString(), feature: "annotate", cost_usd: 999}) + "\n", {flag: "a"});
assert.equal((await (await llm.POST(askRequest({part: id, attempt: 1, feature: "followup", question: "what is PATH?"}))).json()).reason, "over_cap");
delete process.env.FORTHREE_LLM_FAKE;
assert.equal((await (await llm.POST(askRequest({part: id, attempt: 1, feature: "followup", question: "what is PATH?"}))).json()).reason, "not_configured");
if (teacherOff !== undefined) process.env.OPENROUTER_API_KEY = teacherOff;
await post("step", {step: "compare"});
await post("step", {step: "done"});
await post("receipt", {raw: native}, 409);
assert(!(await readdir(process.env.FORTHREE_STUDY_ROOT)).includes("board.json"));

// §17.6's hard lock, from the other side: the only writer consults the gate and
// A1 names session 9 for both skills, so a completed session 1 moves nothing.
const board = require(path.join(compiled, "board.js"));
const moveAttempt = await board.evaluateBoard(1, async () => [{passed_at: "now", part: "s01-lab-a"}]);
assert.deepEqual(moveAttempt.moved, []);
assert(!(await readdir(process.env.FORTHREE_STUDY_ROOT)).includes("board.json"), "a non-gate session may not write the transcript");
assert.deepEqual((await board.readBoard()).A1, {judge: {state: "none", at_session: null}, build: {state: "none", at_session: null}});

// A wire fires off the sealed per-part estimates and timing.jsonl, and nothing
// else. Two labs over twice their own estimate is `lab-overrun`.
const wires = require(path.join(compiled, "wires.js"));
const wireRoot = path.join(temporary, "wire-records");
process.env.FORTHREE_STUDY_ROOT = wireRoot;
await mkdir(wireRoot, {recursive: true});
const curriculum = await content.loadBlocks();
const allSessions = curriculum.flatMap(block => block.sessions);
const checksDone = new Set([1, 2]);
assert.deepEqual(await wires.evaluateWires(allSessions, 3, checksDone), []);
// Two past sessions whose no-help check was never completed is its own wire.
assert.deepEqual((await wires.evaluateWires(allSessions, 3, new Set())).map(wire => wire.id), ["skipped-check"]);
await writeFile(path.join(wireRoot, "timing.jsonl"),
  '{"part":"s01-lab-a","step":"attempt","actual_min":400}\n{"part":"s02-lab-a","step":"attempt","actual_min":400}\n');
// The wires that read time are inert: timing.jsonl holds wall-clock time
// between entering a step and leaving it, and a lab left open overnight read
// as a twenty-hour attempt. They stay off until a sitting is measured.
assert.deepEqual(await wires.evaluateWires(allSessions, 3, checksDone), []);
// And the miss-list warning is off: it read "open misses by the session that
// filed them" as a trend. One open miss from each of three sessions is the
// record the old rule fired on.
await writeFile(path.join(wireRoot, "ledger.jsonl"), ["s01-lab-a", "s02-lab-a", "s03-lab-a"]
  .map(part => JSON.stringify({ts: "2026-11-10T00:00:00.000Z", part, block: "A1", check_id: `${part}-prediction`, mental_model: null, cleared: false}))
  .join("\n") + "\n");
assert.deepEqual(await wires.evaluateWires(allSessions, 3, checksDone), []);
const fired = await wires.evaluateWires(allSessions, 3, new Set());
// A wire states the measurement; a consequence is printed only where there is
// one she can act on, so an empty string is the normal case (§4.1).
assert(fired[0].says.length > 0);
assert(!/teardown|checkpoint|re-scope/i.test(JSON.stringify(Object.values(wires))), "wires print no internal name");

// §20 test 11, for the file the test actually names. A hand-truncated
// board.json must be quarantined and named, not crash the board.
const corruptRoot = path.join(temporary, "corrupt-board");
process.env.FORTHREE_STUDY_ROOT = corruptRoot;
await mkdir(corruptRoot, {recursive: true});
await writeFile(path.join(corruptRoot, "board.json"), '{"version": 1, "A1": {"judge"');
await fails(() => board.readBoard(), "corrupt_record");
assert((await readdir(corruptRoot)).some(name => name.startsWith("board.json.corrupt-")));
assert(!(await readdir(corruptRoot)).includes("board.json"), "no replacement is written over a file it could not read");

// ---- she looks at anything, and works in order (owner, 2026-11-10) ----
const freeRoot = path.join(temporary, "free-entry");
process.env.FORTHREE_STUDY_ROOT = freeRoot;
await mkdir(path.join(freeRoot, "sessions"), {recursive: true});
// Opening a session's card is a read: nothing is written, Today does not
// move, and a warning about the semester is not printed on another session.
const early = await service.getStudyOverview(3);
assert.equal(early.session.session, 3);
assert.deepEqual(early.viewing, {is_today: false, today: 1, done: false, again: false, earlier_open: [1, 2]});
assert.deepEqual(early.wires, []);
assert.equal((await service.getStudyOverview()).viewing.is_today, true);
assert.equal((await service.getToday(3)).environment, null, "the machine report is Today's");
await fails(() => service.getStudyOverview(9), "not_found");
// A session ahead can be looked at and not started. Nor can a later part of
// Today's own session: the lab comes first.
assert(early.parts.every(entry => !entry.open), "nothing in a session ahead is open to start");
await fails(() => service.getAttempt("s03-lab-a", 1), "not_open_yet");
assert.deepEqual((await service.getStudyOverview()).parts.map(entry => entry.open), [true, false, false]);
await fails(() => service.getAttempt("s01-interview-a", 1), "not_open_yet");
assert.deepEqual(await readdir(path.join(freeRoot, "sessions")), [], "looking, and a refused start, write nothing");
await fails(() => service.assertAssistantAllowed({part: "s03-lab-a", feature: "followup"}), "not_sealed");

// ---- going back into a finished session while Today is further on ----
const backRoot = path.join(temporary, "back");
process.env.FORTHREE_STUDY_ROOT = backRoot;
await seedDone(backRoot, ["s01-lab-a", "s01-interview-a", "s01-withdraw-a"], {current_session: 2});
assert((await service.getStudyOverview(1)).parts.every(entry => entry.open), "everything she has done stays open to her");
// Running a finished part again and finishing it moves nothing: Today is on
// session 2 and stays there.
await talkThrough("s01-interview-a", 2);
assert.equal((await service.getStudyOverview()).plan.current_session, 2, "finishing a session Today is not on moves nothing");
// A part of a session Today is not on is gated by its own prediction and by
// nothing else: the assistant does not ask which session the part belongs to.
await service.getAttempt("s01-lab-a", 2);
await fails(() => service.assertAssistantAllowed({part: "s01-lab-a", attempt: 2, feature: "followup"}), "not_sealed");
await service.mutateAttempt("s01-lab-a", 2, ["seal"], {choice: 0});
await service.assertAssistantAllowed({part: "s01-lab-a", attempt: 2, feature: "followup"});
// And a no-help check left open there quiets the assistant everywhere, and
// says which session it is in.
await service.getAttempt("s01-withdraw-a", 2);
await fails(() => service.assertAssistantAllowed({part: "s01-lab-a", attempt: 2, feature: "followup"}), "check_open");
await fails(() => service.assertAssistantAllowed({feature: "followup"}), "check_open");
assert.deepEqual(await service.assistantState(), {open: false, reason: "check_open", session: 1});
assert.deepEqual((await service.getAttempt("s01-lab-a", 2)).assistant, {open: false, reason: "check_open", session: 1});
assert.equal((await service.getAttempt("s01-lab-a", 2)).today_session, 2);
assert.equal((await service.getStudyOverview(1)).viewing.again, true);
// Nor does it move Today back: Today is on session 3, a second go at a part
// of session 2 is left open, and a part of session 1 is finished again.
const behindRoot = path.join(temporary, "rerun-behind");
process.env.FORTHREE_STUDY_ROOT = behindRoot;
await seedDone(behindRoot, ["s01-lab-a", "s01-interview-a", "s01-withdraw-a",
  "s02-lab-a", "s02-teardown-a", "s02-withdraw-a", "s02-interview-a"], {current_session: 3});
await service.getAttempt("s02-interview-a", 2);
await talkThrough("s01-interview-a", 2);
assert.equal((await service.getStudyOverview()).plan.current_session, 3, "Today never moves back");
// Out of order: session 2 is already finished when session 1's last part is.
// Today moves to the first session with something left, not onto a done one.
const orderRoot = path.join(temporary, "free-order");
process.env.FORTHREE_STUDY_ROOT = orderRoot;
await mkdir(path.join(orderRoot, "sessions"), {recursive: true});
const seeded = ["s01-lab-a", "s01-withdraw-a", "s02-withdraw-a", "s02-lab-a", "s02-teardown-a", "s02-interview-a"];
for (const part of seeded) {
  await writeFile(path.join(orderRoot, "sessions", `${part}-1.json`), JSON.stringify({
    version: 1, part, session: Number(part.slice(1, 3)), block: "A1", attempt: 1,
    started_at: "2026-11-10T00:00:00.000Z", step_entered_at: "2026-11-10T00:00:00.000Z",
    step: "done", max_step: 1, task_predictions: [], finished_at: "2026-11-10T00:00:00.000Z",
    // A finished lab has a locked guess; the interview's program opens on it.
    prediction: {choice: 0, value: null, why: "", sealed_at: "2026-11-10T00:00:00.000Z"},
  }));
}
await writeFile(path.join(orderRoot, "plan.json"), JSON.stringify({
  version: 1, current_session: 1, current_attempt: Object.fromEntries(seeded.map(part => [part, 1])),
  next_checkpoint: 9, pull_checkpoint_forward: false,
}));
const before = await service.getStudyOverview(2);
assert.equal(before.viewing.done, true);
// Only session 2 is done, however many sessions are written.
assert.deepEqual(before.sessions.filter(entry => entry.done).map(entry => entry.session), [2]);
await service.getAttempt("s01-interview-a", 1);
await service.mutateAttempt("s01-interview-a", 1, ["answers"], {q1: "a".repeat(20), q2: "b".repeat(20), q3: "c".repeat(20)});
await service.mutateAttempt("s01-interview-a", 1, ["step"], {step: "done"});
assert.equal((await service.getStudyOverview()).plan.current_session, 3, "Today skips the session she did early");
assert.deepEqual((await service.getStudyOverview(1)).viewing, {is_today: false, today: 3, done: true, again: false, earlier_open: []});

// ---- the no-help checks: what each one draws, and what an explanation gives away ----
const drawRoot = path.join(temporary, "draws");
process.env.FORTHREE_STUDY_ROOT = drawRoot;
await seedDone(drawRoot, ["s01-lab-a", "s01-interview-a"]);
await missCheck("s01-withdraw-a");
const firstDraw = (await service.getAttempt("s01-withdraw-a", 1)).record.drawn;
// Session 1 is done, so session 2's check is open — and nothing after it is.
assert.deepEqual((await service.getStudyOverview()).parts.map(entry => entry.open), [true, false, false, false]);
// Today is put one session further on by hand, so that the part being
// answered is not Today's: an answer counts for the session of the check
// that asked it.
const drawPlan = JSON.parse(await readFile(path.join(drawRoot, "plan.json"), "utf8"));
await service.getAttempt("s02-withdraw-a", 1);
await writeFile(path.join(drawRoot, "plan.json"), JSON.stringify({...JSON.parse(await readFile(path.join(drawRoot, "plan.json"), "utf8")), current_session: 3}));
assert.equal(drawPlan.current_session, 2);
const secondDraw = (await service.getAttempt("s02-withdraw-a", 1)).record.drawn;
for (const k of [0, 1, 2]) await service.mutateAttempt("s02-withdraw-a", 1, ["item", String(k), "seal"], {text: "deliberately wrong"});
const drawRecall = JSON.parse(await readFile(path.join(drawRoot, "recall.json"), "utf8"));
assert(secondDraw.every(item => drawRecall.items[item].last_seen_session === 2));
// A part she has opened is in progress, whether or not a step has been left:
// a check's answers all sit on its first step.
const midCheck = await service.getStudyOverview(2);
assert.equal(midCheck.parts.find(entry => entry.id === "s02-withdraw-a").started, true);
assert(midCheck.parts.find(entry => entry.id === "s02-withdraw-a").step_name, "the resume line names the step she is on");
assert.equal(midCheck.parts.find(entry => entry.id === "s02-lab-a").started, false);
// A later try draws only what no try of any check has drawn, answered or not.
const secondTry = (await service.getAttempt("s02-withdraw-a", 2)).record.drawn;
const thirdTry = (await service.getAttempt("s02-withdraw-a", 3)).record.drawn;
assert.equal(new Set([...firstDraw, ...secondDraw, ...secondTry, ...thirdTry]).size, 12, "no two tries of any check share a question");
// Session 2's check opens session 2, so everything it asks was taught in
// session 1, whose lab's guess is locked: every explanation is open
// (REBUILD.md R7). An explanation waits only for the lab of the session that
// teaches it — the away case below holds one back.
const early2 = await service.getBeyondPrediction("s02-withdraw-a", 1);
assert(early2.items.every(entry => entry.explain.length > 0 && entry.explain_after === undefined), "nothing session 2's check asks waits on session 2's lab");
await service.mutateAttempt("s02-withdraw-a", 1, ["step"], {step: "compare"});
if ((await service.getAttempt("s02-withdraw-a", 1)).part.steps.includes("resurface")) await service.mutateAttempt("s02-withdraw-a", 1, ["step"], {step: "resurface"});
await service.mutateAttempt("s02-withdraw-a", 1, ["step"], {step: "done"});
await service.getAttempt("s02-lab-a", 1);
await service.mutateAttempt("s02-lab-a", 1, ["seal"], {choice: 0});
assert((await service.getBeyondPrediction("s02-withdraw-a", 1)).items.every(entry => entry.explain.length > 0 && !entry.explain_after),
  "and it is served once that guess is locked");

// ---- a part of a session Today is not on, worked from start to finish ----
const awayRoot = path.join(temporary, "away");
process.env.FORTHREE_STUDY_ROOT = awayRoot;
// Session 1's lab is left without a locked guess here, so that its items'
// explanations are still withheld further down.
await seedDone(awayRoot, ["s01-lab-a", "s01-interview-a"], {}, ["s01-lab-a"]);
// Session 1's check, all three missed and logged, so three misses are open.
await service.getAttempt("s01-withdraw-a", 1);
for (const k of [0, 1, 2]) await service.mutateAttempt("s01-withdraw-a", 1, ["item", String(k), "seal"], {text: "deliberately wrong"});
// Session 1's lab here never had its guess locked, so what session 1 teaches
// is not explained yet, on the check's own results page either (REBUILD.md R7).
assert((await service.getBeyondPrediction("s01-withdraw-a", 1)).items.every(entry => entry.explain === "" && entry.explain_after === 1));
await service.mutateAttempt("s01-withdraw-a", 1, ["step"], {step: "compare"});
await service.mutateAttempt("s01-withdraw-a", 1, ["step"], {step: "done"});
// Session 2's check is written as finished, with no `From before` of its
// own, so that the lab's is the first to show these; and Today is put one
// session further on by hand, so the lab being worked is not Today's.
await writeFile(path.join(awayRoot, "sessions", "s02-withdraw-a-1.json"), JSON.stringify(doneRecord("s02-withdraw-a")));
const awayPlan = JSON.parse(await readFile(path.join(awayRoot, "plan.json"), "utf8"));
await writeFile(path.join(awayRoot, "plan.json"), JSON.stringify({
  ...awayPlan, current_session: 3, current_attempt: {...awayPlan.current_attempt, "s02-withdraw-a": 1},
}));
// One of them is recorded as passed, so pool B has something to re-ask.
const awayRecall = JSON.parse(await readFile(path.join(awayRoot, "recall.json"), "utf8"));
const hadRight = Object.keys(awayRecall.items)[0];
awayRecall.items[hadRight].last_result = "pass";
await writeFile(path.join(awayRoot, "recall.json"), JSON.stringify(awayRecall));
// Session 2's lab, walked to `From before`, while Today is elsewhere.
await service.getAttempt(labTwo, 1);
await service.mutateAttempt(labTwo, 1, ["seal"], {choice: 1});
// Sealed and still standing on step 1: Ask is on. "Off until your answer is
// locked" was shown there, on a screen that also said "Answer locked".
await service.assertAssistantAllowed({part: labTwo, feature: "followup"});
assert.equal((await service.getAttempt(labTwo, 1)).assistant.open, true);
await service.mutateAttempt(labTwo, 1, ["step"], {step: "attempt"});
await service.mutateAttempt(labTwo, 1, ["task", "1"], {will_pass: true});
await service.mutateAttempt(labTwo, 1, ["task", "1"], {did_pass: true});
await service.mutateAttempt(labTwo, 1, ["receipt"], {raw: twoReceipt});
await service.mutateAttempt(labTwo, 1, ["step"], {step: "compare"});
await service.mutateAttempt(labTwo, 1, ["variant"], {choice: 0});
await service.mutateAttempt(labTwo, 1, ["step"], {step: "resurface"});
const awayBefore = await service.getAttempt(labTwo, 1);
assert.equal(awayBefore.assistant.reason, "resurface");
const poolB = awayBefore.resurface.find(entry => entry.pool === "B");
assert.equal(poolB.id, hadRight, "the one she had right is re-asked first");
// The pool travels with the answer for a bank item too: an open miss
// answered as if it were a re-ask went to the wrong branch and cleared nothing.
const openMiss = awayBefore.resurface.find(entry => entry.pool === "A" && entry.kind === "recall");
assert(openMiss, "an open miss from the bank is on the list");
await fails(() => service.postResurface(openMiss.id, {pool: "B", text: "x", part: labTwo, attempt: 1}), "not_found");
assert.equal((await service.getAttempt(labTwo, 1)).resurface.find(entry => entry.id === openMiss.id).answered, undefined);
const rowsBefore = (await store.readJsonl("ledger.jsonl")).length;
const missedB = await service.postResurface(poolB.id, {pool: "B", text: "deliberately wrong", part: labTwo, attempt: 1});
assert.equal(missedB.pass, false);
// The item is session 1's, and session 1's lab has no locked guess on this
// record: its explanation is withheld in the answer, and in what the step
// then shows — and an unanswered entry carries no explanation at all.
assert.equal(missedB.explain, "");
assert.equal(missedB.explain_after, 1);
const afterB = (await service.getAttempt(labTwo, 1)).resurface;
assert.deepEqual([afterB.find(entry => entry.id === hadRight).answered.explain, afterB.find(entry => entry.id === hadRight).answered.explain_after], ["", 1]);
assert(afterB.filter(entry => entry.id !== hadRight).every(entry => entry.answered === undefined && entry.explain === undefined));
// The session an answer counts for is the part's, not Today's: with Today
// past the last written session this wrote a session that does not exist.
const awayAfter = JSON.parse(await readFile(path.join(awayRoot, "recall.json"), "utf8"));
assert.equal(awayAfter.items[hadRight].last_seen_session, 2);
assert.equal((await service.getStudyOverview()).plan.current_session, 3);
// One she had right and now misses is filed, or it sits in neither pool and
// never comes back.
const filed = (await store.readJsonl("ledger.jsonl")).slice(rowsBefore);
assert(filed.some(row => row.check_id === hadRight && row.cleared === false && row.part === labTwo));
// A damaged board.json costs the board, not the end of a part.
await writeFile(path.join(awayRoot, "board.json"), '{"version": 1, "A1": {"judge"');
await fails(() => board.readBoard(), "corrupt_record");
const timingBefore = (await store.readJsonl("timing.jsonl")).length;
const ended = await service.mutateAttempt(labTwo, 1, ["step"], {step: "done"});
assert(ended.record.finished_at && ended.summary, "the part finishes and its done screen is served");
assert.equal((await store.readJsonl("timing.jsonl")).length, timingBefore + 1);
assert.equal((await service.getStudyOverview()).board_damaged, true);
// Finishing a part of a session Today is not on moves nothing and warns of
// nothing there: a warning is about where she is in the semester.
assert.equal((await service.getStudyOverview()).plan.current_session, 3);
assert.deepEqual((await service.getStudyOverview(2)).wires, []);
// Going back over the finished lab: Ask is on at every step, the route agrees
// with the screen, and re-reading writes no timing row.
await service.mutateAttempt(labTwo, 1, ["step"], {step: "predict"});
assert.equal((await service.getAttempt(labTwo, 1)).assistant.open, true);
await service.assertAssistantAllowed({part: labTwo, attempt: 1, feature: "followup"});
assert.equal((await store.readJsonl("timing.jsonl")).length, timingBefore + 1, "re-reading a finished part is not timed");
// A finished attempt is read-only. Its record always says `done`, going back
// over it writes nothing, and nothing on it takes a new answer.
const finishedFile = path.join(awayRoot, "sessions", `${labTwo}-1.json`);
const finishedBefore = await readFile(finishedFile, "utf8");
assert.equal(JSON.parse(finishedBefore).step, "done");
assert.equal(JSON.parse(finishedBefore).came_back.find(entry => entry.id === hadRight).answered.pass, false, "her answer is stored on the attempt");
for (const step of ["resurface", "compare", "predict"]) await service.mutateAttempt(labTwo, 1, ["step"], {step});
assert.equal(await readFile(finishedFile, "utf8"), finishedBefore, "going back over a finished part writes nothing");
assert.equal((await service.getAttempt(labTwo, 1)).record.step, "done", "and it always opens on its done screen");
const leftOpen = JSON.parse(finishedBefore).came_back.find(entry => !entry.answered);
if (leftOpen) {
  await fails(() => service.postResurface(leftOpen.id, {pool: leftOpen.pool, text: "late", choice: 0, part: labTwo, attempt: 1}), "already_recorded");
}
await fails(() => service.mutateAttempt(labTwo, 1, ["receipt"], {raw: twoReceipt}), "already_finished");
await fails(() => service.mutateAttempt(labTwo, 1, ["label"], {label: 0}), "already_finished");
await fails(() => service.mutateAttempt(labTwo, 1, ["variant"], {choice: 1}), "already_finished");
await fails(() => service.mutateAttempt(labTwo, 1, ["seal"], {choice: 0}), "already_finished");
await fails(() => service.mutateAttempt(labTwo, 1, ["task", "0"], {did_pass: false}), "already_finished");
await fails(() => service.mutateAttempt("s01-withdraw-a", 1, ["item", "0", "seal"], {text: "late"}), "already_finished");
await fails(() => service.mutateAttempt(labTwo, 1, ["step"], {step: "no-such-step"}), "invalid_body");
// A record finished before `came_back` existed has ids and nothing else. It
// is shown from those ids and never rewritten: stepping back on one used to
// replace its list with an empty one.
const legacyFile = path.join(awayRoot, "sessions", "s01-withdraw-a-1.json");
const legacy = JSON.parse(await readFile(legacyFile, "utf8"));
delete legacy.came_back;
// One of the ids is a lab's question, not a bank item. The old record does
// not say which lab: the ledger row that filed it does, cleared since or not.
legacy.resurfaced = [hadRight, "s01-lab-a-prediction"];
await store.appendJsonl("ledger.jsonl", {ts: STAMP, part: "s01-lab-a", block: "A1", attempt: 1, check_id: "s01-lab-a-prediction",
  mental_model: "x", note: "", times_seen: 0, cleared: true});
legacy.step = "resurface";
await writeFile(legacyFile, JSON.stringify(legacy));
const legacyBefore = await readFile(legacyFile, "utf8");
const legacyView = await service.getAttempt("s01-withdraw-a", 1);
assert.equal(legacyView.record.step, "done");
assert.deepEqual(legacyView.resurface.map(entry => [entry.id, entry.legacy, entry.kind]),
  [[hadRight, true, "recall"], ["s01-lab-a-prediction", true, "choice"]]);
assert(legacyView.resurface[1].prompt && legacyView.resurface[1].options.length, "the lab's question is shown, found through the ledger");
assert(legacyView.summary, "a finished record's done screen is served whatever step it was left on");
assert(legacyView.part.steps.includes("resurface"), "the step it ran stays on its rail");
await service.mutateAttempt("s01-withdraw-a", 1, ["step"], {step: "resurface"});
assert.equal(await readFile(legacyFile, "utf8"), legacyBefore, "a finished record is never rewritten by reading it");
// A finished attempt holds no guess open, so Ask is on whatever step its
// record was left on, and the route agrees.
assert.equal(legacyView.assistant.reason !== "resurface", true);
for (const left of ["resurface", "predict"]) {
  await writeFile(finishedFile, JSON.stringify({...JSON.parse(finishedBefore), step: left}));
  assert.equal((await service.getAttempt(labTwo, 1)).assistant.open, true);
  await service.assertAssistantAllowed({part: labTwo, attempt: 1, feature: "followup"});
}
await writeFile(finishedFile, finishedBefore);

// ---- Today moves on only past sessions whose newest try is finished ----
const rerunRoot = path.join(temporary, "rerun-open");
process.env.FORTHREE_STUDY_ROOT = rerunRoot;
await mkdir(path.join(rerunRoot, "sessions"), {recursive: true});
for (const part of seeded) {
  await writeFile(path.join(rerunRoot, "sessions", `${part}-1.json`), JSON.stringify({
    version: 1, part, session: Number(part.slice(1, 3)), block: "A1", attempt: 1,
    started_at: "2026-11-10T00:00:00.000Z", step_entered_at: "2026-11-10T00:00:00.000Z",
    step: "done", max_step: 1, task_predictions: [], finished_at: "2026-11-10T00:00:00.000Z",
    // A finished lab has a locked guess; the interview's program opens on it.
    prediction: {choice: 0, value: null, why: "", sealed_at: "2026-11-10T00:00:00.000Z"},
  }));
}
// Session 2 was finished early and its teardown is being run again.
await writeFile(path.join(rerunRoot, "sessions", "s02-teardown-a-2.json"), JSON.stringify({
  version: 1, part: "s02-teardown-a", session: 2, block: "A1", attempt: 2,
  started_at: "2026-11-10T00:00:00.000Z", step_entered_at: "2026-11-10T00:00:00.000Z",
  step: "attempt", max_step: 0, task_predictions: [], finished_at: null,
}));
await writeFile(path.join(rerunRoot, "plan.json"), JSON.stringify({
  version: 1, current_session: 1,
  current_attempt: {...Object.fromEntries(seeded.map(part => [part, 1])), "s02-teardown-a": 2},
  next_checkpoint: 9, pull_checkpoint_forward: false,
}));
await service.getAttempt("s01-interview-a", 1);
await service.mutateAttempt("s01-interview-a", 1, ["answers"], {q1: "a".repeat(20), q2: "b".repeat(20), q3: "c".repeat(20)});
await service.mutateAttempt("s01-interview-a", 1, ["step"], {step: "done"});
assert.equal((await service.getStudyOverview()).plan.current_session, 2, "a session with a try still open is not skipped");
assert.equal((await service.getStudyOverview(2)).sessions[1].done, true, "though it stays done on the map");
assert.equal((await service.getStudyOverview(2)).viewing.again, true, "and its card says a part is being run again");
assert.equal((await service.getStudyOverview(1)).viewing.again, false);
// The repeat of `done` repairs an interrupted finish. On an older try of a
// part that is being run again it moves nothing, and it never rewrites the
// record it is sent to.
const olderTry = path.join(rerunRoot, "sessions", "s02-teardown-a-1.json");
const olderBefore = await readFile(olderTry, "utf8");
await service.mutateAttempt("s02-teardown-a", 1, ["step"], {step: "done"});
assert.equal((await service.getStudyOverview()).plan.current_session, 2, "an older try's done does not finish the session");
assert.equal(await readFile(olderTry, "utf8"), olderBefore);
// And it does repair: with the plan left one session behind, it catches up.
const stalePlan = JSON.parse(await readFile(path.join(rerunRoot, "plan.json"), "utf8"));
await writeFile(path.join(rerunRoot, "plan.json"), JSON.stringify({...stalePlan, current_session: 1}));
await service.mutateAttempt("s01-interview-a", 1, ["step"], {step: "done"});
assert.equal((await service.getStudyOverview()).plan.current_session, 2, "repeating done on the last finished part moves Today on");
// A finished part is not "in progress".
assert((await service.getStudyOverview(1)).parts.every(entry => entry.finished && !entry.started));

// ---- an answer typed with its prompt is the same answer ----
const grading = require(path.join(compiled, "grading.js"));
const {createHash} = require("node:crypto");
const accept = {accept_sha256: [createHash("sha256").update("python3 -m venv .venv").digest("hex")], normalise: "lower"};
assert.equal(grading.matchesAccept("$ python3 -m venv .venv", accept), true);
assert.equal(grading.matchesAccept("% Python3 -m venv .venv", accept), true);
assert.equal(grading.matchesAccept("python3 -m venv", accept), false);

// ---- the machine report says the same thing whichever python3 runs it ----
// On an Apple-silicon Mac an Intel python3 runs translated, and `uname -m`
// inside it answers x86_64. Checked only where that situation exists.
const sysctl = spawnSync("/usr/sbin/sysctl", ["-n", "hw.optional.arm64"], {encoding: "utf8"});
const whichAll = spawnSync("/usr/bin/which", ["-a", "python3"], {encoding: "utf8"});
if (sysctl.status === 0 && sysctl.stdout.trim() === "1") {
  for (const python of new Set((whichAll.stdout ?? "").split("\n").filter(Boolean))) {
    const report = spawnSync(python, ["scripts/doctor.py", "--json"], {encoding: "utf8"});
    if (report.status !== 0) continue;
    assert.equal(JSON.parse(report.stdout).facts.machine, "arm64", `${python} must not report its own architecture as the machine's`);
  }
}

// ---- a later try of a check, on a bank small enough to read ----
const sealedLib = require(path.join(compiled, "sealed.js"));
const item = (name, earliest) => ({id: name, kind: "recall", prompt: "", accept_sha256: [], normalise: "lower", explain: "", earliest_session: earliest});
const smallBank = [item("a", 1), item("b", 1), item("c", 1), item("d", 2), item("e", 2), item("f", 1), item("g", 2), item("h", 1), item("i", 1), item("j", 1)];
const slots = [{part: "c1", session: 1, want: 3, kind: "recall"}, {part: "c2", session: 2, want: 3, kind: "recall"}];
assert.deepEqual([...sealedLib.plannedDraws(smallBank, slots).entries()], [["c1", ["a", "b", "c"]], ["c2", ["d", "e", "f"]]]);
assert.deepEqual(sealedLib.drawItems(smallBank, slots[1], slots, new Set(), true), ["d", "e", "f"], "the later check opened first still takes its own");
// A later try never takes what another check has reserved, drawn or not, and
// never an item of a later session.
assert.deepEqual(sealedLib.drawItems(smallBank, slots[0], slots, new Set(["a", "b", "c"]), false), ["h", "i", "j"]);
// What any try has drawn is used, answered or not.
assert.deepEqual(sealedLib.drawItems(smallBank, slots[1], slots, new Set(["d", "e", "f", "h"]), false), ["g", "i", "j"]);
// Running out on a later try is an ordinary refusal; on a first try it is a
// build failure.
assert.throws(() => sealedLib.drawItems(smallBank, slots[1], slots, new Set(["d", "e", "f", "g", "h"]), false),
  error => error.code === "bank_short" && error.status === 409);
assert.throws(() => sealedLib.drawItems([item("a", 1)], slots[0], [slots[0]], new Set(), true),
  error => error.code === "bank_short" && error.status === 500);

// ---- a warning is Today's, shown where one actually fires ----
const warnRoot = path.join(temporary, "warned");
process.env.FORTHREE_STUDY_ROOT = warnRoot;
await seedDone(warnRoot, ["s01-lab-a", "s01-interview-a"], {current_session: 3});
assert.deepEqual((await service.getStudyOverview()).wires.map(wire => wire.id), ["skipped-check"]);
assert.deepEqual((await service.getStudyOverview(1)).wires, [], "and not on a card opened from the map");
// Every screen draws Ask from the one rule, Today's card included.
await service.getAttempt("s01-withdraw-a", 1);
assert.deepEqual((await service.getToday()).assistant, {open: false, reason: "check_open", session: 1});

// ---- the last part of Today's session, with the skills record unreadable ----
const offRoot = path.join(temporary, "damaged-board");
process.env.FORTHREE_STUDY_ROOT = offRoot;
await seedDone(offRoot, ["s01-lab-a", "s01-withdraw-a"]);
// The part finishes, Today moves on, and nothing is written over the file
// that could not be read.
await writeFile(path.join(offRoot, "board.json"), '{"version": 1, "A1": {"judge"');
await fails(() => board.readBoard(), "corrupt_record");
await service.getAttempt("s01-interview-a", 1);
await service.mutateAttempt("s01-interview-a", 1, ["answers"], {q1: "a".repeat(20), q2: "b".repeat(20), q3: "c".repeat(20)});
const lastPart = await service.mutateAttempt("s01-interview-a", 1, ["step"], {step: "done"});
assert.equal(lastPart.summary.board_damaged, true, "the done screen is told, so it can say so");
assert.equal((await service.getStudyOverview()).plan.current_session, 2);
assert(!(await readdir(offRoot)).includes("board.json"), "nothing is written over a file that could not be read");
// A finished interview is read-only too: it once took a new answer and
// rewrote the transcript.
await fails(() => service.mutateAttempt("s01-interview-a", 1, ["answers"], {q1: "changed afterwards, twenty chars"}), "already_finished");
// Only an unreadable record is treated as damage. Any other failure — here a
// folder where the file should be — is not hidden behind an empty board.
const oddRoot = path.join(temporary, "board-is-a-folder");
process.env.FORTHREE_STUDY_ROOT = oddRoot;
await mkdir(path.join(oddRoot, "board.json"), {recursive: true});
await assert.rejects(() => board.readBoardSafe(), error => error.code !== "corrupt_record");

// ---- an interview's notes describe its program, so they open with it ----
const lockedRoot = path.join(temporary, "locked-program");
process.env.FORTHREE_STUDY_ROOT = lockedRoot;
// In order, an interview is only reached after its lab. The lock on its
// program is kept all the same, and is tested on a record that exists while
// the lab has no locked guess.
await mkdir(path.join(lockedRoot, "sessions"), {recursive: true});
const openRecord = (part, extra = {}) => ({...doneRecord(part, false), step: "attempt", max_step: 0, finished_at: null, ...extra});
await writeFile(path.join(lockedRoot, "sessions", "s03-interview-a-1.json"), JSON.stringify(openRecord("s03-interview-a")));
await writeFile(path.join(lockedRoot, "plan.json"), JSON.stringify({
  version: 1, current_session: 3, current_attempt: {"s03-interview-a": 1}, next_checkpoint: 9, pull_checkpoint_forward: false,
}));
await service.mutateAttempt("s03-interview-a", 1, ["answers"], {q1: "a".repeat(20), q2: "b".repeat(20), q3: "c".repeat(20)});
const lockedView = (await service.getAttempt("s03-interview-a", 1)).part;
assert.equal(lockedView.target_locked, true);
assert.equal(lockedView.looks_for, undefined, "not before the program they describe");
// And it cannot be finished while the program is closed: finishing it used to
// open the program — the lab's answer — with the lab's guess still open.
await fails(() => service.mutateAttempt("s03-interview-a", 1, ["step"], {step: "done"}), "program_locked");
assert.equal((await service.getAttempt("s03-interview-a", 1)).part.target_text, undefined);
await writeFile(path.join(lockedRoot, "sessions", "s03-lab-a-1.json"), JSON.stringify(
  openRecord("s03-lab-a", {max_step: 1, prediction: {choice: 0, value: null, why: "", sealed_at: STAMP}, predict_result: {correct: false, graded_at: STAMP}})));
await writeFile(path.join(lockedRoot, "plan.json"), JSON.stringify({
  version: 1, current_session: 3, current_attempt: {"s03-interview-a": 1, "s03-lab-a": 1}, next_checkpoint: 9, pull_checkpoint_forward: false,
}));
assert.equal((await service.getAttempt("s03-interview-a", 1)).part.looks_for.length, 3);
// Annotating a paste needs an accepted paste, and says so by its own code.
await fails(() => service.assertAssistantAllowed({part: "s03-lab-a", feature: "annotate"}), "receipt_not_accepted");

// ---- why a lab's question is back: she missed the guess, or a paste was sent back ----
const causeRoot = path.join(temporary, "cause");
process.env.FORTHREE_STUDY_ROOT = causeRoot;
await mkdir(causeRoot, {recursive: true});
const resurfaceLib = require(path.join(compiled, "resurface.js"));
const filedRow = check => JSON.stringify({ts: "2026-11-10T00:00:00.000Z", part: "s02-lab-a", block: "A1", check_id: check, mental_model: null, cleared: false});
await writeFile(path.join(causeRoot, "ledger.jsonl"), filedRow("counted-and-crossed") + "\n");
assert.deepEqual((await resurfaceLib.selectResurface(3)).map(entry => entry.cause), ["paste"], "a guess she got right is not one that caught her");
await writeFile(path.join(causeRoot, "ledger.jsonl"), filedRow("counted-and-crossed") + "\n" + filedRow("s02-lab-a-prediction") + "\n");
assert.deepEqual((await resurfaceLib.selectResurface(3)).map(entry => entry.cause), ["missed"], "and two rows for one lab are one question");

// A check with one thing missing names that thing (walkthrough 2): session 2's
// total reset inside the loop prints the sum over 20 but never the crossing row.
{
  const two = JSON.parse(await readFile("curriculum/a1.json", "utf8")).sessions[1].parts.find(part => part.id === "s02-lab-a");
  const resetRun = grading.gradeAll(two, {stdout: "$ python3 rows.py\nAna\nBo\nCy\nDi\nEve\nFei\n3 83"}).find(entry => entry.id === "counted-and-crossed");
  assert.equal(resetRun.message, two.verdicts["counted-and-crossed"].missing["61"], "it says the crossing total is missing, not the sum she printed");
}
// ---- every lab's receipts: what a real terminal shows, right and wrong ----
// curriculum/receipts/<part>.json holds real runs of versions of her file:
// right ones written several ways, and the wrong ones a learner holding each
// wrong belief would paste. Each check must pass or refuse as the file says,
// with the verdict it names (L-AUTH-07, L-AUTH-11). Session 4's check was
// tested only on the author's own run, and three reviewers found it refusing
// right work and saying false things about wrong work.
const allParts = JSON.parse(await readFile("curriculum/a1.json", "utf8")).sessions.flatMap(session => session.parts);
const verdictText = (part, check, key) => key.split(".").reduce((value, step) => value?.[step], part.verdicts[check]);
for (const file of (await readdir("curriculum/receipts")).filter(name => name.endsWith(".json"))) {
  const fixture = JSON.parse(await readFile(path.join("curriculum/receipts", file), "utf8"));
  const lab = allParts.find(part => part.id === fixture.part);
  assert(lab, `${file}: no part ${fixture.part}`);
  for (const receipt of fixture.receipts) {
    const graded = Object.fromEntries(grading.gradeAll(lab, {stdout: receipt.raw}).map(entry => [entry.id, entry]));
    assert.deepEqual(Object.keys(receipt.expect).sort(), Object.keys(graded).sort(), `${file} "${receipt.name}" names every check`);
    for (const [check, pass] of Object.entries(receipt.expect)) {
      assert.equal(graded[check].pass, pass, `${file} "${receipt.name}": ${check} should ${pass ? "pass" : "refuse"}`);
    }
    for (const [check, key] of Object.entries(receipt.says ?? {})) {
      assert.equal(graded[check].message, verdictText(lab, check, key), `${file} "${receipt.name}": ${check} says its ${key} line`);
    }
  }
  // The placeholder is a shape, never a pass.
  assert(grading.gradeAll(lab, {stdout: lab.receipt_hint ?? ""}).some(entry => !entry.pass), `${file}: the placeholder passes`);
}

// ---- her reading log: ticks and a note per session, changeable any day ----
{
  const http = require(path.join(compiled, "http.js"));
  const logRoot = path.join(temporary, "log");
  process.env.FORTHREE_STUDY_ROOT = logRoot;
  const s2 = JSON.parse(await readFile("curriculum/a1.json", "utf8")).sessions[1];
  const lab = s2.parts.find(part => part.kind === "lab").reading[0].url;
  const teardown = s2.parts.find(part => part.kind === "teardown").reading[0].url;
  const notes = (method, body) => http.dispatch(method, "/api/reading-log/2", body);
  assert.deepEqual(await notes("GET"), {session: 2, read: {}, note: "", note_at: null}, "an empty log reads as empty");
  assert((await notes("POST", {url: lab, read: true})).read[lab], "a tick is kept");
  const first = (await notes("GET")).read[lab];
  await notes("POST", {url: lab, read: true});
  assert.equal((await notes("GET")).read[lab], first, "ticking again keeps the day she first read it");
  await notes("POST", {note: "Read lecture 2."});
  await notes("POST", {note: "Read lecture 2, then redid the loop."});
  assert.equal((await notes("GET")).note, "Read lecture 2, then redid the loop.", "a note is replaced, not appended");
  await notes("POST", {url: lab, read: false});
  assert.deepEqual((await notes("GET")).read, {}, "a tick can be taken back");
  await fails(() => notes("POST", {url: "https://example.com/", read: true}), "not_found");
  await fails(() => http.dispatch("POST", "/api/reading-log/99", {note: "x"}), "not_found");
  await fails(() => notes("POST", {note: "x", url: lab, read: true}), "invalid_body");
  await fails(() => notes("POST", {note: "x".repeat(4001)}), "invalid_body");
  // The log shows the lab's readings, and a teardown's only once she has
  // opened the teardown or ticked one: never a reading before its part does.
  let log = (await http.dispatch("GET", "/api/reading-log")).sessions;
  assert.deepEqual(log.map(entry => entry.session), [1, 2], "Today's session and any she has written in");
  assert(!log[1].readings.some(row => row.url === teardown), "a teardown's readings wait for the teardown");
  await writeFile(path.join(logRoot, "plan.json"), JSON.stringify({version: 1, current_session: 2,
    current_attempt: {[s2.parts.find(part => part.kind === "teardown").id]: 1}, next_checkpoint: 9, pull_checkpoint_forward: false}));
  log = (await http.dispatch("GET", "/api/reading-log")).sessions;
  assert(log[1].readings.some(row => row.url === teardown && !row.read_at), "an opened teardown's readings are on the log");
  await writeFile(path.join(logRoot, "plan.json"), JSON.stringify({version: 1, current_session: 2, current_attempt: {}, next_checkpoint: 9, pull_checkpoint_forward: false}));
  await notes("POST", {url: teardown, read: true});
  log = (await http.dispatch("GET", "/api/reading-log")).sessions;
  assert(log[1].readings.find(row => row.url === teardown)?.read_at, "a ticked teardown reading is on the log");
  assert.equal(log[1].note, "Read lecture 2, then redid the loop.");
  // Nothing in the course reads it: no attempt, ledger or board file appears.
  assert.deepEqual((await readdir(logRoot)).filter(name => !name.startsWith(".")).sort(), ["plan.json", "reading_log.json"], "the log writes one file and nothing else");
  // A damaged entry is named, not a crash.
  await writeFile(path.join(logRoot, "reading_log.json"), JSON.stringify({version: 1, sessions: {"2": {note: "x"}}}));
  await fails(() => notes("POST", {url: lab, read: true}), "invalid_record");
  process.env.FORTHREE_STUDY_ROOT = root;
}

await rm(temporary, {recursive: true, force: true});
console.log("Sessions 1-4, all four part kinds, her reading log: HTTP routes, the per-kind predict gate, item draws and recall rows, receipt grading, variants, every lab's receipts fixture, resurface pools, the board's hard lock, one trip-wire, reruns, immutable passes, navigation, looking ahead and working in order, the checks' draws, a tolerated board, corruption and cross-process locking passed.");
