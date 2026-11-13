// How a screen asks the engine a question.
//
// Locally this is `fetch`: the record is on her disk and the server reads it.
// In the public web trial (PUBLISH.md §6) there is no record on the server, so
// the call goes to /api/web with the visitor's record attached, and the record
// that comes back is kept in this browser. Callers see a Response either way,
// so no screen has two versions of itself.
//
// The record lives in localStorage and nowhere else: clearing it is starting
// over, and it never reaches another visitor or us. Every access is wrapped,
// because storage can be off.

import { WEB } from "@/lib/mode";

export { WEB };
const KEY = "forthree.record.v1";

export function readRecord(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, string>; }
  catch { return {}; }
}

/** False when this browser would not keep it: storage off, or storage full. */
export function writeRecord(record: Record<string, string>) {
  try { localStorage.setItem(KEY, JSON.stringify(record)); return true; }
  catch { return false; }
}

export function recordIsEmpty() {
  return Object.keys(readRecord()).length === 0;
}

// In the web trial each call carries the whole record and the whole record
// comes back, so two calls in flight would each start from the same copy and
// the later reply would erase the earlier one's change. One at a time
// (architecture review, 2026-11-13: a note save and a tick on one screen).
let queue: Promise<unknown> = Promise.resolve();

export function studyFetch(path: string, init?: RequestInit): Promise<Response> {
  if (!WEB) return fetch(path, init);
  const turn = queue.then(() => webFetch(path, init));
  queue = turn.catch(() => undefined);
  return turn;
}

async function webFetch(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch("/api/web", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    cache: "no-store",
    keepalive: init?.keepalive,
    body: JSON.stringify({
      path,
      method: init?.method === "POST" ? "POST" : "GET",
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
      record: readRecord(),
    }),
  });
  let payload: {data?: unknown; record?: Record<string, string>} = {};
  try { payload = await response.json(); } catch { /* fall through to the status below */ }
  // `{}` is truthy, and a response that carries no record at all must never
  // be written: that is how one refused call erases a semester.
  if (payload.record && Object.keys(payload.record).length && !writeRecord(payload.record)) {
    // The call did reach the server, but nothing of it survives this browser,
    // so reporting success would leave the visitor working into a void: the
    // next call sends the last record that was kept, and every piece of work
    // after this one is silently lost while the screen says it saved.
    return new Response(JSON.stringify({
      error: "storage_full",
      message: "This browser can no longer save your progress — its storage is full or switched off. Save your record to a file from the first page, then start over.",
    }), {status: 507, headers: {"Content-Type": "application/json"}});
  }
  const {record: _kept, data, ...said} = payload;
  void _kept;
  return new Response(JSON.stringify(response.ok ? data : said), {
    status: response.status,
    headers: {"Content-Type": "application/json"},
  });
}
