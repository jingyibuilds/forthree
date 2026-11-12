import "server-only";
import { findPart } from "./content";
import { BankItem, loadSealed } from "./sealed";
import { readJson, readJsonl } from "./store";
import { RecallFile } from "./types";

// §17.5: two pools, and the lag is an ordering preference, never a due date.
// Nothing here computes lateness, a streak or an overdue count.

const TARGET_LAG = [1, 3, 8];

export interface ResurfaceItem {
  id: string;
  pool: "A" | "B";
  /** `recall` takes a typed answer graded against the bank; `choice` re-asks
   *  the part's own prediction. Nothing is ever cleared by a tap. */
  kind: "recall" | "choice";
  prompt: string;
  options?: string[];
  part?: string;
  block: string;
  note?: string;
  /** Pool A, a lab's question: she guessed it wrong, or a paste was sent back. */
  cause?: "missed" | "paste";
}

interface LedgerRow {
  ts: string; part: string; block: string; check_id: string;
  mental_model: string | null; note?: string; times_seen?: number; cleared?: boolean;
}

/** Readers take the last row per `check_id`; no row is ever rewritten. */
export async function openLedger() {
  const rows = (await readJsonl("ledger.jsonl")) as unknown as LedgerRow[];
  const last = new Map<string, LedgerRow>();
  for (const row of rows) if (row?.check_id) last.set(row.check_id, row);
  return [...last.values()];
}

export async function bankItem(block: string, id: string): Promise<BankItem | undefined> {
  try { return (await loadSealed(block)).withdraw_bank?.find(candidate => candidate.id === id); }
  catch { return undefined; }
}

/**
 * `exclude` is the part now running, the items it drew, and anything a sibling
 * part of this session has already shown. "Current-session items are eligible
 * immediately" (§17.5) means they are not held back for a spacing delay — not
 * that a miss returns two steps after the screen that explained it, and not
 * that one item returns twice in one evening.
 */
export async function selectResurface(
  currentSession: number,
  exclude: {part?: string; items?: string[]; shown?: string[]; drawnThisSession?: string[]} = {},
): Promise<ResurfaceItem[]> {
  const picked: ResurfaceItem[] = [];
  const skip = new Set([...(exclude.items ?? []), ...(exclude.shown ?? [])]);
  // Pool B re-asks what she got right, and an item drawn in this very session
  // has the smallest lag distance precisely because it was just seen. Asking
  // it again the same evening is a duplicate, not retrieval.
  const skipB = new Set([...skip, ...(exclude.drawnThisSession ?? [])]);
  const seenPrompts = new Set<string>();
  const add = (item: ResurfaceItem) => {
    // Two ledger rows filed by one part resolve to one question, so the same
    // question must never appear twice on one screen.
    if (seenPrompts.has(item.prompt)) return;
    seenPrompts.add(item.prompt);
    picked.push(item);
  };

  // 1. One item from pool B, nearest to its target lag. Filled before anything
  //    else, and empty only when pool B is.
  const recall = (await readJson<RecallFile>("recall.json"))?.items ?? {};
  const passed = Object.entries(recall)
    .filter(([id, row]) => row.kind === "recall" && row.last_result === "pass" && !skipB.has(id));
  if (passed.length) {
    const scored = passed.map(([id, row]) => {
      const target = TARGET_LAG[Math.min(row.times_seen, TARGET_LAG.length) - 1] ?? TARGET_LAG[TARGET_LAG.length - 1];
      return {id, row, distance: Math.abs(currentSession - row.last_seen_session - target)};
    }).sort((left, right) => left.distance - right.distance || left.row.last_seen_session - right.row.last_seen_session);
    const choice = scored[0];
    if (choice) {
      const item = await bankItem(choice.row.block, choice.id);
      if (item) add({id: item.id, pool: "B", kind: "recall", prompt: item.prompt, block: choice.row.block});
    }
  }

  // 2 and 3. Pool A: the oldest block first, then the least-recently-seen
  //    uncleared misses. A row filed by a no-help check is re-asked as the
  //    bank item itself and graded; a row filed by a lab's check is re-asked
  //    as that part's prediction, which is what §17.5 names. A row that
  //    resolves to neither is dropped rather than rendered as an id.
  const open = (await openLedger()).filter(row =>
    !row.cleared && row.part !== exclude.part && !skip.has(row.check_id));
  open.sort((left, right) => left.block.localeCompare(right.block) || Date.parse(left.ts) - Date.parse(right.ts));
  for (const row of open) {
    if (picked.length >= 3) break;
    const item = await bankItem(row.block, row.check_id);
    if (item) {
      add({id: item.id, pool: "A", kind: "recall", prompt: item.prompt, part: row.part, block: row.block,
        note: row.mental_model ?? undefined});
      continue;
    }
    let located;
    try { located = await findPart(row.part); } catch { located = null; }
    const predict = located?.part.predict;
    if (predict?.options?.length) {
      // One lab can have several open rows — a missed guess and a paste sent
      // back — and they all resolve to this one question. Say the true cause:
      // "this one caught you" is false of a guess she got right.
      const missed = open.some(other => other.part === row.part && other.check_id.endsWith("-prediction"));
      add({id: row.check_id, pool: "A", kind: "choice", prompt: predict.ask, options: predict.options,
        part: row.part, block: row.block, note: row.mental_model ?? undefined, cause: missed ? "missed" : "paste"});
    }
  }
  return picked.slice(0, 3);
}
