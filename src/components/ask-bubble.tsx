"use client";
import { useState } from "react";
import { ASK_DEGRADED, ASK_FAILED, askReason, askResting } from "./ask-reason";
import { Html } from "./html";
import { Icon } from "./icons";
import { studyFetch } from "@/lib/study-fetch";

// §4.0 and gate G5. Three states, and only two of them render: live, and
// disabled with its reason. A part where no help is allowed renders nothing at
// all — there is no rule to teach there, only a temptation to remove (§8).
export type BubbleMode = "live" | "disabled" | "hidden";

export interface Gloss { term: string; anchor: string; explain: string }

export default function AskBubble({
  mode, reason, concepts = [], part, attempt,
}: {
  mode: BubbleMode;
  reason?: string;
  concepts?: Gloss[];
  part?: string;
  attempt?: number;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [log, setLog] = useState<{q: string; a: string}[]>([]);
  const [busy, setBusy] = useState(false);

  if (mode === "hidden") return null;

  async function ask() {
    const asked = question.trim();
    if (!asked || busy) return;
    setBusy(true);
    setQuestion("");
    try {
      const response = await studyFetch("/api/llm", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({feature: "followup", question: asked, part, attempt}),
      });
      const data = await response.json();
      // A refusal is a sentence. No internal code ever reaches this panel (§4.1).
      const answer = response.ok ? data.text ?? ASK_DEGRADED[data.reason] ?? ASK_FAILED : data.error ? askReason({reason: data.error}) : ASK_FAILED;
      setLog(entries => [...entries, {q: asked, a: answer}]);
    } catch {
      setLog(entries => [...entries, {q: asked, a: ASK_FAILED}]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="askfab">
      {mode === "disabled" ? (
        <>
          <p className="askwhy">{reason ?? askReason({reason: "not_sealed"})}</p>
          <button className="fab off2" disabled>Ask</button>
        </>
      ) : (
        <>
          {open && (
            <div className="askpanel">
              <div className="ah">
                <b>Ask</b>
                <button className="ax" onClick={() => setOpen(false)} aria-label="Close">
                  <Icon name="close" />
                </button>
              </div>
              <div className="askbd">
                <div className="qa">
                  <div className="a">{askResting(!!part, concepts.length)}</div>
                </div>
                {concepts.length > 0 && (
                  <div className="qa">
                    {/* §14.2 makes `anchor` mandatory; the gloss is this
                        part's, not the session's, because `concepts` hangs on
                        the part. */}
                    <div className="q">Words this part uses</div>
                    {concepts.map(concept => (
                      <div className="a" key={concept.term}>
                        {/* Rendered as HTML so a command inside a sentence is
                            set as code and cannot be read as English. */}
                        <strong>{concept.term}</strong> — <Html text={concept.anchor} />
                        <br />
                        <Html text={concept.explain} />
                      </div>
                    ))}
                  </div>
                )}
                {log.map((entry, index) => (
                  <div className="qa" key={index}>
                    <div className="q">{entry.q}</div>
                    <div className="a">{entry.a}</div>
                  </div>
                ))}
              </div>
              <div className="askq">
                <div className="askrow">
                  <input
                    type="text"
                    value={question}
                    placeholder="Type a question"
                    onChange={event => setQuestion(event.target.value)}
                    onKeyDown={event => { if (event.key === "Enter") ask(); }}
                  />
                  <button className="go" disabled={busy || !question.trim()} onClick={ask}>Ask</button>
                </div>
              </div>
            </div>
          )}
          <button className="fab" aria-expanded={open} onClick={() => setOpen(!open)}>Ask</button>
        </>
      )}
    </div>
  );
}
