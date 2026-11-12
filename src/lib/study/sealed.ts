import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Check, Normalise, StudyError } from "./types";

// `curriculum/sealed/<block>.json` is committed, authored by a separate agent,
// and never read by the owner or by any agent working for her (DESIGN §14.5).
// This module is the only reader, it hands the client the prompt alone, and
// `accept_sha256` never leaves the server.

export interface RecallItem {
  id: string;
  kind: "recall";
  prompt: string;
  accept_sha256: string[];
  normalise: Normalise;
  mode?: "equals" | "contains";
  explain: string;
  earliest_session: number;
  smoke?: boolean;
}

export interface ColdWriteItem {
  id: string;
  kind: "cold_write";
  prompt: string;
  receipt_commands?: string[];
  receipt_fields?: string[];
  acceptance_checks: Check[];
  explain: string;
  earliest_session: number;
  smoke?: boolean;
}

export type BankItem = RecallItem | ColdWriteItem;

export interface JudgeVariant {
  id: string;
  scenario: string;
  checks: {id: string; ask: string; evidence: string; validate: Check}[];
  distractors?: string[];
  explain: string;
  earliest_session: number;
  smoke?: boolean;
}

export interface SealedBlock {
  block: string;
  judge_variants?: JudgeVariant[];
  withdraw_bank?: BankItem[];
  variants?: {after_part: string; ask: string; options: string[]; correct: number; explain?: string}[];
}

export async function loadSealed(block: string): Promise<SealedBlock> {
  const file = path.join(process.cwd(), "curriculum/sealed", `${block.toLowerCase()}.json`);
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as SealedBlock;
  } catch {
    throw new StudyError(500, "missing_bank", `The check bank for ${block} is missing. No check can be served without it.`);
  }
}

export interface CheckSlot { part: string; session: number; want: number; kind: "recall" | "cold_write" }

const fits = (item: BankItem, slot: CheckSlot) =>
  item.kind === slot.kind && item.smoke !== true && item.earliest_session <= slot.session;

/**
 * Each session's check owns the items it would draw if the sessions were done
 * in order. Replayed in session order over the bank's own order, so the answer
 * is the same whichever session she opens first (LESSONS L-ORDER-02): before
 * this, a later session's check opened early took the only items session 1's
 * check may draw, and session 1 could never be finished.
 */
export function plannedDraws(bank: BankItem[], slots: CheckSlot[]): Map<string, string[]> {
  const taken = new Set<string>();
  const plan = new Map<string, string[]>();
  for (const slot of [...slots].sort((left, right) => left.session - right.session || left.part.localeCompare(right.part))) {
    const ids = bank.filter(item => fits(item, slot) && !taken.has(item.id)).slice(0, slot.want).map(item => item.id);
    for (const id of ids) taken.add(id);
    plan.set(slot.part, ids);
  }
  return plan;
}

/**
 * §14.5. A check's first try draws the items reserved for it. A later try
 * draws from what no check has reserved. `used` is every id already drawn by
 * any try of any check, answered or not, so two checks open at once never
 * share a question. A short first draw is a build failure the validator
 * rules out; a short retake is an ordinary refusal.
 */
export function drawItems(bank: BankItem[], slot: CheckSlot, slots: CheckSlot[], used: Set<string>, first: boolean) {
  const plan = plannedDraws(bank, slots);
  const reserved = new Set([...plan.values()].flat());
  const own = first ? (plan.get(slot.part) ?? []).filter(id => !used.has(id)) : [];
  const spare = bank.filter(item => fits(item, slot) && !reserved.has(item.id) && !used.has(item.id)).map(item => item.id);
  const ids = [...own, ...spare].slice(0, slot.want);
  if (ids.length < slot.want) {
    throw new StudyError(first ? 500 : 409, "bank_short", first
      ? `This session's no-help check needs ${slot.want} unseen ${slot.kind} item(s) and the bank offers ${ids.length}. Nothing was drawn and no record was changed.`
      : "There are not enough unseen questions left to run this check again. Nothing was drawn and no record was changed.");
  }
  return ids;
}

export function itemById(bank: SealedBlock, id: string): BankItem | undefined {
  return bank.withdraw_bank?.find(item => item.id === id);
}

export function variantFor(bank: SealedBlock, partId: string) {
  return bank.variants?.find(variant => variant.after_part === partId);
}
