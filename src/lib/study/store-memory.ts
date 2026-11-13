import { AsyncLocalStorage } from "node:async_hooks";
import { StudyError } from "./types";

// The store for the public web trial (PUBLISH.md §6). The visitor's record
// arrives with the request, lives in a Map for the length of it, and goes back
// in the response; the browser keeps it. Nothing is written on the server.
//
// This is deliberately not the filesystem store with its disk swapped out.
// That store protects against power loss, a killed process and two tabs
// writing at once — temporary file, atomic rename, two `fsync`s, torn-line
// quarantine, corruption markers. None of those failures exist inside one
// request against one Map, so reimplementing them here would be machinery
// without a hazard. What is kept is every rule a caller can observe: a missing
// file reads as null, a record of the wrong version refuses, unreadable JSON
// refuses, and an appended row is one newline-terminated line.
//
// The record a visitor sends is theirs to forge, and forging it buys nothing:
// nothing is scored, and the sealed answers are never sent to the client.

export type Record_ = Map<string, string>;

const context = new AsyncLocalStorage<Record_>();

export function enterRecord<T>(record: Record_, run: () => Promise<T>): Promise<T> {
  return context.run(record, run);
}

function files(): Record_ {
  const active = context.getStore();
  if (active) return active;
  // There is deliberately no fallback. An escape hatch here — a process-wide
  // Map for a caller outside a request — would be one record shared by every
  // visitor of a lambda, which is the one failure this whole design exists to
  // prevent. Code that reads the record on the web trial runs inside
  // `enterRecord` or inside `withEmptyRecord`, or it crashes here.
  throw new StudyError(500, "no_record", "This request carried no study record.");
}

export function recordFrom(entries: unknown): Record_ {
  const record: Record_ = new Map();
  if (entries && typeof entries === "object" && !Array.isArray(entries)) {
    for (const [key, value] of Object.entries(entries as Record<string, unknown>)) {
      if (typeof value === "string") record.set(key, value);
    }
  }
  return record;
}

export function recordTo(record: Record_): Record<string, string> {
  return Object.fromEntries(record);
}

export async function readJson<T extends {version: number}>(relative: string): Promise<T | null> {
  const text = files().get(relative);
  if (text === undefined) return null;
  let data: T;
  try { data = JSON.parse(text); }
  catch { throw new StudyError(500, "corrupt_record", `${relative} could not be read. The rest of your semester is intact.`); }
  if (!data || data.version !== 1) throw new StudyError(500, "unsupported_version", `${relative} has an unknown format. No changes were made.`);
  return data;
}

export async function writeJson(relative: string, data: {version: number}) {
  const ordered: Record<string, unknown> = {...data};
  delete ordered.version;
  files().set(relative, JSON.stringify({version: 1, ...ordered}, null, 2) + "\n");
}

export async function appendJsonl(relative: string, row: object) {
  const record = files();
  const previous = record.get(relative) ?? "";
  record.set(relative, previous + JSON.stringify(row) + "\n");
}

export async function readJsonl(relative: string): Promise<Record<string, unknown>[]> {
  const raw = files().get(relative);
  if (raw === undefined) return [];
  return raw.split("\n").filter(Boolean).map(line => {
    try { return JSON.parse(line); }
    catch { throw new StudyError(500, "corrupt_record", `${relative} contains an unreadable line. No changes were made.`); }
  });
}

// One request is one caller, so there is nothing to exclude.
export function transaction<T>(run: () => Promise<T>): Promise<T> {
  return run();
}
