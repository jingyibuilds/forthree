"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { studyFetch } from "@/lib/study-fetch";

type Row = {title: string; url: string; teaches: string; minutes: number};
type Log = {read: Record<string, string>; note: string};

// A session's readings with her own tick beside each, and, on the session
// page, her note for the session. The tick for a reading lives in one place
// only — where the reading is first given to her — and the log page shows them
// all (owner, 2026-11-13; L-UI-12). She can change either, any day, as often
// as she likes; nothing grades it.
export default function ReadingList({session, rows, note: withNote = false}: {session: number; rows: Row[]; note?: boolean}) {
  const [read, setRead] = useState<Record<string, string> | null>(null);
  const [note, setNote] = useState("");
  const [said, setSaid] = useState<"" | "saving" | "saved" | "failed" | "unread">("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The note text not yet saved. It is cleared only by a save that worked, so
  // a failed one is retried by the next keystroke, blur or leaving the page.
  const pending = useRef<string | null>(null);
  // Every change goes out one after another, so an older note can never land
  // after a newer one, and only the last reply redraws the ticks.
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const sent = useRef(0);
  const address = `/api/reading-log/${session}`;

  useEffect(() => {
    let live = true;
    studyFetch(address, {cache: "no-store"})
      .then(response => response.ok ? response.json() : Promise.reject())
      .then((data: Log) => { if (live) { setRead(data.read); setNote(data.note); } })
      .catch(() => { if (live) setSaid("unread"); });
    return () => { live = false; };
  }, [address]);

  // A reload, a closed tab or a link inside 800 ms of the last keystroke would
  // otherwise take the waiting text with it.
  useEffect(() => {
    const leave = () => {
      if (pending.current === null) return;
      studyFetch(address, {method: "POST", keepalive: true, headers: {"Content-Type": "application/json"},
        body: JSON.stringify({note: pending.current})}).catch(() => {});
      pending.current = null;
    };
    window.addEventListener("pagehide", leave);
    return () => { window.removeEventListener("pagehide", leave); if (timer.current) clearTimeout(timer.current); leave(); };
  }, [address]);

  function send(body: object): Promise<Log> {
    const turn = chain.current.then(async () => {
      const response = await studyFetch(address, {
        method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("not saved");
      return response.json() as Promise<Log>;
    });
    chain.current = turn.catch(() => undefined);
    return turn;
  }

  async function tick(url: string, value: boolean) {
    const next = {...(read ?? {})};
    if (value) next[url] = new Date().toISOString();
    else delete next[url];
    setRead(next);
    const mine = sent.current += 1;
    try {
      const saved = await send({url, read: value});
      if (mine === sent.current) setRead(saved.read);
    } catch {
      // Show what the record holds, not a guess at what it held before.
      setSaid("failed");
      studyFetch(address, {cache: "no-store"}).then(response => response.json()).then((data: Log) => setRead(data.read)).catch(() => {});
    }
  }

  async function flush() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const text = pending.current;
    if (text === null) return;
    setSaid("saving");
    try {
      await send({note: text});
      if (pending.current === text) pending.current = null;
      setSaid(pending.current === null ? "saved" : "saving");
    } catch { setSaid("failed"); }
  }

  function type(text: string) {
    setNote(text);
    pending.current = text;
    setSaid("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 800);
  }

  const status = said === "saving" ? "Saving…"
    : said === "saved" ? "Saved. It is on your reading log too."
    : said === "failed" ? "Not saved: your study record could not be reached. Your next change tries again."
    : said === "unread" ? "Your reading log could not be read, so nothing here can be changed. Reload the page to try again." : "";

  return (
    <>
      {rows.map(row => (
        <div className="reading-row ticked-row" key={row.url}>
          <a href={row.url} target="_blank" rel="noreferrer">
            {row.title} <Icon name="out" />
          </a>
          <span className="reading-description">{row.teaches}</span>
          <span className="reading-duration">{row.minutes} min</span>
          <label className="read-tick">
            <input
              type="checkbox"
              checked={!!read?.[row.url]}
              disabled={read === null}
              onChange={event => tick(row.url, event.target.checked)}
            />
            read
          </label>
        </div>
      ))}
      {withNote ? (
        <div className="session-note">
          <label htmlFor={`note-${session}`}>Your note for this session</label>
          <textarea
            id={`note-${session}`}
            value={note}
            disabled={read === null}
            maxLength={4000}
            placeholder="A line or two: what you read, what you tried, what stuck."
            onChange={event => type(event.target.value)}
            onBlur={flush}
          />
          <span className="note-state" role="status">{status}</span>
        </div>
      ) : (said === "failed" || said === "unread") && (
        <p className="note-state tick-state" role="status">{status}</p>
      )}
    </>
  );
}
