import "server-only";
import { findSession, loadBlocks } from "./content";
import { stepsFor } from "./steps";
import { readJson, transaction, writeJson } from "./store";
import { Part, Plan, Reading, StudyError } from "./types";

// Her own reading log (owner, 2026-11-13; DECISIONS "Her reading log"): which
// readings she has done and a line or two per session on what she did. It is
// hers, not the course's: nothing grades it, the board never reads it, and the
// teacher is never shown it. Every entry can be changed or taken back, any day.
//
// One file, so the log page reads it in one go and the web trial's record
// carries it like any other file.
export interface ReadingLogFile {
  version: 1;
  sessions: Record<string, {read: Record<string, string>; note: string; note_at?: string}>;
}

const FILE = "reading_log.json";
const NOTE_LIMIT = 4000;
const empty = (): ReadingLogFile => ({version: 1, sessions: {}});

async function logFile(): Promise<ReadingLogFile> {
  const file = await readJson<ReadingLogFile>(FILE) ?? empty();
  const entries = file.sessions && typeof file.sessions === "object" ? Object.values(file.sessions) : null;
  if (!entries || entries.some(entry => !entry || typeof entry.read !== "object" || !entry.read || typeof entry.note !== "string")) {
    throw new StudyError(500, "invalid_record", "reading_log.json is unreadable. No changes were made.");
  }
  return file;
}

/** A session's readings in the order she meets them, each URL once. */
export function readingsOf(parts: Part[]): Reading[] {
  const seen = new Set<string>();
  return parts.flatMap(part => part.reading ?? []).filter(row => !seen.has(row.url) && !!seen.add(row.url));
}

async function sessionOr404(n: number) {
  if (!Number.isSafeInteger(n) || n < 1) throw new StudyError(404, "not_found");
  const found = await findSession(n);
  if (!found) throw new StudyError(404, "not_found");
  return found.session;
}

function view(file: ReadingLogFile, n: number) {
  const entry = file.sessions[String(n)];
  return {session: n, read: entry?.read ?? {}, note: entry?.note ?? "", note_at: entry?.note_at ?? null};
}

export async function getSessionLog(n: number) {
  await sessionOr404(n);
  return transaction(async () => view(await logFile(), n));
}

/**
 * One change at a time: `{url, read}` ticks or unticks one of this session's
 * readings, `{note}` replaces the session's note (empty clears it).
 */
export async function postSessionLog(n: number, input: unknown) {
  const session = await sessionOr404(n);
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new StudyError(422, "invalid_body");
  const body = input as Record<string, unknown>;
  const keys = Object.keys(body).sort().join(",");
  return transaction(async () => {
    const file = await logFile();
    const entry = file.sessions[String(n)] ?? {read: {}, note: ""};
    const at = new Date().toISOString();
    if (keys === "read,url") {
      if (typeof body.read !== "boolean" || typeof body.url !== "string") throw new StudyError(422, "invalid_body");
      // Only a reading this session lists: the log is of the course's readings.
      if (!readingsOf(session.parts).some(row => row.url === body.url)) throw new StudyError(404, "not_found");
      if (body.read) entry.read[body.url] = entry.read[body.url] ?? at;
      else delete entry.read[body.url];
    } else if (keys === "note") {
      if (typeof body.note !== "string" || body.note.length > NOTE_LIMIT) throw new StudyError(422, "invalid_body");
      entry.note = body.note;
      entry.note_at = at;
    } else {
      throw new StudyError(422, "invalid_body");
    }
    file.sessions[String(n)] = entry;
    await writeJson(FILE, file);
    return view(file, n);
  });
}

/**
 * The log page: every session up to Today's, and any later one she has
 * written in. A session lists its main lab's readings, and another part's only
 * once she has opened that part or ticked one of them — the same moment the
 * part itself first shows them, so the log never shows a reading early. That
 * holds only for a part with no guess: a part that opens on a guess shows its
 * readings after it, so opening it is not enough, and its readings wait for a
 * tick (architecture review, 2026-11-13; today only exposure teardowns qualify).
 */
export async function getReadingLog() {
  return transaction(async () => {
    const file = await logFile();
    const plan = await readJson<Plan>("plan.json");
    const today = plan?.current_session ?? 1;
    const opened = plan?.current_attempt ?? {};
    const sessions = [];
    for (const block of await loadBlocks()) {
      for (const session of [...block.sessions].sort((a, b) => a.session - b.session)) {
        const mine = view(file, session.session);
        const written = Object.keys(mine.read).length > 0 || mine.note.trim().length > 0;
        if (session.session > today && !written) continue;
        const main = session.parts.find(part => part.kind === "lab") ?? session.parts[0];
        const shown = session.parts.filter(part => part === main || (opened[part.id] && stepsFor(part)[0] !== "predict"));
        const rows = readingsOf(session.parts).filter(row =>
          readingsOf(shown).some(entry => entry.url === row.url) || mine.read[row.url]);
        sessions.push({
          session: session.session, title: session.title,
          readings: rows.map(row => ({title: row.title, url: row.url, minutes: row.minutes, read_at: mine.read[row.url] ?? null})),
          note: mine.note, note_at: mine.note_at,
        });
      }
    }
    return {sessions};
  });
}
