import "server-only";
import { readJson, readJsonl } from "./store";
import { openLedger } from "./resurface";
import { Part, RecallFile } from "./types";

// §18.5, seven wires, evaluated on load of `/`. Every one reads the sealed
// per-part estimates from the record: if those are not authored the wires are
// dead, so `estimateOf` returns null rather than zero and the wire stays quiet.
// Nothing here computes an overdue count, a streak or a days-since figure.

export interface Wire { id: string; says: string; consequence: string }

interface TimingRow { ts: string; part: string; session: number; step: string; estimate_min: number; actual_min: number }

// §4.1 is binding on anything the interface prints, so a wire states the
// measurement in her words and never names a thing she cannot open. The
// design's own "Shown as" column used `teardown`, `checkpoint`, `re-scope`
// and `deepen, sidestep, stop, re-aim`; the first is an internal name the
// §4.1 table replaces, and the rest name no screen and no action.
const SAYS: Record<string, [string, string]> = {
  calibration: ["This took much longer than the plan assumed.", ""],
  "skipped-check": ["Two sessions have gone by without a no-help check.", ""],
  "cold-failing": ["The last two no-help checks went badly.", ""],
  "lab-overrun": ["Two labs have taken more than twice as long as planned.", ""],
  "teardown-overrun": ["Two of the take-something-apart parts ran past twice their estimate.", ""],
  "ledger-flat": ["Your list of mistakes has not got shorter across three sessions.", ""],
  // Evaluated at a checkpoint, and checkpoints are not in this slice.
  "bar-flat": ["A skill has not moved since the last review.",
    "Worth deciding: keep going, go round it, or stop here."],
};

const wire = (id: string): Wire => ({id, says: SAYS[id][0], consequence: SAYS[id][1]});

function estimateOf(part: Part, keys: ("attempt" | "all" | "tasks")[]): number | null {
  if (keys.includes("tasks")) {
    const sum = (part.tasks ?? []).reduce((total, task) => total + (task.minutes ?? 0), 0);
    return sum > 0 ? sum : null;
  }
  const sum = Object.values(part.minutes ?? {}).reduce((total, value) => total + value, 0);
  return sum > 0 ? sum : null;
}

/**
 * The three wires that read time are INERT (LESSONS L-TIME-01; DECISIONS
 * 2026-11-10, round seven). `timing.jsonl` holds the wall-clock time between
 * entering a step and leaving it, and a lab is done across sittings in her own
 * terminal: a part left open overnight read as a twenty-hour attempt, and
 * Today told her two labs had taken twice as long as planned on the card that
 * says "forty minutes or three sittings". Nothing the app can see separates
 * working from away. They stay off until a sitting has a start and an end she
 * marks herself; flipping this constant is not that.
 */
const SITTINGS_ARE_MEASURED = false;
const MISS_LIST_TREND_IS_MEASURED = false;

/** An overrun is counted once per part, on its `attempt` step. */
function overruns(timing: TimingRow[], parts: Map<string, Part>, kind: Part["kind"], basis: "all" | "tasks") {
  const byPart = new Map<string, number>();
  for (const row of timing) {
    if (row.step !== "attempt") continue;
    const part = parts.get(row.part);
    if (!part || part.kind !== kind) continue;
    byPart.set(row.part, (byPart.get(row.part) ?? 0) + (Number(row.actual_min) || 0));
  }
  let count = 0;
  for (const [id, actual] of byPart) {
    const estimate = estimateOf(parts.get(id)!, [basis]);
    if (estimate !== null && actual > 2 * estimate) count += 1;
  }
  return count;
}

export async function evaluateWires(
  sessions: {session: number; parts: Part[]}[],
  currentSession: number,
  finishedChecks: Set<number> = new Set(),
): Promise<Wire[]> {
  const parts = new Map<string, Part>();
  const sessionOf = new Map<string, number>();
  for (const session of sessions) for (const part of session.parts) { parts.set(part.id, part); sessionOf.set(part.id, session.session); }

  const timing = (await readJsonl("timing.jsonl")) as unknown as TimingRow[];
  const fired: Wire[] = [];

  // calibration — session 7's lab, named directly. Inert until that session
  // is authored and run; it reads the per-task estimates, not the part's.
  const sevensLab = [...parts.values()].find(part => part.id === "s07-lab-a");
  if (SITTINGS_ARE_MEASURED && sevensLab) {
    const estimate = estimateOf(sevensLab, ["tasks"]);
    const actual = timing.filter(row => row.part === sevensLab.id && row.step === "attempt")
      .reduce((total, row) => total + (Number(row.actual_min) || 0), 0);
    if (estimate !== null && actual > 2 * estimate) fired.push(wire("calibration"));
  }

  if (SITTINGS_ARE_MEASURED) {
    if (overruns(timing, parts, "lab", "all") >= 2) fired.push(wire("lab-overrun"));
    if (overruns(timing, parts, "teardown", "all") >= 2) fired.push(wire("teardown-overrun"));
  }

  // skipped-check — two consecutive past sessions with no completed check. The
  // caller supplies the finished set from the records, not from timing: a step
  // she left halfway writes a timing row and finishes nothing.
  let run = 0;
  for (let n = 1; n < currentSession; n += 1) {
    run = finishedChecks.has(n) ? 0 : run + 1;
    if (run >= 2) { fired.push(wire("skipped-check")); break; }
  }

  // cold-failing — the authored 80% line, which §18.5 says to re-tune from
  // sessions 1–3's actuals. Counted per session over drawn items.
  const recall = (await readJson<RecallFile>("recall.json"))?.items ?? {};
  const bySession = new Map<number, {pass: number; total: number}>();
  for (const row of Object.values(recall)) {
    const tally = bySession.get(row.last_seen_session) ?? {pass: 0, total: 0};
    tally.total += 1;
    if (row.last_result === "pass") tally.pass += 1;
    bySession.set(row.last_seen_session, tally);
  }
  // Session 1 is excluded: its own card calls it the exception, because its
  // check runs last on material she has just met. And the wire needs three
  // scored checks before it can speak — §18.5 says the 80% line comes from no
  // study and must be re-tuned from sessions 1-3, so firing on two points,
  // one of them the documented exception, is the instrument talking first.
  const rates = [...bySession.entries()]
    .filter(([session]) => session > 1)
    .sort((left, right) => left[0] - right[0])
    .map(([, tally]) => tally.pass / tally.total);
  if (rates.length >= 3) {
    for (let index = 1; index < rates.length; index += 1) {
      if (rates[index] < 0.8 && rates[index - 1] < 0.8) { fired.push(wire("cold-failing")); break; }
    }
  }

  // ledger-flat — INERT (L-TIME-02; DECISIONS 2026-11-10, round eight). It
  // counted the misses open *now*, grouped by the session that filed them,
  // and called that a trend. A learner who clears her old misses has fewer
  // from session 1 than from session 3, so it fired on exactly the healthy
  // record and stayed quiet on a list that had doubled. What it needs is the
  // length of the open list at the end of each of the last three sessions,
  // which the append-only ledger can give once a session's end is recorded.
  if (!MISS_LIST_TREND_IS_MEASURED) return fired;
  const ledger = await openLedger();
  const uncleared = new Map<number, number>();
  for (const row of ledger) {
    const session = sessionOf.get(row.part) ?? 0;
    if (!row.cleared) uncleared.set(session, (uncleared.get(session) ?? 0) + 1);
  }
  const counts = [...uncleared.entries()].sort((left, right) => left[0] - right[0]).map(([, count]) => count);
  if (counts.length >= 3) {
    const [first, second, third] = counts.slice(-3);
    if (third >= second && second >= first) fired.push(wire("ledger-flat"));
  }

  return fired;
}
