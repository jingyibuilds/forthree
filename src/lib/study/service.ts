import "server-only";
import { evaluateBoard, readBoardSafe } from "./board";
import { environmentCommands, environmentReady, environmentReport, findPart, findSession, gatedPart, isSealed, labSealed, lastAuthoredSession, loadBlocks, publicPart, Located } from "./content";
import { gradeAll, matchesAccept } from "./grading";
import { bankItem, openLedger, ResurfaceItem, selectResurface } from "./resurface";
import { BankItem, CheckSlot, drawItems, itemById, loadSealed, variantFor } from "./sealed";
import { BARS, BLOCK_NAMES } from "./map";
import { KIND_LABEL, stepNames, stepsFor } from "./steps";
import { appendJsonl, readJson, readJsonl, transaction, writeJson } from "./store";
import { evaluateWires } from "./wires";
import { AttemptRecord, BarKey, CameBack, Part, Plan, RecallFile, Step, StudyError } from "./types";
// The teacher is reached through the engine, like everything the routes use.
export { annotate, followup } from "./teacher";

const defaultPlan = (): Plan => ({version: 1, current_session: 1, current_attempt: {}, next_checkpoint: 9, pull_checkpoint_forward: false});
const recordPath = (id: string, n: number) => `sessions/${id}-${n}.json`;
const now = () => new Date().toISOString();

async function planState(): Promise<Plan> {
  const plan = await readJson<Plan>("plan.json") ?? defaultPlan();
  if (!Number.isInteger(plan.current_session) || !plan.current_attempt || typeof plan.current_attempt !== "object") {
    throw new StudyError(500, "invalid_record", "plan.json has an unreadable study plan. No changes were made.");
  }
  return plan;
}

function legalAttempt(n: number) {
  if (!Number.isSafeInteger(n) || n < 1) throw new StudyError(404, "not_found");
}

async function readAttempt(id: string, n: number) {
  return readJson<AttemptRecord>(recordPath(id, n));
}

async function attemptsOf(id: string): Promise<AttemptRecord[]> {
  const plan = await planState();
  const current = plan.current_attempt[id] ?? 0;
  const records: AttemptRecord[] = [];
  for (let n = 1; n <= current; n += 1) {
    const record = await readAttempt(id, n);
    if (record) records.push(record);
  }
  return records;
}

async function existingAttempt(id: string, n: number) {
  legalAttempt(n);
  const plan = await planState();
  const current = plan.current_attempt[id] ?? 0;
  if (n > current) throw new StudyError(404, "not_found");
  const record = await readAttempt(id, n);
  if (!record) throw new StudyError(500, "missing_record", `${recordPath(id, n)} is missing. No replacement was written.`);
  if (record.part !== id || record.attempt !== n || !Array.isArray(record.task_predictions) || !Number.isInteger(record.max_step)) {
    throw new StudyError(500, "invalid_record", `${recordPath(id, n)} has an unreadable attempt. No changes were made.`);
  }
  return {record, plan};
}

/** §17.5's step is skipped, not shown empty, when the pools yield nothing. */
async function resurfaceFor(located: Located, record?: AttemptRecord | null) {
  if (located.part.kind === "interview") return [];
  const plan = await planState();
  const shown: string[] = [];
  const drawnThisSession: string[] = [...(record?.drawn ?? [])];
  for (const sibling of located.session.parts) {
    if (sibling.id === located.part.id) continue;
    const attempts = plan.current_attempt[sibling.id] ?? 0;
    for (let n = 1; n <= attempts; n += 1) {
      const other = await readAttempt(sibling.id, n);
      for (const id of other?.resurfaced ?? []) shown.push(id);
      for (const id of other?.drawn ?? []) drawnThisSession.push(id);
    }
  }
  return selectResurface(located.session.session, {
    part: located.part.id,
    items: record?.drawn ?? [],
    shown,
    drawnThisSession,
  });
}

async function steps(located: Located, record?: AttemptRecord | null) {
  // A finished attempt's rail must not change length behind her because
  // another part later filed a miss. What it ran is what it shows.
  if (record?.finished_at) {
    return {list: stepsFor(located.part, (record.resurfaced ?? []).length > 0), items: []};
  }
  // Once `From before` has been served for this attempt, what it showed is
  // fixed (LESSONS L-REC-01). Re-selecting on every request let her own answers
  // change the list under her, and recorded a list she never saw.
  if (record?.came_back) return {list: stepsFor(located.part, record.came_back.length > 0), items: []};
  const items = await resurfaceFor(located, record);
  const list = stepsFor(located.part, items.length > 0);
  // The `resurface` step appears and disappears with the pools, so a stored
  // step can fall out of the list — she clears the last open miss in another
  // tab, and the step she is standing on no longer exists. Stand her on the
  // nearest step that does rather than rendering a step with nothing in it.
  if (record && !list.includes(record.step)) {
    // Never land on `done`: that step is reached by the transition that writes
    // `finished_at`, and standing on it without having run it would draw a
    // finished screen over an unfinished record.
    record.max_step = Math.max(0, Math.min(record.max_step, list.length - 2));
    record.step = list[record.max_step];
  }
  return {list, items};
}

/**
 * Today offers an unstarted no-help check first, because it gates the rest of
 * the session — except where its bank holds nothing from an earlier session,
 * which is session 1. A check cannot be the first thing in the semester.
 */
async function checkGoesFirst(session: {session: number; parts: Part[]}, block: string) {
  const check = session.parts.find(part => part.kind === "withdraw");
  if (!check) return false;
  try {
    const bank = await loadSealed(block);
    return (bank.withdraw_bank ?? []).some(item => item.smoke !== true && item.earliest_session < session.session);
  } catch {
    return false;
  }
}

/** The parts of a session in the order Today offers them: the no-help check
 *  first once it has earlier sessions to ask about, last in session 1. */
async function offeredParts(session: {session: number; parts: Part[]}, block: string) {
  const first = await checkGoesFirst(session, block);
  const rank = (part: Part) => (part.kind === "withdraw" ? (first ? -1 : 1) : 0);
  return [...session.parts].sort((left, right) => rank(left) - rank(right));
}

async function everFinished(partId: string, plan: Plan) {
  const attempts = plan.current_attempt[partId] ?? 0;
  for (let n = 1; n <= attempts; n += 1) {
    if ((await readAttempt(partId, n))?.finished_at) return true;
  }
  return false;
}

/**
 * She can look at anything and she works in order (owner, 2026-11-10;
 * L-ORDER-05). A part can be *started* once every earlier session is done
 * and every part before it in its own session has been finished once. A part
 * she has already started is always open to her — to read, to finish, to run
 * again — and this is never asked of one.
 */
async function openToStart(located: Located, plan: Plan): Promise<{open: boolean; waits_for?: string}> {
  for (const block of await loadBlocks()) {
    for (const earlier of block.sessions) {
      if (earlier.session >= located.session.session) continue;
      if (!(await sessionState(earlier, plan)).ever) return {open: false, waits_for: `session ${earlier.session}`};
    }
  }
  for (const part of await offeredParts(located.session, located.block)) {
    if (part.id === located.part.id) break;
    if (!(await everFinished(part.id, plan))) return {open: false, waits_for: `“${partTitle(part)}”`};
  }
  return {open: true};
}

/** Every no-help check of one block, as the slots the bank is reserved for. */
async function checkSlots(block: string): Promise<CheckSlot[]> {
  const found = (await loadBlocks()).find(candidate => candidate.block === block);
  return (found?.sessions ?? []).flatMap(session => session.parts
    .filter(part => part.kind === "withdraw")
    .map(part => ({
      part: part.id, session: session.session,
      want: part.item_kind === "cold_write" ? 1 : 3,
      kind: part.item_kind ?? "recall" as "recall" | "cold_write",
    })));
}

/** Every bank id any try of any check has drawn, answered or not, plus every
 *  id with a recall row. */
async function usedItemIds(plan: Plan, slots: CheckSlot[]) {
  const used = new Set(Object.keys((await readJson<RecallFile>("recall.json"))?.items ?? {}));
  for (const slot of slots) {
    const attempts = plan.current_attempt[slot.part] ?? 0;
    for (let n = 1; n <= attempts; n += 1) {
      for (const id of (await readAttempt(slot.part, n))?.drawn ?? []) used.add(id);
    }
  }
  return used;
}

/**
 * A bank item's explanation states the idea its own session's lab asks her to
 * guess. A session's check comes before that session's lab, so the check
 * could hand it to her first — so it is withheld until that lab's guess is locked
 * (LESSONS L-ORDER-03).
 */
async function explainOf(item: BankItem, plan: Plan): Promise<{explain: string; explain_after?: number}> {
  // Held back until the lab of the session that TEACHES the item has its
  // guess locked. `earliest_session` is the first check that may ask it,
  // a session later once checks open their sessions (REBUILD.md R7), and
  // keying on it held explanations back a session too long.
  const taught = Math.max(0, ...(item.taught_by ?? []).map(ref => Number(/^s(\d{2})-/.exec(ref)?.[1] ?? 0)));
  const teachingSession = taught || item.earliest_session;
  const home = await findSession(teachingSession);
  const lab = home?.session.parts.find(part => part.kind === "lab" && part.predict);
  if (lab) {
    let sealed = false;
    const attempts = plan.current_attempt[lab.id] ?? 0;
    for (let n = 1; n <= attempts; n += 1) {
      if ((await readAttempt(lab.id, n))?.prediction?.sealed_at) sealed = true;
    }
    if (!sealed) return {explain: "", explain_after: teachingSession};
  }
  return {explain: item.explain};
}

async function openLedgerRow(checkId: string) {
  return (await readJsonl("ledger.jsonl") as unknown as {check_id: string; part: string}[])
    .filter(row => row?.check_id === checkId).pop();
}

const stored = (item: ResurfaceItem): CameBack => ({
  id: item.id, pool: item.pool, kind: item.kind, block: item.block,
  ...(item.part ? {part: item.part} : {}), ...(item.note ? {note: item.note} : {}), ...(item.cause ? {cause: item.cause} : {}),
});

/** Fix what `From before` shows, the first time it is shown. */
function fixCameBack(record: AttemptRecord, items: ResurfaceItem[]) {
  if (record.came_back) return;
  record.came_back = items.map(stored);
  record.resurfaced = items.map(item => item.id);
}

/** What `From before` showed in this attempt, with the words resolved and her
 *  answers attached. A record from before `came_back` existed has ids only. */
async function cameBackView(record: AttemptRecord, plan: Plan) {
  // A record written before `came_back` existed has the ids and nothing else:
  // not the pool, not the cause, not what she answered. It is shown as that —
  // `legacy` — and never rewritten.
  const legacy = !record.came_back;
  const entries: (CameBack & {legacy?: boolean})[] = record.came_back
    ?? (record.resurfaced ?? []).map(id => ({id, pool: "A" as const, kind: "recall" as const, block: record.block, legacy: true}));
  const view = [];
  for (const entry of entries) {
    const item = await bankItem(entry.block, entry.id);
    if (item) {
      const about = entry.answered ? await explainOf(item, plan) : {explain: ""};
      view.push({...entry, kind: "recall" as const, prompt: item.prompt,
        answered: entry.answered ? {...entry.answered, ...about} : undefined});
      continue;
    }
    // A legacy id that is not a bank item is a lab's check id; the lab is the
    // part that filed it.
    const filedBy = entry.part ?? (legacy ? (await openLedgerRow(entry.id))?.part : undefined);
    const predict = filedBy ? (await findPart(filedBy).catch(() => null))?.part.predict : undefined;
    if (!predict?.options?.length) continue;
    const right = predict.options[predict.correct];
    view.push({...entry, kind: "choice" as const, prompt: predict.ask, options: predict.options,
      // Wrong twice with the answer still hidden is a dead end, so a miss
      // here says what it was.
      answered: entry.answered
        ? {...entry.answered, explain: entry.answered.pass || !right ? "" : `It was: ${right}`}
        : undefined});
  }
  return view;
}

/**
 * Two questions about one session, and they differ after a re-run: `ever` is
 * whether every part has been finished at least once, which stays true;
 * `newest` is whether the try now on offer for every part is finished, which
 * is what moves Today on.
 */
async function sessionState(session: {parts: Part[]}, plan: Plan) {
  let ever = true, newest = true, started = false;
  for (const part of session.parts) {
    const attempts = plan.current_attempt[part.id] ?? 0;
    if (attempts) started = true;
    let finished = false;
    for (let n = 1; n <= attempts; n += 1) {
      if ((await readAttempt(part.id, n))?.finished_at) finished = true;
    }
    if (!finished) ever = false;
    if (!attempts || !(await readAttempt(part.id, attempts))?.finished_at) newest = false;
  }
  return {ever, newest, started};
}

/**
 * The session whose no-help check has been started and not finished, or null.
 * She can go back into any session she has done and run a part again, so
 * this looks at all of them: a check left open in session 1 must quiet the
 * assistant on session 3's lab too, or the lab becomes the way round it.
 */
async function openCheckSession(plan: Plan): Promise<number | null> {
  for (const block of await loadBlocks()) {
    for (const session of block.sessions) {
      for (const part of session.parts) {
        if (part.ai_allowed !== false) continue;
        const attempts = plan.current_attempt[part.id] ?? 0;
        for (let n = 1; n <= attempts; n += 1) {
          const started = await readAttempt(part.id, n);
          if (started && !started.finished_at) return session.session;
        }
      }
    }
  }
  return null;
}

/**
 * `sessionNumber` is the session she asked to open; without one it is the
 * session Today is on. Any written session opens — to go over again, or to
 * start early — and opening one changes nothing in the record.
 */
export async function getStudyOverview(sessionNumber?: number) {
  return transaction(async () => {
    const plan = await planState();
    // A damaged board.json costs the board, not the ledger, the receipts or
    // the timings — so Today still renders, and says so.
    const boardDamaged = (await readBoardSafe()).damaged;
    const last = await lastAuthoredSession();
    const authored = (await loadBlocks()).flatMap(block => block.sessions).sort((left, right) => left.session - right.session);
    const sessions = [];
    for (const entry of authored) {
      const state = await sessionState(entry, plan);
      sessions.push({session: entry.session, title: entry.title, done: state.ever});
    }
    const viewing = sessionNumber ?? plan.current_session;
    const found = await findSession(viewing);
    if (!found && sessionNumber !== undefined) throw new StudyError(404, "not_found");
    if (!found) {
      // Two different ends, and only one of them is the end of the semester.
      // Past the last authored session is the state she is actually in on the
      // third evening, and it stays that way until session 4 is written.
      return {
        plan, board_damaged: boardDamaged, sessions, viewing: null,
        completed: plan.current_session > 21, unwritten: plan.current_session <= 21,
        authored_through: last, session: null, parts: [], wires: [],
        done_sessions: (await loadBlocks()).flatMap(block => block.sessions)
          .filter(entry => entry.session < plan.current_session)
          .map(entry => ({session: entry.session, title: entry.title})),
      };
    }
    const first = await checkGoesFirst(found.session, found.block);
    const ordered = await offeredParts(found.session, found.block);
    const parts = [];
    for (const part of ordered) {
      const n = plan.current_attempt[part.id] ?? 0;
      const record = n ? await readAttempt(part.id, n) : null;
      const located: Located = {part, session: found.session, block: found.block, bars: found.bars};
      const {list} = await steps(located, record);
      const index = record ? Math.max(0, Math.min(list.indexOf(record.step), list.length - 2)) : 0;
      parts.push({
        id: part.id,
        kind: part.kind,
        kind_label: KIND_LABEL[part.kind],
        title: partTitle(part),
        minutes: Object.values(part.minutes ?? {}).reduce((total, value) => total + value, 0),
        finished: !!record?.finished_at,
        // The web trial's escape: finished, and the lab behind it was not run.
        lab_skipped: !!record?.lab_skipped_at,
        // A record exists the moment she opens a part, so it is "in
        // progress" from then on. Keying this on a step having been left made
        // a no-help check with one of three answered read "Start", because
        // all its answers sit on its first step.
        started: !!record && !record.finished_at,
        // Whether she can go into it: anything she has opened before, and
        // the next part in order. Everything else can be looked at on the
        // card and is not started from it.
        open: !!record || (await openToStart({part, session: found.session, block: found.block, bars: found.bars}, plan)).open,
        step: index + 1,
        step_total: list.length - 1,
        // In her words, for the resume line: "Step 1 of 4 — the questions".
        step_name: stepNames(part, list)[index] ?? "",
        attempt: n || 1,
      });
    }
    const blocks = await loadBlocks();
    const finishedChecks = new Set<number>();
    for (const candidate of blocks.flatMap(block => block.sessions)) {
      for (const part of candidate.parts) {
        if (part.kind !== "withdraw") continue;
        const attempts = plan.current_attempt[part.id] ?? 0;
        for (let n = 1; n <= attempts; n += 1) {
          if ((await readAttempt(part.id, n))?.finished_at) finishedChecks.add(candidate.session);
        }
      }
    }
    // A warning is about where she is in the semester, so it is printed on
    // Today's session and nowhere else.
    const isToday = viewing === plan.current_session;
    const wires = isToday
      ? await evaluateWires(blocks.flatMap(block => block.sessions), plan.current_session, finishedChecks)
      : [];
    if (wires.length && !plan.pull_checkpoint_forward) {
      plan.pull_checkpoint_forward = true;
      await writeJson("plan.json", plan);
    }
    return {
      plan,
      board_damaged: boardDamaged,
      sessions,
      // What the card says when it is not Today's: whether this one is done,
      // and which earlier sessions are not — because from session 2 on, a
      // session's no-help check asks about the sessions before it.
      viewing: {
        is_today: isToday,
        today: plan.current_session,
        done: sessions.find(entry => entry.session === viewing)?.done ?? false,
        // Done once, and a part of it is being run again: "you have done this
        // one" alone was false of the card it sat on.
        again: (sessions.find(entry => entry.session === viewing)?.done ?? false) && parts.some(part => !part.finished),
        earlier_open: sessions.filter(entry => entry.session < viewing && !entry.done).map(entry => entry.session),
      },
      completed: false,
      authored_through: last,
      session: {
        session: found.session.session, title: found.session.title, subtitle: found.session.subtitle,
        block: found.block, block_name: found.name, covers: found.session.covers,
        check_first: first,
      },
      parts,
      wires,
    };
  });
}

// Two of the three rows the demo prints are the kind's own standing name; only
// a lab needs a line of its own, which it authors as `shows` (§14.2 addendum).
/**
 * Today expands one part — the session's main work — and lists the rest. This
 * is a read: it never creates an attempt record, because opening Today is not
 * starting a session.
 */
export async function getToday(sessionNumber?: number) {
  const overview = await getStudyOverview(sessionNumber);
  // §1.1's report reads the machine, never the store, so it runs outside the
  // transaction: holding one global lock for the length of a subprocess made
  // every other request wait, and the waiter gives up at five seconds.
  // The report is about this machine today, so it is Today's: a session opened
  // from the map to go over again does not run a subprocess to say so.
  const environment = overview.session && !overview.viewing?.is_today ? null
    : {ready: await environmentReady(), report: await environmentReport(), ...environmentCommands()};
  if (!overview.session) return {...overview, main: null, main_record: null};
  const found = await findSession(overview.session.session);
  const main = found!.session.parts.find(part => part.kind === "lab") ?? found!.session.parts[0];
  const located: Located = {part: main, session: found!.session, block: found!.block, bars: found!.bars};
  return transaction(async () => {
    const plan = await planState();
    const n = plan.current_attempt[main.id] ?? 0;
    const record = n ? await readAttempt(main.id, n) : null;
    const {list} = await steps(located, record);
    return {
      ...overview,
      // §1.1: the check is shown, never enforced — a broken environment in
      // session 1 is the lesson, not an error state.
      environment,
      // A finished attempt's rail comes from what it ran, so take the frozen
      // list rather than today's pools — `steps()` returns no items for one.
      main: await publicPart(located, record, list.includes("resurface")),
      assistant: await assistantRule(plan, located, record, "followup"),
      main_record: record
        ? {step: record.step, max_step: record.max_step, finished_at: record.finished_at, sealed: !!record.prediction?.sealed_at, mental_model: record.mental_model}
        : null,
      main_attempt: n || 1,
    };
  });
}

function partTitle(part: Part) {
  if (part.shows) return part.shows;
  if (part.kind === "withdraw") return "No-help check";
  if (part.kind === "interview") return "Talk through someone else\u2019s code";
  if (part.kind === "teardown") return `Take ${part.product ?? part.anatomy_example} apart`;
  return "The lab";
}

export async function getAttempt(id: string, n: number) {
  const located = await findPart(id);
  return transaction(async () => {
    legalAttempt(n);
    const plan = await planState();
    const current = plan.current_attempt[id] ?? 0;
    if (n > current + 1) throw new StudyError(404, "not_found");
    if (n <= current) {
      const {record} = await existingAttempt(id, n);
      const {list, items} = await steps(located, record);
      // Standing on `From before` fixes what it shows, if a transition from
      // before this field existed did not.
      if (record.step === "resurface" && !record.finished_at && !record.came_back) {
        fixCameBack(record, items);
        await writeJson(recordPath(id, n), record);
      }
      // A finished attempt is read-only and always opens on its done screen
      // (L-REC-03). Going back over its steps is the runner's own navigation
      // and writes nothing, so everything a step needs is served at once.
      const finished = !!record.finished_at;
      return {
        part: await publicPart(located, record, list.includes("resurface")),
        record: finished ? {...record, step: "done" as Step} : record,
        attempt: n, attempts_total: current, today_session: plan.current_session,
        resurface: finished || record.step === "resurface" ? await cameBackView(record, plan) : [],
        summary: finished || record.step === "done" ? await summaryFor(located) : null,
        assistant: await assistantRule(plan, located, record, "followup"),
      };
    }
    // Starting a part for the first time is the one thing order decides.
    if (current === 0) {
      const gate = await openToStart(located, plan);
      if (!gate.open) {
        throw new StudyError(409, "not_open_yet", `This part opens once ${gate.waits_for} is finished. You can look at it on its session’s card until then.`);
      }
    }
    const {list} = await steps(located, null);
    const timestamp = now();
    // An orphan written before a process died updating plan is retained.
    let record = await readAttempt(id, n);
    if (!record) {
      record = {
        version: 1, part: id, session: located.session.session, block: located.block, attempt: n,
        started_at: timestamp, step_entered_at: timestamp, step: list[0], max_step: 0,
        task_predictions: (located.part.tasks ?? []).map(() => ({})), finished_at: null,
      };
      if (located.part.kind === "withdraw") {
        const bank = await loadSealed(located.block);
        const slots = await checkSlots(located.block);
        const slot = slots.find(candidate => candidate.part === id)!;
        record.drawn = drawItems(bank.withdraw_bank ?? [], slot, slots, await usedItemIds(plan, slots), n === 1);
        record.items = [];
      }
      await writeJson(recordPath(id, n), record);
    }
    plan.current_attempt[id] = n;
    await writeJson("plan.json", plan);
    const fresh = await steps(located, record);
    return {
      part: await publicPart(located, record, fresh.list.includes("resurface")),
      record, attempt: n, attempts_total: n, today_session: plan.current_session, resurface: [], summary: null,
      assistant: await assistantRule(plan, located, record, "followup"),
    };
  });
}

export async function getBeyondPrediction(id: string, n: number) {
  const located = await findPart(id);
  // An interview has no gated half and §17.1 says it never calls this route.
  if (located.part.kind === "interview") throw new StudyError(404, "not_found");
  return transaction(async () => {
    const {record, plan} = await existingAttempt(id, n);
    const {list} = await steps(located, record);
    const part = await gatedPart(located, record, list.includes("resurface"));
    // §17.1: a withdraw's gated half is her answers against the drawn items'
    // meaning — never the hashed accept list, which stays on the server.
    let answers = undefined;
    if (located.part.kind === "withdraw") {
      const bank = await loadSealed(located.block);
      answers = [];
      for (const entry of record.items ?? []) {
        const item = itemById(bank, entry.item_id);
        answers.push({
          item_id: entry.item_id,
          prompt: item?.prompt ?? "",
          ...(item ? await explainOf(item, plan) : {explain: ""}),
          answer: entry.answer,
          pass: entry.pass,
        });
      }
    }
    const variant = located.part.kind === "lab" ? variantFor(await loadSealed(located.block), id) : undefined;
    return {
      part,
      items: answers,
      variant: variant ? {ask: variant.ask, options: variant.options} : null,
      variant_result: record.variant_result ?? null,
    };
  });
}

export async function getItem(id: string, n: number, k: number) {
  const located = await findPart(id);
  if (located.part.kind !== "withdraw") throw new StudyError(404, "not_found");
  return transaction(async () => {
    const {record} = await existingAttempt(id, n);
    const drawn = record.drawn ?? [];
    if (!Number.isInteger(k) || k < 0 || k >= drawn.length) throw new StudyError(404, "not_found");
    const bank = await loadSealed(located.block);
    const item = itemById(bank, drawn[k]);
    if (!item) throw new StudyError(500, "missing_item", "A drawn item is no longer in the bank. No record was changed.");
    const answered = record.items?.find(entry => entry.item_id === item.id);
    return {
      index: k, total: drawn.length, item_id: item.id, prompt: item.prompt,
      receipt_commands: item.kind === "cold_write" ? item.receipt_commands : undefined,
      answered: answered ? {answer: answered.answer, pass: answered.pass} : null,
    };
  });
}

async function summaryFor(located: Located) {
  // A damaged board costs the board screen, not the end of a part.
  const {board, damaged} = await readBoardSafe();
  const blocks = await loadBlocks();
  const block = blocks.find(candidate => candidate.block === located.block)!;
  const row = board[located.block] as Record<string, {state: string; at_session: number | null}>;
  const moved = (["judge", "build"] as BarKey[])
    .filter(bar => row[bar]?.at_session === located.session.session)
    .map(bar => ({label: block.bars[bar].label, says: block.bars[bar].says, state: row[bar].state}));
  const nextGate = Math.min(...(["judge", "build"] as BarKey[])
    .flatMap(bar => [block.bars[bar].borrowed_gate, block.bars[bar].own_gate])
    .filter(session => session > located.session.session));
  // The part-done screen is a dead end without this: Today knows what is next,
  // and the screen she is standing on did not.
  const plan = await planState();
  let nextPart: {id: string; title: string} | null = null;
  for (const sibling of located.session.parts) {
    if (sibling.id === located.part.id) continue;
    const attempts = plan.current_attempt[sibling.id] ?? 0;
    const record = attempts ? await readAttempt(sibling.id, attempts) : null;
    if (!record?.finished_at) { nextPart = {id: sibling.id, title: partTitle(sibling)}; break; }
  }
  return {
    moved,
    board_damaged: damaged,
    next_part: nextPart,
    next_gate: Number.isFinite(nextGate) ? nextGate : null,
    board: (["A1", "A2", "A3", "A4"] as string[]).map(id => {
      const bars = blocks.find(candidate => candidate.block === id)?.bars ?? BARS[id];
      const states = board[id] as Record<string, {state: string}>;
      return {
        block: id,
        name: BLOCK_NAMES[id],
        skills: (["judge", "build"] as BarKey[]).map(bar => ({
          label: bars[bar].label,
          says: bars[bar].says,
          state: states?.[bar]?.state ?? "none",
        })),
      };
    }),
  };
}

function objectBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new StudyError(422, "invalid_body");
  return body as Record<string, unknown>;
}

function keysOnly(body: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(body).some(key => !allowed.includes(key))) throw new StudyError(422, "invalid_body");
}

function requireEditable(record: AttemptRecord) {
  if (record.passed_at) throw new StudyError(409, "already_passed");
  // The web trial's escape is terminal for the attempt it was used in: the
  // UI closes the paste box, and so does the engine, or one call past it
  // would set `passed_at` on a lab that was never run (PUBLISH.md §6).
  if (record.lab_skipped_at) throw new StudyError(409, "already_skipped");
}

function text(value: unknown, limit: number) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= limit;
}

/**
 * What follows the last part of a session being finished: the board's gates
 * are evaluated and, if it is Today's session, Today moves on. Decided from
 * the newest try of every part — a part being run again is not finished — so
 * repeating `done` on an older try moves nothing.
 */
async function settleSession(session: {session: number; parts: Part[]}, plan: Plan) {
  if (!(await sessionState(session, plan)).newest) return;
  await evaluateBoard(session.session, attemptsOf);
  if (plan.current_session !== session.session) return;
  plan.current_session = session.session + 1;
  // She may have done a later session early. Today moves to the first
  // session that still has something to do, not onto one already finished.
  for (;;) {
    const ahead = await findSession(plan.current_session);
    if (!ahead || !(await sessionState(ahead.session, plan)).newest) break;
    plan.current_session += 1;
  }
  await writeJson("plan.json", plan);
}

export async function mutateAttempt(id: string, n: number, action: string[], input: unknown) {
  const located = await findPart(id);
  const {part, session} = located;
  const body = objectBody(input);
  return transaction(async () => {
    const {record, plan} = await existingAttempt(id, n);
    const {list, items: resurfaceItems} = await steps(located, record);
    const timestamp = now();
    const target = action.join("/");
    let extra: Record<string, unknown> = {};

    // A finished attempt is read-only (L-REC-03). Nothing accepts a new
    // answer, and going back over its steps writes nothing: the runner
    // navigates a finished attempt on its own. The one write allowed is the
    // repeat of `step: done`, which repairs a plan left behind by an
    // interrupted finish.
    if (record.finished_at) {
      if (target !== "step") throw new StudyError(409, "already_finished");
      keysOnly(body, ["step"]);
      if (!list.includes(body.step as Step)) throw new StudyError(422, "invalid_body");
      if (body.step !== "done") return {record};
      // The repeat of `done` repairs a plan left behind by an interrupted
      // finish — the board and Today — and leaves the record as it is.
      await settleSession(session, plan);
      return {record, summary: await summaryFor(located)};
    }

    if (target === "seal") {
      keysOnly(body, ["choice", "value", "why"]);
      if (!part.predict) throw new StudyError(422, "invalid_body");
      if (record.prediction?.sealed_at) throw new StudyError(409, "already_sealed");
      requireEditable(record);
      if (body.why !== undefined && (typeof body.why !== "string" || body.why.length > 5000)) throw new StudyError(422, "invalid_body");
      let choice: number | null = null;
      let value: number | null = null;
      if (part.predict.type === "choice") {
        const options = part.predict.options ?? [];
        if (!Number.isInteger(body.choice) || (body.choice as number) < 0 || (body.choice as number) >= options.length) throw new StudyError(422, "invalid_body");
        choice = body.choice as number;
      } else {
        if (typeof body.value !== "number" || !Number.isFinite(body.value)) throw new StudyError(422, "invalid_body");
        value = body.value;
      }
      record.prediction = {choice, value, why: (body.why as string) ?? "", sealed_at: timestamp};
      const correct = part.predict.type === "choice"
        ? choice === part.predict.correct
        : part.predict.magnitude === true
          ? Math.abs(Math.log10((value as number) / part.predict.correct)) <= 1
          : value === part.predict.correct;
      record.predict_result = {correct, graded_at: timestamp};

    } else if (action.length === 3 && action[0] === "item" && /^\d+$/.test(action[1]) && action[2] === "seal") {
      keysOnly(body, ["text", "receipt"]);
      if (part.kind !== "withdraw") throw new StudyError(404, "not_found");
      const k = Number(action[1]);
      const drawn = record.drawn ?? [];
      if (k < 0 || k >= drawn.length) throw new StudyError(404, "not_found");
      if (record.items?.some(entry => entry.item_id === drawn[k])) throw new StudyError(409, "already_sealed");
      const bank = await loadSealed(located.block);
      const item = itemById(bank, drawn[k]);
      if (!item || item.kind !== "recall") throw new StudyError(422, "invalid_body");
      if (!text(body.text, 5000)) throw new StudyError(422, "invalid_body");
      const answer = body.text as string;
      const pass = matchesAccept(answer, item);
      record.items = [...(record.items ?? []), {item_id: item.id, answer, pass, sealed_at: timestamp}];
      // §17.4: the recall row is written here, not at `record`, so an item is
      // never re-servable after an abandoned part.
      const recall = await readJson<RecallFile>("recall.json") ?? {version: 1 as const, items: {}};
      const previous = recall.items[item.id];
      recall.items[item.id] = {
        block: located.block, kind: item.kind,
        times_seen: (previous?.times_seen ?? 0) + 1,
        last_seen_session: session.session,
        last_result: pass ? "pass" : "fail",
      };
      await writeJson("recall.json", recall);
      if (record.items.length === drawn.length) {
        const all = record.items.every(entry => entry.pass);
        if (all) record.passed_at ??= timestamp;
        record.checks = record.items.map(entry => ({id: entry.item_id, pass: entry.pass, message: entry.pass ? "Accepted." : "Not accepted."}));
      }
      extra = {pass, verdict: record.items.length === drawn.length ? record.items.every(entry => entry.pass) : null};

    } else if (target === "receipt") {
      keysOnly(body, ["raw"]);
      if (part.kind !== "lab") throw new StudyError(404, "not_found");
      if (!isSealed(part, record)) throw new StudyError(409, "not_sealed");
      requireEditable(record);
      if (record.max_step < list.indexOf("attempt")) throw new StudyError(409, "step_not_reached");
      if (typeof body.raw !== "string" || !body.raw.trim() || body.raw.length > 100000) throw new StudyError(422, "invalid_body");
      if (!record.task_predictions.some(task => task.did_pass !== undefined)) throw new StudyError(409, "task_not_marked");
      const checks = gradeAll(part, {stdout: body.raw});
      if (!checks.length) throw new StudyError(422, "unsupported_check");
      record.receipt_raw = body.raw;
      record.checks = checks;
      if (checks.every(check => check.pass)) record.passed_at = timestamp;
      // Validate all files before writing any side effect; a corrupt receipt
      // must never be silently overwritten by a later submission.
      await readJson(`receipts/${id}-${n}.json`);
      await writeJson(`receipts/${id}-${n}.json`, {version: 1, raw: body.raw, parsed: {stdout: body.raw}, checks, submitted_at: timestamp} as {version: 1});
      for (const check of checks.filter(check => !check.pass)) {
        await appendJsonl("ledger.jsonl", {ts: timestamp, part: id, block: record.block, attempt: n, check_id: check.id, mental_model: null, note: check.message, times_seen: 0, cleared: false});
      }

    } else if (target === "skip-lab") {
      // The web trial's one escape (PUBLISH.md §6). The labs are run in a real
      // terminal against the course's own Python, and a web page has neither,
      // so a visitor can move past one — and the record keeps that it was not
      // run, so nothing downstream can mistake it for a pass. Her own copy has
      // no such door: there the lab is the session.
      if (process.env.FORTHREE_MODE !== "web") throw new StudyError(404, "not_found");
      keysOnly(body, []);
      if (part.kind !== "lab") throw new StudyError(404, "not_found");
      if (!isSealed(part, record)) throw new StudyError(409, "not_sealed");
      if (record.max_step < list.indexOf("attempt")) throw new StudyError(409, "step_not_reached");
      if (record.passed_at) throw new StudyError(409, "already_passed");
      // Not `requireEditable`: this is the call that makes the attempt
      // uneditable, so asking it a second time is a no-op, not a refusal.
      record.lab_skipped_at ??= timestamp;

    } else if (action.length === 2 && action[0] === "task" && /^\d+$/.test(action[1])) {
      keysOnly(body, ["will_pass", "did_pass"]);
      if (!isSealed(part, record)) throw new StudyError(409, "not_sealed");
      requireEditable(record);
      const index = Number(action[1]);
      const task = part.tasks?.[index];
      if (!task) throw new StudyError(404, "not_found");
      if (!Object.keys(body).length || Object.values(body).some(value => typeof value !== "boolean")) throw new StudyError(422, "invalid_body");
      const stored = record.task_predictions[index];
      if (body.will_pass !== undefined) {
        if (task.guess !== true) throw new StudyError(422, "invalid_body");
        if (stored.will_pass !== undefined) throw new StudyError(409, "already_predicted");
        stored.will_pass = body.will_pass as boolean;
      }
      if (body.did_pass !== undefined) {
        if (task.guess === true && stored.will_pass === undefined) throw new StudyError(409, "task_not_predicted");
        stored.did_pass = body.did_pass as boolean;
      }
      await writeJson(recordPath(id, n), record);
      return {record, passes_when: task.passes_when, task_prediction: stored};

    } else if (target === "answers") {
      if (part.kind === "teardown") {
        keysOnly(body, ["recall", "picked"]);
        const free = objectBody(body.recall ?? {});
        const allowed = part.size === "simple" ? ["parts"] : ["parts", "flow", "tricky"];
        keysOnly(free, allowed);
        if (Object.values(free).some(value => typeof value !== "string" || (value as string).length > 20000)) throw new StudyError(422, "invalid_body");
        const picked = body.picked === undefined ? [] : body.picked;
        if (!Array.isArray(picked) || picked.some(value => !Number.isInteger(value))) throw new StudyError(422, "invalid_body");
        record.answers = {recall: free, picked};
      } else if (part.kind === "interview") {
        keysOnly(body, ["q1", "q2", "q3"]);
        if (Object.values(body).some(value => typeof value !== "string" || (value as string).length > 20000)) throw new StudyError(422, "invalid_body");
        record.answers = {...(record.answers ?? {}), ...body};
        record.passed_at ??= timestamp;
        await appendJsonl(`notes/${id}.jsonl`, {ts: timestamp, part: id, attempt: n, answers: record.answers, model: null});
      } else throw new StudyError(422, "invalid_body");

    } else if (target === "variant") {
      keysOnly(body, ["choice"]);
      if (part.kind !== "lab") throw new StudyError(404, "not_found");
      if (record.max_step < list.indexOf("compare")) throw new StudyError(409, "step_not_reached");
      const variant = variantFor(await loadSealed(located.block), id);
      if (!variant) throw new StudyError(404, "not_found");
      if (!Number.isInteger(body.choice) || (body.choice as number) < 0 || (body.choice as number) >= variant.options.length) throw new StudyError(422, "invalid_body");
      if (record.variant_result) throw new StudyError(409, "already_sealed");
      record.variant_result = {choice: body.choice as number, pass: body.choice === variant.correct, at: timestamp};
      extra = {pass: record.variant_result.pass};

    } else if (target === "step") {
      keysOnly(body, ["step"]);
      const next = list.indexOf(body.step as Step);
      if (next < 0) throw new StudyError(422, "invalid_body");
      if (next > record.max_step + 1) throw new StudyError(409, "step_not_reached");
      const after = (step: Step) => { const at = list.indexOf(step); return at >= 0 && next > at; };
      if (after("predict") && !record.prediction?.sealed_at) throw new StudyError(409, "not_sealed");
      if (after("attempt")) {
        if (!isSealed(part, record)) throw new StudyError(409, "not_sealed");
        // A lab is finished by a receipt that graded. On the web trial it can
        // also be moved past unrun, and the record says which it was.
        if (part.kind === "lab" && !record.passed_at && !record.lab_skipped_at) throw new StudyError(409, "receipt_not_accepted");
        if (part.kind === "teardown" && part.scored && !record.answers) throw new StudyError(409, "answers_required");
      }
      // An interview is about a program. While that program is withheld — it
      // shows what this session's lab asks her to guess — the interview
      // cannot be finished: question 3 cannot be answered without it, and
      // finishing was the way round the lock (L-GATE-04).
      if (body.step === "done" && part.kind === "interview" && !(await labSealed(located))) {
        throw new StudyError(409, "program_locked");
      }
      // A timing row is written last, after everything that can refuse this
      // transition. Going back over a finished attempt never gets here: the
      // guard at the top returned, because that is reading, not work
      // (LESSONS L-TIME-01).
      const timing = body.step !== record.step ? {
        ts: timestamp, part: id, session: record.session, attempt: n, step: record.step,
        estimate_min: part.minutes?.[record.step as keyof typeof part.minutes] ?? 0,
        actual_min: Math.max(0, (Date.parse(timestamp) - Date.parse(record.step_entered_at)) / 60000),
      } : null;
      if (body.step !== record.step) {
        record.step = body.step as Step;
        record.step_entered_at = timestamp;
        record.max_step = Math.max(record.max_step, next);
      }
      // What `From before` shows is fixed by the transition that first shows
      // it, and `resurfaced` with it — not recomputed at `done`, after her
      // answers have changed the pools.
      if (body.step === "resurface") fixCameBack(record, resurfaceItems);
      if (body.step === "done") {
        record.finished_at ??= timestamp;
        // What she missed is filed when the part ends, where the record step
        // used to file it: a no-help check's missed items, or a lab's guess,
        // right or not. A miss comes back in a later session with its answer;
        // nothing asks her why she missed (REBUILD.md, R2).
        if (part.kind === "lab" || part.kind === "withdraw") {
          const failed = record.checks?.filter(check => !check.pass) ?? [];
          const targets = failed.length ? failed.map(check => check.id) : part.kind === "lab" ? [`${id}-prediction`] : [];
          for (const checkId of targets) {
            await appendJsonl("ledger.jsonl", {
              ts: timestamp, part: id, block: record.block, attempt: n, check_id: checkId,
              mental_model: null, note: "", times_seen: 0,
              cleared: failed.length === 0 && record.predict_result?.correct !== false,
            });
          }
        }
        // Record the finish first, so a plan never claims completion before
        // the evidence exists.
        await writeJson(recordPath(id, n), record);
        await settleSession(session, plan);
        extra = {summary: await summaryFor(located)};
      }
      if (timing) await appendJsonl("timing.jsonl", timing);

    } else throw new StudyError(404, "not_found");

    await writeJson(recordPath(id, n), record);
    return {record, ...extra};
  });
}

/**
 * §17.5's pool-A clear and pool-B showing. The pool is decided at selection
 * time and sent back with the answer: the same id can be a row in both
 * `recall.json` and the ledger — every drawn item gets a recall row, pass or
 * fail — so guessing the pool from the files silently routed every cold-check
 * miss to the wrong branch and cleared nothing. Nothing is ever cleared by a
 * tap; both pools grade a real answer.
 */
export async function postResurface(itemId: string, input: unknown) {
  const body = objectBody(input);
  keysOnly(body, ["pool", "text", "choice", "part", "attempt"]);
  if (body.pool !== "A" && body.pool !== "B") throw new StudyError(422, "invalid_body");
  if (typeof body.part !== "string" || !Number.isInteger(body.attempt)) throw new StudyError(422, "invalid_body");
  // The answer belongs to the part that showed the question: it is stored on
  // that attempt, and the session it counts for is that part's, not Today's.
  const located = await findPart(body.part);
  return transaction(async () => {
    const {record} = await existingAttempt(body.part as string, body.attempt as number);
    const entry = record.came_back?.find(candidate => candidate.id === itemId && candidate.pool === body.pool);
    if (!entry) throw new StudyError(404, "not_found");
    if (record.finished_at || entry.answered) throw new StudyError(409, "already_recorded");
    const plan = await planState();
    const timestamp = now();
    const recall = await readJson<RecallFile>("recall.json") ?? {version: 1 as const, items: {}};
    const ledger = await openLedger();
    const row = ledger.find(candidate => candidate.check_id === itemId);
    const seen = recall.items[itemId];

    // A bank item, in either pool: grade the typed answer the way the no-help
    // check grades it, and let the result decide whether the miss is cleared.
    const item = await bankItem(entry.block, itemId);
    if (item && item.kind === "recall") {
      if (!text(body.text, 5000)) throw new StudyError(422, "invalid_body");
      // Everything this branch needs is validated before it writes anything:
      // a pool-A clear with no ledger row must not still bump the recall row.
      if (body.pool === "A" && !row) throw new StudyError(404, "not_found");
      const pass = matchesAccept(body.text as string, item);
      if (seen) {
        recall.items[itemId] = {
          ...seen,
          times_seen: seen.times_seen + 1,
          last_seen_session: located.session.session,
          last_result: pass ? "pass" : "fail",
        };
        await writeJson("recall.json", recall);
      }
      if (body.pool === "A" && row) {
        await appendJsonl("ledger.jsonl", {
          ts: timestamp, part: row.part, block: row.block, check_id: itemId,
          mental_model: row.mental_model, note: row.note ?? "", times_seen: (row.times_seen ?? 0) + 1, cleared: pass,
        });
      }
      // One she had right and now misses has to come back. Without a ledger
      // row it would sit in neither pool and never return.
      if (body.pool === "B" && !pass) {
        await appendJsonl("ledger.jsonl", {
          ts: timestamp, part: body.part, block: entry.block, check_id: itemId,
          mental_model: null, note: "", times_seen: 1, cleared: false,
        });
      }
      entry.answered = {pass, text: body.text as string, at: timestamp};
      await writeJson(recordPath(record.part, record.attempt), record);
      return {pool: body.pool, pass, cleared: body.pool === "A" ? pass : undefined, ...(await explainOf(item, plan))};
    }

    // Otherwise it is a lab's own check, re-asked as that part's prediction.
    if (body.pool !== "A" || !row) throw new StudyError(404, "not_found");
    const asked = await findPart(row.part).catch(() => null);
    const predict = asked?.part.predict;
    if (!predict || !Number.isInteger(body.choice)) throw new StudyError(422, "invalid_body");
    const pass = predict.correct === body.choice;
    // Every open row that lab filed resolves to this one question — a missed
    // guess, and each paste that was sent back. They are answered together,
    // so one question is not asked once per row.
    for (const other of ledger) {
      if (other.part !== row.part || other.cleared || await bankItem(other.block, other.check_id)) continue;
      await appendJsonl("ledger.jsonl", {
        ts: timestamp, part: other.part, block: other.block, check_id: other.check_id,
        mental_model: other.mental_model, note: other.note ?? "", times_seen: (other.times_seen ?? 0) + 1, cleared: pass,
      });
    }
    entry.answered = {pass, choice: body.choice as number, at: timestamp};
    await writeJson(recordPath(record.part, record.attempt), record);
    // Wrong twice about the same belief, with the right answer still hidden,
    // is a dead end, so a miss here says which option it was.
    const right = predict.options?.[predict.correct];
    return {pool: "A", pass, cleared: pass, explain: pass || !right ? undefined : `It was: ${right}`};
  });
}

export function assertLocalRequest(request: Request, mutation = true) {
  // The public web trial is served from a real host, so loopback is the wrong
  // test there (PUBLISH.md §6). What still holds is that another site cannot
  // drive it: a cross-site request is refused, and a mutation must carry this
  // site's own Origin. There is no account and no cookie, so there is nothing
  // for a forged request to reach that the visitor does not already have.
  if (process.env.FORTHREE_MODE === "web") {
    const site = request.headers.get("sec-fetch-site");
    if (site && site !== "same-origin" && site !== "none") throw new StudyError(403, "origin_rejected");
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (mutation && (!origin || !host)) throw new StudyError(403, "origin_rejected");
    if (origin && host && new URL(origin).host !== host) throw new StudyError(403, "origin_rejected");
    return;
  }
  const url = new URL(request.url);
  const local = new Set(["localhost", "127.0.0.1", "[::1]"]);
  if (!local.has(url.hostname)) throw new StudyError(403, "local_only");
  // Next may normalize Request.url to localhost when the browser connected to
  // 127.0.0.1. Host preserves the browser's actual authority; validate it before
  // comparing Origin, so loopback aliases work without accepting foreign sites.
  let authority: URL;
  try { authority = new URL(`${url.protocol}//${request.headers.get("host") ?? url.host}`); }
  catch { throw new StudyError(403, "local_only"); }
  if (!local.has(authority.hostname) || authority.pathname !== "/" || authority.username || authority.password) throw new StudyError(403, "local_only");
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site") throw new StudyError(403, "origin_rejected");
  // Browsers always provide Origin on JSON POSTs. CLI callers may omit it,
  // but an explicit foreign/null origin can never mutate local records.
  if ((mutation || origin) && origin && origin !== authority.origin) throw new StudyError(403, "origin_rejected");
}

// §8's two route-level locks, and they are server-side. The window is derived
// from state the client cannot choose.
const FEATURES = ["annotate", "followup", "extra_variant", "devils_advocate", "interview"];

type AssistantState = {open: boolean; reason: string; session?: number};

/**
 * The one rule for whether the assistant may answer (LESSONS L-ASK-01). Every
 * screen that draws the control and the route that answers both call this, so
 * a control cannot be drawn live and then refuse, or be drawn off with a
 * reason that is not the real one. `located` is null on screens that hold no
 * part open (the map, the board, Today past the last written session).
 */
async function assistantRule(plan: Plan, located: Located | null, record: AttemptRecord | null, feature: string): Promise<AssistantState> {
  // Lock one: nothing is answered anywhere while a no-help check has been
  // started and not finished — in any written session, since any can be open.
  const openCheck = await openCheckSession(plan);
  if (openCheck !== null) return {open: false, reason: "check_open", session: openCheck};
  // No part named: only a plain question, because no prediction is held open.
  if (!located) return feature === "followup" ? {open: true, reason: ""} : {open: false, reason: "ai_not_allowed"};
  if (!located.part.ai_allowed || located.part.kind === "withdraw") return {open: false, reason: "ai_not_allowed"};
  // An interview is examined on her own explanation, so the only thing the
  // model may do there is ask that part's own three questions.
  if ((located.part.kind === "interview") !== (feature === "interview")) {
    return {open: false, reason: located.part.kind === "interview" ? "interview" : "ai_not_allowed"};
  }
  // Lock two: past the part's own gate. A finished attempt holds no guess
  // open, on any step; an unfinished one is open once its answer is locked —
  // including on step 1, where "off until your answer is locked" would be
  // false — and closed while `From before` is asking.
  if (!record) return {open: false, reason: "not_sealed"};
  if (!record.finished_at) {
    if (!isSealed(located.part, record)) return {open: false, reason: "not_sealed"};
    if (record.step === "resurface") return {open: false, reason: "resurface"};
  }
  if (feature === "annotate" && !record.passed_at) return {open: false, reason: "receipt_not_accepted"};
  return {open: true, reason: ""};
}

/** The assistant's state on a screen that holds no part open. */
export async function assistantState(): Promise<AssistantState> {
  return transaction(async () => assistantRule(await planState(), null, null, "followup"));
}

export async function assertAssistantAllowed(input: unknown) {
  const body = objectBody(input);
  keysOnly(body, ["part", "part_id", "attempt", "feature", "question"]);
  const feature = typeof body.feature === "string" ? body.feature : "followup";
  if (!FEATURES.includes(feature)) throw new StudyError(422, "invalid_body");
  return transaction(async () => {
    const plan = await planState();
    const id = typeof body.part === "string" ? body.part : typeof body.part_id === "string" ? body.part_id : null;
    const located = id ? await findPart(id).catch(() => null) : null;
    let record: AttemptRecord | null = null;
    if (id && !located) throw new StudyError(409, "ai_not_allowed");
    if (located) {
      const n = body.attempt === undefined ? plan.current_attempt[located.part.id] : Number(body.attempt);
      record = n ? (await existingAttempt(located.part.id, n)).record : null;
    }
    const state = await assistantRule(plan, located, record, feature);
    // The route answers with a code the panel has a sentence for; `interview`
    // and `resurface` are states the control is hidden in, not codes.
    if (!state.open) {
      throw new StudyError(409, ["check_open", "not_sealed", "receipt_not_accepted"].includes(state.reason) ? state.reason : "ai_not_allowed");
    }
    // The teacher builds its prompt from what the lock just read, never from
    // what the client sent (HANDOVER §8, prompt minimization).
    return {feature, located, record, question: typeof body.question === "string" ? body.question : ""};
  });
}
