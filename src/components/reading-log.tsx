"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { studyFetch } from "@/lib/study-fetch";

type Entry = {
  session: number; title: string; note: string; note_at: string | null;
  readings: {title: string; url: string; minutes: number; read_at: string | null}[];
};

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", {month: "short", day: "numeric"});

// The log page's body. It asks the engine like every screen does, so the web
// trial's copy shows the visitor's own log.
export default function ReadingLog() {
  const [sessions, setSessions] = useState<Entry[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    studyFetch("/api/reading-log", {cache: "no-store"})
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(data => setSessions(data.sessions))
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <p className="inline miss" role="alert">Your reading log could not be read. Nothing was changed.</p>;
  if (!sessions) return null;
  return (
    <>
      {sessions.map(entry => {
        const done = entry.readings.filter(row => row.read_at).length;
        return (
          <section className="read log" key={entry.session}>
            <header className="rh">
              <b>Session {entry.session} · {entry.title}</b>
              <span>{done} of {entry.readings.length} read · <Link href={`/sessions/${entry.session}`}>open the session</Link></span>
            </header>
            {entry.readings.map(row => (
              <div className={row.read_at ? "reading-row log-row is-read" : "reading-row log-row"} key={row.url}>
                <span className="log-mark">{row.read_at ? <Icon name="check" /> : <span className="unknown">—</span>}</span>
                <a href={row.url} target="_blank" rel="noreferrer">{row.title} <Icon name="out" /></a>
                <span className="reading-duration">{row.read_at ? `read ${day(row.read_at)}` : `${row.minutes} min`}</span>
              </div>
            ))}
            <div className="log-note">
              {entry.note.trim()
                ? <><p>{entry.note}</p>{entry.note_at && <small>written {day(entry.note_at)}</small>}</>
                : <p className="empty">No note yet.</p>}
            </div>
          </section>
        );
      })}
    </>
  );
}
