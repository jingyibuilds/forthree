#!/usr/bin/env node
// Validates `curriculum/*.json` against DESIGN.md §14.2, its check types
// against §18, and the sealed bank's ability to fill every draw this slice
// makes. **Scope: A1 sessions 1-3.** Sessions 4-21 are not authored, so the
// §11 coverage audit — the union of a block's `covers` being exactly its six
// `learn` indices — cannot run yet and is reported as deferred rather than
// silently passed. Sealed content is read for shape, never printed.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PINS = {
  "content/trunk.json": "084ef66f0f3896dc509620bf3c6a00454f4457ab80b46141a15ac2f1d93b0260",
  "content/anatomy.json": "6779126a1f8bf30e450c03bb13d33451bceb8900ef1e0261178edc23c1e7c233",
  "content/skill-tree.html": "1f2a6a17d96bac4cd2c101a9bab52385a938ed4d72cd0d2e00a10bccb4f13572",
};

// Authored through this session; everything past it is unwritten by design.

// §18, restricted to the types `src/lib/study/grading.ts` implements. A type
// outside this table is a build failure, never a check that cannot be graded.
const CHECK_FIELDS = {
  paired: {required: ["pairs", "expect"], optional: ["field"]},
  contains_all: {required: ["need"], optional: ["field", "case"]},
  contains_any: {required: ["need"], optional: ["field", "case"]},
  equal_to: {required: ["value"], optional: ["field"]},
  accept_any: {required: ["accept_sha256", "normalise"], optional: ["field", "mode"]},
};
const NORMALISE = ["trim", "collapse", "lower", "sorted_lines", "sequence"];
const RIGHT_REASON = "I had it right, and for the right reason.";
const STEP_KEYS = ["learn", "predict", "attempt", "compare", "record", "resurface"];
// CURRICULUM §10's per-size table; an exposure has no medium figure at all.
const TEARDOWN_MINUTES = {
  "simple:true": 45, "medium:true": 90, "difficult:true": 150,
  "simple:false": 30, "difficult:false": 90,
};

const text = value => typeof value === "string" && value.trim().length > 0;
const object = value => !!value && typeof value === "object" && !Array.isArray(value);
const integer = value => Number.isInteger(value) && value >= 0;
const array = value => (Array.isArray(value) ? value : []);
const date = value =>
  /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") && Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
const url = value => {
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
};

export function validateContent(root = process.cwd()) {
  const errors = [];
  const notes = [];
  const check = (condition, where, message) => { if (!condition) errors.push(`${where}: ${message}`); };
  const keys = (value, allowed, where) => {
    check(object(value), where, "must be an object");
    if (object(value)) for (const key of Object.keys(value)) check(allowed.includes(key), where, `unexpected field ${key}`);
  };
  const load = path => {
    try { return JSON.parse(readFileSync(join(root, path), "utf8")); }
    catch (error) { errors.push(`${path}: ${error.message}`); return null; }
  };

  for (const [path, pin] of Object.entries(PINS)) {
    try {
      check(createHash("sha256").update(readFileSync(join(root, path))).digest("hex") === pin, path,
        "research SHA-256 pin mismatch; requires a recorded curriculum decision");
    } catch (error) { errors.push(`${path}: ${error.message}`); }
  }

  const trunk = load("content/trunk.json");
  check(Array.isArray(trunk) && trunk.length === 10, "content/trunk.json", "expected ten pinned blocks");
  const anatomy = load("content/anatomy.json");
  const products = new Map();
  for (const kind of array(anatomy?.kinds)) {
    for (const [size, entry] of Object.entries(kind.sizes ?? {})) {
      if (entry?.example) products.set(entry.example, {size, entry});
    }
  }

  let files = [];
  try {
    files = readdirSync(join(root, "curriculum")).filter(name => name.endsWith(".json")).sort();
  } catch (error) { errors.push(`curriculum: ${error.message}`); }
  check(files.length === 1 && files[0] === "a1.json", "curriculum",
    "this slice authors a1.json only; extend the validator's scope before adding a block file");

  const block = load("curriculum/a1.json");
  if (!object(block)) return {errors, notes};

  // ---- two rules about every authored string, checked on the text itself ----
  // The product is English only (DECISIONS 2026-11-10): no CJK anywhere in
  // what a learner reads. And a possessive is typeset with a curly apostrophe;
  // sessions 2 and 3 shipped with straight ones beside session 1's curly ones.
  // Code is exempt: `.mo` spans, <pre>/<code>, and the fields that hold
  // commands, terminal output and patterns.
  const CODE_FIELDS = new Set(["mine", "theirs", "command", "commands", "receipt_hint", "pattern", "cue", "value", "accept", "path", "url"]);
  const proseOf = string => string.replace(/<span class="mo">[\s\S]*?<\/span>|<pre>[\s\S]*?<\/pre>|<code>[\s\S]*?<\/code>/g, "");
  const eachString = (value, key, visit, trail = "A1") => {
    if (typeof value === "string") visit(value, key, trail);
    else if (Array.isArray(value)) value.forEach((entry, index) => eachString(entry, key, visit, `${trail}[${index}]`));
    else if (object(value)) for (const [name, entry] of Object.entries(value)) eachString(entry, name, visit, `${trail}.${name}`);
  };
  eachString(block, "", (string, key, trail) => {
    // A field the scaffold left for the author (scripts/new-session.mjs).
    check(!/\bTODO\b/.test(string), trail, "still says TODO: a session lands whole or not at all");
    check(!/[\u3400-\u9fff\u3000-\u30ff\uff00-\uffef]/.test(string), trail,
      "the product is English only: no Chinese, Japanese or full-width characters in authored content");
    if (!CODE_FIELDS.has(key)) {
      check(!/\w's\b/.test(proseOf(string)), trail,
        "a possessive in prose takes a curly apostrophe (’); a straight one belongs in code only");
    }
  });
  keys(block, ["block", "name", "bars", "sessions"], "A1");
  check(block.block === "A1" && block.name === "Code & debugging", "A1", "block and name must match the pinned skill tree");
  const trunkBlock = array(trunk).find(entry => entry.id === block.block);
  check(array(trunkBlock?.learn).length === 6, "content/trunk.json", `${block.block} must have six learn items`);

  keys(block.bars, ["judge", "build"], "A1.bars");
  for (const [skill, says] of [["judge", "Tell whether code is right"], ["build", "Write it and fix what it hands you"]]) {
    const bar = block.bars?.[skill];
    const where = `A1.bars.${skill}`;
    keys(bar, ["label", "says", "borrowed_gate", "own_gate"], where);
    check(bar?.label === (skill === "judge" ? "Judge" : "Build") && bar?.says === says, where,
      "use the binding learner-facing label and sentence (§14.2)");
    check(integer(bar?.borrowed_gate) && integer(bar?.own_gate) && bar.borrowed_gate >= 1 && bar.own_gate >= bar.borrowed_gate,
      where, "both gates must be named, and own may not precede borrowed");
    check(bar?.borrowed_gate === 9 && bar?.own_gate === 9, where,
      "A1's two gates are both session 9; nothing in sessions 1-3 may move a skill");
  }

  const sessions = array(block.sessions);
  const numbers = sessions.map(session => session?.session);
  // How far the block is written is read off the file, not kept as a constant
  // to remember to bump: adding session 4 is adding session 4.
  const AUTHORED_THROUGH = Math.max(0, ...numbers.filter(integer));
  check(AUTHORED_THROUGH >= 1, "A1.sessions", "no sessions are authored");
  check(new Set(numbers).size === numbers.length, "A1.sessions", "session numbers must be unique");
  for (let n = 1; n <= AUTHORED_THROUGH; n += 1) {
    check(numbers.includes(n), "A1.sessions", `session numbers must be contiguous from 1; ${n} is missing`);
  }
  check(numbers.every(value => integer(value) && value >= 1 && value <= 21), "A1.sessions", "session numbers are 1-21");

  const covered = new Set();
  const partIds = new Set();
  const labParts = [];
  const withdrawParts = [];

  for (const session of sessions) {
    const where = `session ${session?.session}`;
    keys(session, ["session", "title", "subtitle", "double", "covers", "parts"], where);
    check(text(session?.title), where, "missing non-empty title");
    if (session?.subtitle !== undefined) check(text(session.subtitle), where, "subtitle must be non-empty when present");
    if (session?.double !== undefined) check(typeof session.double === "boolean", where, "double must be boolean");
    check(Array.isArray(session?.covers), where, "covers is required (DESIGN §14.2); [] is legal");
    check(array(session?.covers).every(n => Number.isInteger(n) && n >= 1 && n <= 6), where,
      "covers are 1-based indices into this block's six learn items");
    check(new Set(array(session?.covers)).size === array(session?.covers).length, where, "covers must be unique");
    for (const index of array(session?.covers)) covered.add(index);

    const parts = array(session?.parts);
    // A sibling part must not state a lab's own answer. Today links every part
    // of the session, so an interview's `looks_for` or a teardown's `why` is
    // one click from a prediction she has not made yet. The lab names the
    // phrases that may not appear anywhere else in its session.
    for (const lab of parts.filter(part => part?.kind === "lab")) {
      check(array(lab.leak_guard).length > 0, lab.id,
        "a lab declares leak_guard: the phrases that may not appear elsewhere in its session before she predicts");
      // The guard must cover the thing it exists to protect.
      const answer = String(lab.predict?.options?.[lab.predict?.correct] ?? "").toLowerCase();
      if (answer) {
        check(array(lab.leak_guard).some(phrase => answer.includes(String(phrase).toLowerCase())), lab.id,
          "leak_guard must include a phrase from the correct option, or it guards nothing");
      }
      for (const phrase of array(lab.leak_guard)) {
        const needle = String(phrase).toLowerCase();
        // The session's own front matter is read before `Begin`, and the lab's
        // own pre-prediction surface is read before the question.
        const front = JSON.stringify([session?.title, session?.subtitle]).toLowerCase();
        check(!front.includes(needle), `session ${session?.session}`,
          `the session's own title or subtitle states ${lab.id}'s answer: "${phrase}"`);
        const early = JSON.stringify([lab.shows, lab.why, lab.setup, lab.before_you_start, lab.reading,
          lab.tasks, lab.reference_card, lab.rules]).toLowerCase();
        check(!early.includes(needle), lab.id, `states its own answer before the prediction: "${phrase}"`);
        for (const sibling of parts) {
          if (sibling?.id === lab.id) continue;
          const surface = JSON.stringify([sibling?.shows, sibling?.looks_for, sibling?.questions, sibling?.why,
            sibling?.setup, sibling?.labels, sibling?.concepts, sibling?.reading]).toLowerCase();
          check(!surface.includes(needle), sibling?.id ?? `session ${session?.session}`,
            `states ${lab.id}'s own answer before she predicts it: "${phrase}"`);
        }
      }
    }
    check(parts.length >= 1, where, "a session needs at least one part");
    check(parts.some(part => part?.kind === "withdraw"), where,
      "every session carries a no-help check (§14.3)");
    check(parts.some(part => part?.kind === "interview"), where,
      "every session carries a code-review interview (§14.3)");

    for (const part of parts) {
      const here = part?.id ?? where;
      keys(part, [
        "id", "kind", "shows", "minutes", "ai_allowed", "why", "setup", "needs_environment",
        "before_you_start", "reading", "tasks", "reference_card", "reference_card_bans", "rules",
        "predict", "acceptance_checks", "verdicts", "leak_guard", "receipt_commands", "receipt_fields",
        "receipt_prompt", "receipt_hint", "compare", "labels", "concepts", "provenance",
        "bar", "item_kind", "brief", "questions", "looks_for", "target",
        "anatomy_example", "product", "size", "scored", "scorable", "held",
      ], here);
      if (!object(part)) continue;

      const match = /^s(\d{2})-(lab|teardown|withdraw|interview|exam)-([a-z])$/.exec(part.id ?? "");
      check(!!match, here, "id must be s<NN>-<kind>-<letter>");
      if (match) {
        check(Number(match[1]) === session.session, here, `<NN> must equal the session number (${session.session})`);
        check(match[2] === part.kind, here, "the id's kind must equal `kind`");
      }
      check(!partIds.has(part.id), here, "duplicate part id");
      partIds.add(part.id);
      check(["lab", "teardown", "withdraw", "interview"].includes(part.kind), here,
        "kind must be lab, teardown, withdraw or interview; exam appears only in capstone.json");
      check(typeof part.ai_allowed === "boolean", here, "ai_allowed must be boolean");
      if (part.shows !== undefined) check(text(part.shows), here, "shows must be non-empty when present");
      if (part.needs_environment !== undefined) check(typeof part.needs_environment === "boolean", here, "needs_environment must be boolean");

      keys(part.minutes, STEP_KEYS, `${here}.minutes`);
      check(object(part.minutes) && Object.keys(part.minutes).length > 0
        && Object.values(part.minutes).every(integer) && Object.values(part.minutes).some(n => n > 0),
        here, "minutes needs at least one key and a positive estimate; {} silently kills every wire");

      for (const field of ["reference_card_bans", "rules", "before_you_start", "receipt_commands", "receipt_fields", "labels", "questions", "leak_guard"]) {
        if (part[field] !== undefined) check(Array.isArray(part[field]) && part[field].every(text), here, `${field} must be a string array`);
      }

      // ---- per kind ----
      if (part.kind === "lab" || part.kind === "teardown") {
        check(text(part.why), here, "why is required on a lab and a teardown");
      } else {
        check(part.why === undefined, here, "why belongs to a lab or a teardown; other kinds show the kind's standing line");
      }

      if (part.kind === "lab") {
        labParts.push(part);
        check(part.ai_allowed === true, here, "a lab permits AI to explain (§13); only a no-help check forbids it");
        check(array(part.reading).length > 0, here, "a lab names its reading");
        // Every minute of reading is priced: the entries add up to `learn`
        // (L-AUTH-04). Lecture 7 was once priced at half the rate of the
        // entry beside it, and two exercises had no minutes at all.
        check(array(part.reading).reduce((total, row) => total + (row?.minutes ?? 0), 0) === part.minutes?.learn, here,
          "the reading minutes must add up to minutes.learn");
        for (const reading of array(part.reading)) {
          keys(reading, ["title", "url", "teaches", "minutes"], `${here}.reading`);
          check(text(reading?.title) && text(reading?.teaches), `${here}.reading`, "title and teaches are required");
          check(url(reading?.url) && integer(reading?.minutes) && reading.minutes > 0, `${here}.reading`,
            "a reading is a specific place in a source, with positive minutes");
        }
        const tasks = array(part.tasks);
        check(tasks.length >= 2 && tasks.length <= 4, here, "a lab has 2 to 4 tasks, rising");
        check(tasks.some(task => task?.guess === true), here,
          "at least one task must ask for a pass/fail guess, or the retrieval loop never fires");
        for (const task of tasks) {
          keys(task, ["name", "brief", "passes_when", "minutes", "guess"], `${here}.task`);
          check(text(task?.name) && text(task?.brief) && text(task?.passes_when), `${here}.task`,
            "name, brief and passes_when are required");
          check(integer(task?.minutes) && task.minutes > 0, `${here}.task`,
            "per-task minutes are what the calibration wire sums");
          if (task?.guess !== undefined) check(typeof task.guess === "boolean", `${here}.task`, "guess must be boolean");
        }
        const cardMax = part.id === "s01-lab-a" ? 8 : part.id === "s09-lab-a" ? 7 : 6;
        const card = array(part.reference_card);
        check(card.length >= 3 && card.length <= cardMax, here, `a lab's reference card is 3 to ${cardMax} rows`);
        for (const row of card) {
          keys(row, ["label", "code"], `${here}.reference_card`);
          check(text(row?.label) && text(row?.code), `${here}.reference_card`, "label and code are required");
        }
        check(array(part.reference_card_bans).length > 0, here,
          "a lab with no reference_card_bans fails review; name what a future author must not put on the card");
        // The test is over the whole card AND over the placeholder: a construct
        // that lives only in `receipt_hint` is not taught (§14.2).
        const surface = card.map(row => `${row?.label}\n${row?.code}`).join("\n") + "\n" + (part.receipt_hint ?? "");
        for (const ban of array(part.reference_card_bans)) {
          try { check(!new RegExp(ban, "i").test(surface), here, `reference card or placeholder contains a banned construct: ${ban}`); }
          catch { check(false, here, `invalid reference_card_bans regex: ${ban}`); }
        }
        check(text(part.receipt_prompt), here, "a lab names the evidence it wants pasted back");
        check(array(part.acceptance_checks).length > 0, here, "a lab is graded by at least one acceptance check");
        check(array(part.labels).length >= 2 && array(part.labels).includes(RIGHT_REASON), here,
          `labels need at least two entries, one of them exactly "${RIGHT_REASON}"`);
        keys(part.compare, ["mine_label", "mine", "theirs_label", "theirs", "note", "table", "after"], `${here}.compare`);
        for (const field of ["mine_label", "mine", "theirs_label", "theirs", "note"]) {
          check(text(part.compare?.[field]), `${here}.compare`, `missing non-empty ${field}`);
        }
        if (part.compare?.table !== undefined) {
          const table = part.compare.table;
          check(Array.isArray(table) && table.length >= 2
            && table.every(row => Array.isArray(row) && row.length === table[0].length && row.every(text)),
            `${here}.compare`, "a table needs a header row and equal-length string rows");
        }
      } else {
        // An exposure teardown is a guided read and nothing else, so it is the
        // one other kind that names its reading (DECISIONS 2026-11-10).
        const exposure = part.kind === "teardown" && part.scored === false;
        for (const field of ["tasks", "reference_card", "acceptance_checks", "receipt_prompt", "compare"]) {
          check(part[field] === undefined, here, `${field} belongs to a lab only`);
        }
        check(part.reading === undefined || exposure, here, "reading belongs to a lab, or to an exposure teardown");
        if (exposure) {
          check(array(part.reading).length > 0, here, "an exposure teardown is a guided read and must name what to read");
          check(array(part.reading).reduce((total, row) => total + (row?.minutes ?? 0), 0) === part.minutes?.learn, here,
            "the reading minutes must add up to minutes.learn");
          for (const reading of array(part.reading)) {
            keys(reading, ["title", "url", "teaches", "minutes"], `${here}.reading`);
            check(text(reading?.title) && text(reading?.teaches), `${here}.reading`, "title and teaches are required");
            check(url(reading?.url) && integer(reading?.minutes) && reading.minutes > 0, `${here}.reading`,
              "a reading is a specific place in a source, with positive minutes");
          }
        }
      }

      if (part.kind === "teardown") {
        check(["simple", "medium", "difficult"].includes(part.size), here, "a teardown declares its size");
        check(typeof part.scored === "boolean", here, "a teardown declares whether it is scored");
        check(text(part.anatomy_example) && products.has(part.anatomy_example), here,
          "anatomy_example must match an `example` string in the pinned anatomy file, byte for byte");
        if (products.has(part.anatomy_example)) {
          check(products.get(part.anatomy_example).size === part.size, here,
            `the pinned file calls this product ${products.get(part.anatomy_example).size}`);
        }
        const figure = TEARDOWN_MINUTES[`${part.size}:${String(part.scored)}`];
        check(figure !== undefined, here, "medium + scored:false has no costed figure (CURRICULUM §10)");
        if (figure !== undefined) {
          const total = Object.values(part.minutes ?? {}).reduce((sum, value) => sum + value, 0);
          check(total === figure, here, `a ${part.size} ${part.scored ? "scored" : "exposure"} teardown is costed at ${figure} minutes, not ${total}`);
        }
        if (part.scored) {
          check(object(part.predict), here, "a scored teardown predicts before it names");
          keys(part.scorable, ["parts", "tricky"], `${here}.scorable`);
          check(array(part.scorable?.parts).every(integer), `${here}.scorable`, "parts are indices into the entry's own array");
          check(Array.isArray(part.held), here, "held names the parts she is credited with already holding");
          check(array(part.minutes && Object.keys(part.minutes)).join() === "attempt,compare", here,
            "a scored teardown authors {attempt, compare}");
        } else {
          // Fork 1: an exposure has no prediction, because it has no cold
          // naming and no comparison to predict against.
          check(part.predict === undefined, here, "an exposure teardown has nothing to predict against");
          check(part.scorable === undefined && part.held === undefined, here, "scorable and held belong to a scored teardown");
          check(Object.keys(part.minutes ?? {}).join() === "learn", here, "an exposure teardown authors {learn} alone");
        }
        check(part.labels === undefined, here, "a teardown skips the record step; it produces no wrong belief to name");
      }

      if (part.kind === "withdraw") {
        withdrawParts.push({part, session: session.session});
        check(part.ai_allowed === false, here, "a no-help check forbids AI; the bubble is not rendered at all");
        check(["judge", "build"].includes(part.bar), here,
          "a no-help check declares which skill it draws for, or that skill can never reach on-your-own");
        if (part.bar === "build") {
          check(["recall", "cold_write"].includes(part.item_kind), here, "a build check declares item_kind");
        }
        check(array(part.labels).length >= 2 && array(part.labels).includes(RIGHT_REASON), here,
          `labels need at least two entries, one of them exactly "${RIGHT_REASON}"`);
        check(part.provenance === undefined, here, "a no-help check's provenance is the sealed bank's");
      }

      if (part.kind === "interview") {
        check(text(part.brief), here,
          "an interview says in one or two sentences what the code is and where it came from: two of its questions are answered before she opens it");
        check(array(part.questions).length === 3, here, "an interview asks exactly three authored questions");
        check(array(part.looks_for).length === 3, here,
          "an interview names what a good answer gets to, one line per question — it is the only feedback the part can give without a model");
        keys(part.target, ["kind", "path"], `${here}.target`);
        check(["diff", "program"].includes(part.target?.kind), `${here}.target`, "kind is diff or program");
        check(text(part.target?.path) && !part.target.path.startsWith("/") && !part.target.path.includes(".."),
          `${here}.target`, "path is a repository-relative file");
        if (text(part.target?.path)) {
          check(existsSync(join(root, part.target.path)), `${here}.target`, `no such file: ${part.target.path}`);
        }
        check(part.labels === undefined, here, "an interview skips the record step");
      }

      // ---- predict ----
      if (part.predict !== undefined) {
        const where2 = `${here}.predict`;
        keys(part.predict, ["type", "ask", "options", "correct", "why_prompt", "unit", "magnitude"], where2);
        check(text(part.predict.ask) && text(part.predict.why_prompt), where2, "ask and why_prompt are required");
        if (part.predict.type === "choice") {
          const options = array(part.predict.options);
          check(options.length >= 3 && options.every(text) && new Set(options).size === options.length, where2,
            "a choice needs at least three distinct options, each a real mental model");
          check(integer(part.predict.correct) && part.predict.correct < options.length, where2,
            "correct is one valid option index");
        } else if (part.predict.type === "quantity") {
          check(text(part.predict.unit), where2, "a quantity names its unit");
          check(Number.isFinite(part.predict.correct) && typeof part.predict.magnitude === "boolean", where2,
            "a quantity needs a numeric correct and a boolean magnitude");
        } else check(false, where2, "predict is choice or quantity, never free text");
      } else if (part.kind === "lab") {
        check(false, here, "a lab predicts before anything else is served");
      }

      // ---- checks ----
      const ids = new Set();
      const fields = new Set(["stdout", ...array(part.receipt_fields)]);
      check(array(part.receipt_commands).length === 0 || array(part.receipt_fields).length > 0, here,
        "receipt_commands is required only alongside receipt_fields");
      for (const grade of array(part.acceptance_checks)) {
        const where2 = `${here}.check ${grade?.id ?? "?"}`;
        check(text(grade?.id), where2, "a check needs an id");
        check(!ids.has(grade?.id), where2, "duplicate check id");
        ids.add(grade?.id);
        const shape = CHECK_FIELDS[grade?.type];
        check(!!shape, where2, `type ${grade?.type} is not implemented; add it to DESIGN §18 and to grading.ts first`);
        if (!shape) continue;
        keys(grade, ["id", "type", ...shape.required, ...shape.optional], where2);
        for (const field of shape.required) check(grade[field] !== undefined, where2, `missing ${field}`);
        check(grade.field === undefined || fields.has(grade.field), where2,
          `field ${grade.field} is not in receipt_fields and is not stdout`);
        if (grade.type === "paired") {
          check(array(grade.pairs).length >= 2, where2, "paired needs at least two command/value bindings");
          const names = new Set();
          for (const pair of array(grade.pairs)) {
            keys(pair, ["name", "cue", "value"], `${where2}.pair`);
            check(text(pair?.name) && text(pair?.cue) && text(pair?.value), `${where2}.pair`, "name, cue and value are required");
            check(!names.has(pair?.name), `${where2}.pair`, "duplicate binding name");
            names.add(pair?.name);
            for (const pattern of [pair?.cue, pair?.value]) {
              try { new RegExp(pattern); } catch { check(false, `${where2}.pair`, "cue and value must compile as regexes"); }
            }
          }
          check(object(grade.expect) && Object.keys(grade.expect).length === names.size
            && Object.keys(grade.expect).every(name => names.has(name)), where2,
            "expect must cover exactly the binding names");
          for (const pattern of Object.values(grade.expect ?? {})) {
            try { check(text(pattern), where2, "an expect pattern is required"); new RegExp(pattern); }
            catch { check(false, where2, "expect patterns must compile"); }
          }
        }
        if (grade.type === "contains_all" || grade.type === "contains_any") {
          check(array(grade.need).length > 0 && array(grade.need).every(text), where2, "need is a non-empty string array");
          if (grade.case !== undefined) check(typeof grade.case === "boolean", where2, "case must be boolean");
        }
        if (grade.type === "equal_to") check(text(grade.value), where2, "value is required");
        if (grade.type === "accept_any") {
          check(NORMALISE.includes(grade.normalise), where2, `normalise is one of ${NORMALISE.join(", ")}`);
          check(array(grade.accept_sha256).every(hash => /^[0-9a-f]{64}$/.test(hash ?? "")), where2,
            "accept_sha256 entries are lowercase hex SHA-256");
          if (grade.mode !== undefined) {
            check(["equals", "contains"].includes(grade.mode), where2, "mode is equals or contains");
            // §18.5a's first tension, closed from both ends: a paste holding
            // every candidate passes, so `contains` is not available here.
            check(grade.mode !== "contains", where2, "contains mode leaks and is not permitted");
          }
        }
        // §18: a check whose required literals all appear in `receipt_hint` is
        // not a check — the placeholder is visible until she types.
        const hint = String(part.receipt_hint ?? "");
        if (hint && (grade.type === "contains_all" || grade.type === "contains_any")) {
          const leaked = array(grade.need).every(need => hint.toLowerCase().includes(String(need).toLowerCase()));
          check(!leaked, where2, "receipt_hint contains every literal this check needs");
        }
        if (hint && grade.type === "paired") {
          const bound = {};
          let armed = null;
          for (const line of hint.split(/\r?\n/).map(entry => entry.trim())) {
            const cue = array(grade.pairs).find(pair => { try { return new RegExp(pair.cue).test(line); } catch { return false; } });
            if (cue) { armed = cue; continue; }
            if (armed) { try { if (new RegExp(armed.value).test(line)) { bound[armed.name] = line; armed = null; } } catch { /* reported above */ } }
          }
          let leaked = object(grade.expect) && Object.keys(grade.expect).length > 0;
          for (const [name, pattern] of Object.entries(grade.expect ?? {})) {
            try { leaked = leaked && !!bound[name] && new RegExp(pattern).test(bound[name]); } catch { leaked = false; }
          }
          check(!leaked, where2, "receipt_hint is itself a passing receipt");
        }
      }
      // Markup in a field the runner prints as plain text reaches her as
      // `<span class="mo">`. These are the fields rendered without <Html>.
      check(!/[<>]/.test(String(part.brief ?? "")), here, "brief is rendered as plain text and may not contain markup");
      for (const field of ["labels", "questions", "shows", "before_you_start"]) {
        for (const value of array(part[field])) {
          check(!/[<>]/.test(String(value)), here, `${field} is rendered as plain text and may not contain markup`);
        }
      }
      for (const row of array(part.reference_card)) {
        check(!/<span/.test(String(row?.label)), here, "a reference-card label is rendered as plain text");
      }
      if (part.verdicts !== undefined) {
        check(object(part.verdicts), `${here}.verdicts`, "verdicts is an object keyed by check id");
        for (const [id, words] of Object.entries(part.verdicts ?? {})) {
          check(ids.has(id), `${here}.verdicts`, `${id} is not a check on this part`);
          keys(words, ["pass", "fail", "partial", "missing"], `${here}.verdicts.${id}`);
          check(text(words?.pass) && text(words?.fail), `${here}.verdicts.${id}`, "pass and fail wording are required");
        }
      }

      // ---- concepts and provenance ----
      for (const concept of array(part.concepts)) {
        keys(concept, ["term", "anchor", "explain"], `${here}.concept`);
        for (const field of ["term", "anchor", "explain"]) {
          check(text(concept?.[field]), `${here}.concept`, `missing non-empty ${field}`);
        }
      }
      if (part.kind === "lab" || part.kind === "teardown") {
        const source = part.provenance;
        keys(source, ["level", "courses", "measured"], `${here}.provenance`);
        check(["from", "shaped", "authored"].includes(source?.level), `${here}.provenance`, "level is from, shaped or authored");
        check(array(source?.courses).length > 0, `${here}.provenance`, "provenance needs dated evidence links");
        for (const course of array(source?.courses)) {
          keys(course, ["name", "url", "kind", "checked"], `${here}.course`);
          check(text(course?.name), `${here}.course`, "name is required");
          check(url(course?.url), `${here}.course`, "a course with no reachable evidence may not be cited");
          check(["course_site", "syllabus", "catalog", "repo", "lecture"].includes(course?.kind), `${here}.course`,
            "kind is course_site, syllabus, catalog, repo or lecture");
          const age = (Date.now() - Date.parse(course?.checked)) / 86400000;
          check(date(course?.checked) && age >= -1 && age <= 90, `${here}.course`,
            "checked must be a date within the past 90 days (gate G4)");
        }
        if (/\d/.test(JSON.stringify(part.compare ?? ""))) {
          keys(source?.measured, ["machine", "date"], `${here}.measured`);
          check(text(source?.measured?.machine) && date(source?.measured?.date), `${here}.measured`,
            "a compare that carries a number records which machine produced it and when");
        }
      }
    }
  }

  // ---- a lab's kit must not sort itself (L-AUTH-03) ----
  // Every program in a kit has the same shape of header, so that no comment
  // marks out the ones the lab asks her to find. And a zip in a kit holds
  // exactly the loose files beside it, byte for byte: she runs what the
  // checks were measured against.
  for (const lab of labParts) {
    const kit = join(root, "public/labs", lab.id);
    if (!existsSync(kit)) continue;
    const names = readdirSync(kit).filter(name => name.endsWith(".py")).sort();
    const headerOf = name => {
      const lines = readFileSync(join(kit, name), "utf8").split("\n");
      let count = 0;
      while (count < lines.length && lines[count].startsWith("#")) count += 1;
      return count;
    };
    if (names.length > 1) {
      const shapes = new Set(names.map(headerOf));
      check(shapes.size === 1, lab.id,
        `the programs in its kit open with different numbers of comment lines (${[...shapes].sort().join(", ")}); one shape for all, or the header sorts them`);
    }
    for (const archive of readdirSync(kit).filter(name => name.endsWith(".zip"))) {
      const listing = spawnSync("unzip", ["-Z1", join(kit, archive)], {encoding: "utf8"});
      if (listing.error || listing.status !== 0) { notes.push(`${lab.id}: ${archive} was not compared with its loose files (no unzip here)`); continue; }
      const inside = listing.stdout.split("\n").filter(Boolean).sort();
      check(JSON.stringify(inside) === JSON.stringify(names), lab.id, `${archive} does not hold exactly the kit's programs`);
      for (const name of inside.filter(entry => names.includes(entry))) {
        const packed = spawnSync("unzip", ["-p", join(kit, archive), name], {encoding: "buffer"}).stdout;
        check(Buffer.compare(packed, readFileSync(join(kit, name))) === 0, lab.id, `${archive}: ${name} differs from the loose file`);
      }
    }
  }

  // ---- the sealed bank must be able to fill every draw this slice makes ----
  const sealedPath = "curriculum/sealed/a1.json";
  if (!existsSync(join(root, sealedPath))) {
    errors.push(`${sealedPath}: missing; every session carries a no-help check and it draws from this file`);
  } else {
    const sealed = load(sealedPath);
    if (object(sealed)) {
      check(sealed.block === "A1", sealedPath, "block must be A1");
      const bank = array(sealed.withdraw_bank);
      const seenIds = new Set();
      for (const item of bank) {
        const where = `${sealedPath} ${item?.id ?? "?"}`;
        check(/^a1-(r|cw)-\d{2}$/.test(item?.id ?? ""), where, "item ids are a1-r-NN or a1-cw-NN");
        check(!seenIds.has(item?.id), where, "duplicate item id");
        seenIds.add(item?.id);
        check(["recall", "cold_write"].includes(item?.kind), where, "kind is recall or cold_write");
        check(text(item?.prompt) && text(item?.explain), where, "prompt and explain are required");
        check(integer(item?.earliest_session) && item.earliest_session >= 1, where, "earliest_session is required");
        if (item?.smoke !== undefined) check(typeof item.smoke === "boolean", where, "smoke must be boolean");
        if (item?.kind === "recall") {
          check(NORMALISE.includes(item?.normalise), where, `normalise is one of ${NORMALISE.join(", ")}`);
          check(array(item?.accept_sha256).length > 0
            && array(item.accept_sha256).every(hash => /^[0-9a-f]{64}$/.test(hash ?? "")), where,
            "accept_sha256 is a non-empty list of lowercase hex SHA-256 digests");
          if (item?.mode !== undefined) {
            check(["equals", "contains"].includes(item.mode), where, "mode is equals or contains");
            check(item.mode !== "contains", where, "contains mode leaks: a paste holding every candidate passes");
          }
        }
      }
      check(bank.filter(item => item?.smoke === true).length === 1, sealedPath,
        "exactly one smoke item per block, so a no-key smoke test burns nothing cold");

      // Replay the draws in session order. A short draw is a build failure.
      const seen = new Set();
      for (const {part, session} of withdrawParts.sort((left, right) => left.session - right.session)) {
        const want = part.item_kind === "cold_write" ? 1 : 3;
        const kind = part.item_kind ?? "recall";
        const eligible = bank.filter(item =>
          item?.kind === kind && item?.smoke !== true && item?.earliest_session <= session && !seen.has(item.id));
        check(eligible.length >= want, `${part.id}`,
          `needs ${want} unseen ${kind} item(s) at session ${session}; the bank offers ${eligible.length}`);
        for (const item of eligible.slice(0, want)) seen.add(item.id);
      }
      const spare = bank.filter(item =>
        item?.kind === "recall" && item?.smoke !== true && item.earliest_session <= AUTHORED_THROUGH && !seen.has(item.id));
      check(spare.length >= 3, sealedPath,
        `a failed check must be retakeable: ${spare.length} unseen recall items are left after sessions 1-${AUTHORED_THROUGH}, and a retake draws 3`);

      // §17.3 requires a variant on every lab, and session 1 declares none.
      const variants = array(sealed.variants);
      for (const variant of variants) {
        const where = `${sealedPath} variant ${variant?.after_part ?? "?"}`;
        keys(variant, ["after_part", "ask", "options", "correct", "explain"], where);
        check(partIds.has(variant?.after_part), where, "after_part names no authored part");
        check(text(variant?.ask), where, "ask is required");
        check(array(variant?.options).length >= 3 && array(variant.options).every(text), where, "at least three options");
        check(integer(variant?.correct) && variant.correct < array(variant?.options).length, where, "correct is a valid index");
      }
      for (const lab of labParts) {
        const declared = variants.some(variant => variant?.after_part === lab.id);
        if (lab.id === "s01-lab-a") check(!declared, sealedPath, "session 1 declares no variant (DESIGN §17.3)");
        else check(declared, sealedPath, `${lab.id} has no re-attempt variant; §17.3 requires one on every lab`);
      }
    }
  }

  // ---- what this validator deliberately does not yet check ----
  const missing = [1, 2, 3, 4, 5, 6].filter(index => !covered.has(index));
  notes.push(`coverage audit deferred: sessions 1-${AUTHORED_THROUGH} of 21 are authored, and learn items ${missing.join(", ") || "none"} are not covered yet. The union must be exactly six once A1 is complete.`);
  notes.push("not validated here: judge variants (no session in this slice draws one), cold_write receipts, the bug bank, capstone.json, and the per-skill gate sessions 4-21.");

  return {errors, notes, authored: AUTHORED_THROUGH};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {errors, notes, authored} = validateContent(process.argv[2] ? resolve(process.argv[2]) : process.cwd());
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`Content valid: A1 sessions 1-${authored}, all parts, 3 research pins verified.`);
    for (const note of notes) console.log(`  note — ${note}`);
  }
}
