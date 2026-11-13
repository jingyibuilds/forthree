"use client";

import { useEffect, useRef, useState } from "react";
import { studyFetch } from "@/lib/study-fetch";

// What her own run shows, written by the teacher once her run is accepted
// (REBUILD.md R3/R4). It adds to the deterministic page and never replaces
// it: with no key, over the cap or on any error it renders nothing.
export default function TeacherNote({part, attempt}: {part: string; attempt: number}) {
  const [text, setText] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(true);
  const asked = useRef(false);

  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    studyFetch("/api/llm", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({feature: "annotate", part, attempt}),
    })
      .then(response => (response.ok ? response.json() : null))
      .then(data => setText(typeof data?.text === "string" ? data.text : null))
      .catch(() => setText(null))
      .finally(() => setWaiting(false));
  }, [part, attempt]);

  if (waiting) return <p className="teacher waiting">Reading your run…</p>;
  if (!text) return null;
  return (
    <div className="teacher">
      <b>What your run shows</b>
      {text.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index}>
          {/* `code` in its answer is shown as code, not as backticks. */}
          {paragraph.split(/(`[^`]+`)/).map((piece, at) =>
            /^`[^`]+`$/.test(piece) ? <code key={at}>{piece.slice(1, -1)}</code> : piece)}
        </p>
      ))}
    </div>
  );
}
