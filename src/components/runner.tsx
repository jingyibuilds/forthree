"use client";
import { useCallback, useEffect, useState } from "react";
import { askReason } from "./ask-reason";
import Link from "next/link";
import AskBubble, { BubbleMode } from "./ask-bubble";
import TeacherNote from "./teacher-note";
import ReadingList from "./reading-list";
import Shell from "./shell";
import { Icon } from "./icons";
import { Html, HtmlFromRecord } from "./html";
import { WEB, studyFetch } from "@/lib/study-fetch";

type Task = {name: string; brief: string; passes_when?: string; guess?: boolean; uses: string[]};
type Course = {name: string; url: string; kind: string; checked: string};
type Part = {
  id: string; kind: string; session: number; block: string; ai_allowed: boolean;
  steps: string[]; step_labels: string[]; step_names: string[];
  why?: string; setup?: string; reading?: {title: string; url: string; teaches: string; minutes: number}[];
  goal?: string; target_note?: string;
  tasks?: Task[]; reference_card?: {label: string; code: string}[]; rules?: string[];
  predict?: {type: string; ask: string; options?: string[]; unit?: string; why_prompt: string};
  receipt_prompt?: string; receipt_hint?: string;
  compare?: {mine_label?: string; mine?: string; theirs_label?: string; theirs?: string; note: string; table?: string[][]; after?: string};
  concepts?: {term: string; anchor: string; explain: string}[];
  provenance?: {level: string; courses: Course[]};
  brief?: string; questions?: string[]; looks_for?: string[]; target_text?: string; target_locked?: boolean; target_kind?: string;
  product?: string; size?: string; scored?: boolean;
  teardown_fields?: string[];
  teardown_reveal?: {what_it_is: string; parts: {part: string; does: string}[]; flow?: string; tricky?: {what: string; why: string}[]};
  item_count?: number; needs_environment?: boolean; environment_ready?: boolean;
  setup_command?: string; activate_command?: string; venv_command?: string; packages_command?: string;
  reveal?: {picked: string; answer: string; right: boolean; because: string};
  pass_messages?: Record<string, string>;
  before_you_start?: string[];
};
type Run = {
  step: string; max_step: number;
  prediction?: {choice: number | null; value: number | null; why?: string; sealed_at: string};
  predict_result?: {correct: boolean};
  drawn?: string[]; items?: {item_id: string; answer: string; pass: boolean}[];
  answers?: Record<string, unknown>;
  receipt_raw?: string; checks?: {id: string; pass: boolean; message?: string}[];
  lab_skipped_at?: string;
  task_predictions?: {will_pass?: boolean; did_pass?: boolean}[];
  variant_result?: {choice: number; pass: boolean};
  mental_model?: string; finished_at?: string | null;
};
type Gated = {
  items?: {item_id: string; prompt: string; explain: string; explain_after?: number; answer: string; pass: boolean}[];
  variant?: {ask: string; options: string[]} | null;
};
// What `From before` showed in this attempt. The server fixes the list the
// first time the step is shown and stores her answers on it, so going back
// over a finished part shows what happened and nothing else.
type Resurfaced = {
  id: string; pool: string; kind: "recall" | "choice"; prompt: string;
  options?: string[]; part?: string; note?: string; cause?: "missed" | "paste";
  // A record from before answers here were kept: the ids and nothing else.
  legacy?: boolean;
  answered?: {pass: boolean; text?: string; choice?: number; explain?: string; explain_after?: number};
};
// An explanation that would give away a lab's guess she has not made yet.
const laterLine = (session: number) =>
  `The explanation opens once you have locked session ${session}’s guess — it would give that guess away.`;
type Summary = {
  board_damaged?: boolean;
  moved: {label: string; says: string; state: string}[];
  next_part: {id: string; title: string} | null;
  next_gate: number | null;
  board: {block: string; name: string; skills: {label: string; says: string; state: string}[]}[];
};

const STATE_WORDS: Record<string, string> = {none: "not started", borrowed: "with help", own: "on your own"};
// A part files one label against every failed check, so a correct-for-the-
// right-reason tap must not be replayed under "This one caught you".
const RIGHT_REASON = "I had it right, and for the right reason.";

// A refusal she can reach must say what to do next. Without this she reads the
// internal code — `not_sealed`, `invalid_body` — in a red box after pressing a
// button, which reads as her having done something wrong.
const SAY: Record<string, string> = {
  not_sealed: "Lock in your answer first, on step 1.",
  already_sealed: "That answer is already in. Carry on to the next step.",
  already_passed: "This one is already accepted. There is nothing more to paste.",
  already_skipped: "You moved past this lab without running it, so nothing more can be marked on it. Start it again to do it for real.",
  already_recorded: "That one is already answered.",
  already_finished: "This part is finished, so nothing here can be changed. Run it again to start a new try.",
  program_locked: "The program for this part is still closed. Lock this session’s lab guess first, then come back and finish.",
  already_predicted: "That guess is already in.",
  step_not_reached: "There is a step before this one. Use the numbers at the top.",
  receipt_not_accepted: "What you pasted has not been accepted yet. Fix it on the step before this one.",
  task_not_marked: "Mark at least one task yes or not yet first.",
  task_not_predicted: "Say yes or no to “will yours pass?” first.",
  answers_required: "Hand in what you named first.",
  invalid_body: "That did not save. Reload the page and try again — nothing was lost.",
  ai_not_allowed: "Ask is off for this part.",
  not_found: "That is not part of this semester. Go back to Today.",
  local_only: "This only runs on your own machine, at localhost:3000.",
  origin_rejected: "This only runs on your own machine, at localhost:3000.",
  store_busy: "Your record is busy. Try again; nothing was changed.",
  bank_short: "There are not enough unseen questions left for this check. Nothing was changed.",
  unsupported_check: "This one cannot be checked here. Nothing was changed.",
};
const say = (data: {error?: string; message?: string}) =>
  (data.error && SAY[data.error]) || data.message || "Could not save. Try again.";

export default function Runner({partId, blockName}: {partId: string; blockName: string}) {
  const [part, setPart] = useState<Part>();
  const [loaded, setRun] = useState<Run>();
  // A check has run out of unseen questions: running it again was refused, so
  // the control is withdrawn and the screen says why.
  const [exhausted, setExhausted] = useState(false);
  // A finished attempt is read-only (L-REC-03): its record always says `done`,
  // and going back over its steps is navigation on this screen that writes
  // nothing. `viewing` is the step being re-read; null is the done screen.
  const [viewing, setViewing] = useState<string | null>(null);
  const [gated, setGated] = useState<Gated>({});
  const [summary, setSummary] = useState<Summary | null>(null);
  const [assistant, setAssistant] = useState<{open: boolean; reason: string; session?: number}>({open: false, reason: "not_sealed"});
  // The session Today is on. A part opened from another session goes back to
  // that session's own card, not to Today.
  const [todaySession, setTodaySession] = useState<number>();
  // Where Today is now — it moves when the last part of its session finishes.
  // The way back keeps the first value; a sentence about Today uses this one.
  const [todayNow, setTodayNow] = useState<number>();
  const [resurfaced, setResurfaced] = useState<Resurfaced[]>([]);
  const [item, setItem] = useState<{index: number; total: number; item_id: string; prompt: string; answered: {answer: string; pass: boolean} | null} | null>(null);
  const [attempt, setAttempt] = useState(1);
  const [attemptsTotal, setAttemptsTotal] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [choice, setChoice] = useState<number | null>(null);
  const [quantity, setQuantity] = useState("");
  const [why, setWhy] = useState("");
  const [paste, setPaste] = useState("");
  const [answer, setAnswer] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [variantChoice, setVariantChoice] = useState<number | null>(null);
  const [again, setAgain] = useState<Record<string, string>>({});

  const path = useCallback((n: number) => `/api/part/${partId}/attempt/${n}`, [partId]);
  const draftKey = useCallback((n: number) => `forthree:${partId}:${n}:draft`, [partId]);

  const saveDraft = useCallback((n: number, value: Record<string, string>) => {
    try {
      const old = JSON.parse(sessionStorage.getItem(draftKey(n)) || "{}");
      sessionStorage.setItem(draftKey(n), JSON.stringify({...old, ...value}));
    } catch {
      /* Saved server evidence remains available if browser storage is off. */
    }
  }, [draftKey]);

  const load = useCallback(async (n: number) => {
    const response = await studyFetch(path(n), {cache: "no-store"});
    const data = await response.json();
    if (!response.ok) throw Error(say(data));
    let served: Part = data.part;
    let extras: Gated = {};
    const sealedEnough = served.kind !== "interview" && (
      data.record.prediction?.sealed_at
      || (served.kind === "withdraw" && (data.record.drawn ?? []).length > 0 && (data.record.drawn ?? []).length === (data.record.items ?? []).length)
      || (served.kind === "teardown" && served.scored === false));
    if (sealedEnough) {
      const open = await studyFetch(path(n) + "/beyond-predict", {cache: "no-store"});
      if (open.ok) {
        const body = await open.json();
        served = body.part;
        extras = {items: body.items, variant: body.variant};
      }
    }
    setPart(served);
    setRun(data.record);
    setViewing(null);
    // State that belongs to one try must not follow her into another.
    setVariantChoice(null);
    setAgain({});
    setGated(extras);
    setSummary(data.summary ?? null);
    setAssistant(data.assistant ?? {open: false, reason: "not_sealed"});
    // Kept from the first load: finishing the last part of Today's session
    // moves Today on, and that must not turn this screen's way back into
    // "Session N" on the part she was sent here to do.
    setTodaySession(previous => previous ?? data.today_session);
    setTodayNow(data.today_session);
    setResurfaced(data.resurface ?? []);
    setAttempt(n);
    setAttemptsTotal(data.attempts_total ?? n);
    setChoice(data.record.prediction?.choice ?? null);
    let draft: Record<string, string> = {};
    try { draft = JSON.parse(sessionStorage.getItem(draftKey(n)) || "{}"); } catch { /* storage off */ }
    setWhy(data.record.prediction?.why ?? draft.why ?? "");
    setPaste(data.record.receipt_raw ?? draft.paste ?? "");
    setQuantity(data.record.prediction?.value != null ? String(data.record.prediction.value) : draft.quantity ?? "");
    const stored = (data.record.answers ?? {}) as Record<string, unknown>;
    if (served.kind === "teardown") setFields({...((stored.recall as Record<string, string>) ?? {})});
    if (served.kind === "interview") setReplies({q1: String(stored.q1 ?? draft.q1 ?? ""), q2: String(stored.q2 ?? draft.q2 ?? ""), q3: String(stored.q3 ?? draft.q3 ?? "")});
    if (served.kind === "withdraw") {
      const next = (data.record.items ?? []).length;
      const total = (data.record.drawn ?? []).length;
      if (next < total) {
        const got = await studyFetch(path(n) + `/item/${next}`, {cache: "no-store"});
        setItem(got.ok ? await got.json() : null);
      } else setItem(null);
      setAnswer("");
    }
  }, [path, draftKey]);

  useEffect(() => {
    // A refused overview used to open attempt 1 silently, which with several
    // tries in play is the wrong one shown as current.
    studyFetch("/api/study/current", {cache: "no-store"})
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw Error(say(data));
        return load(data.plan?.current_attempt?.[partId] || 1);
      })
      .catch(problem => setError(problem instanceof Error ? problem.message : "Could not open your work."));
  }, [load, partId]);

  const frozen = !!loaded?.finished_at;
  const run: Run | undefined = loaded && frozen
    ? {...loaded, step: viewing ?? "done", max_step: Math.max(0, (part?.steps.length ?? 1) - 1)}
    : loaded;
  const step = run?.step ?? "predict";
  useEffect(() => { window.scrollTo({top: 0, behavior: "instant"}); }, [step]);

  async function send(action: string, body: unknown) {
    setBusy(true);
    setError("");
    try {
      const response = await studyFetch(path(attempt) + "/" + action, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw Error(say(data));
      await load(attempt);
      return data;
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not save. Try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  // Both pools grade a real answer; nothing here is cleared by a tap.
  async function answerResurface(entry: Resurfaced, body: {text?: string; choice?: number}) {
    setBusy(true);
    setError("");
    try {
      const response = await studyFetch(`/api/resurface/${entry.id}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({pool: entry.pool, part: partId, attempt, ...body}),
      });
      const data = await response.json();
      if (!response.ok) { setError(say(data)); return; }
      // The answer is stored on this attempt; read it back rather than
      // keeping a second copy here.
      await load(attempt);
    } catch {
      setError("Could not save that answer. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !part) {
    // Among other things, this is where a part that is not open yet lands:
    // the sentence says what it waits for, and its session's card is where it
    // can be read in the meantime.
    const ownSession = Number(partId.slice(1, 3));
    return (
      <Shell active="/" blockName={blockName}>
        <p className="inline miss" role="alert">{error}</p>
        <p className="after">
          {Number.isInteger(ownSession) && ownSession > 0 && <><Link href={`/sessions/${ownSession}`}>Session {ownSession}</Link> · </>}
          <Link href="/">{WEB ? "What this is" : "Today"}</Link>
        </p>
      </Shell>
    );
  }
  if (!part || !run) {
    return (
      <Shell active="/" blockName={blockName}>
        <p role="status">Opening your work…</p>
      </Shell>
    );
  }

  const steps = part.steps;
  const index = Math.max(0, steps.indexOf(run.step));
  const locked = !!run.prediction?.sealed_at;
  const passed = !!run.checks?.length && run.checks.every(check => check.pass);
  // The web trial's escape (PUBLISH.md §6): the lab was moved past unrun. It
  // is never set in her own copy.
  const skipped = !!run.lab_skipped_at;
  const atDone = run.step === "done";
  // An interview's answers are in once all three are long enough to be one.
  const saved = ["q1", "q2", "q3"].every(key => String(run.answers?.[key] ?? "").trim().length >= 20);
  const labels = part.step_labels;

  // §8: disabled with its reason while a guess is open; not rendered at all
  // during a no-help check, at `From before`, or in an interview. The state
  // and its reason come from the server's one rule (`assistantRule`), and the
  // sentence from `ask-reason.ts`.
  const bubble: BubbleMode =
    part.ai_allowed === false || (run.step === "resurface" && !frozen) || part.kind === "interview" ? "hidden"
      : assistant.open ? "live" : "disabled";

  // On a finished attempt a step change is this screen's own; otherwise it is
  // a transition the server records.
  const go = async (to: string) => {
    if (frozen) { setViewing(to === "done" ? null : to); return true; }
    return !!(await send("step", {step: to}));
  };
  // The one filled button moves on. While something on the step is still
  // unanswered it is drawn quiet, so skipping is never the screen's main
  // action (L-UI-03); on a finished attempt it only ever leads back.
  const next = (to: string, title = "Next", quiet = false) => (
    <button className={quiet ? "bk" : "go"} disabled={busy} onClick={() => go(to)}>
      {frozen && to === "done" ? "Back to the end" : title}
    </button>
  );

  // Where "back" goes: Today, when this part belongs to Today's session; that
  // session's own card when she opened it from the map.
  const away = todaySession !== undefined && part.session !== todaySession;
  const home = away
    ? {href: `/sessions/${part.session}`, label: `Session ${part.session}`}
    // On the web trial "/" is the page that says what this is, not Today.
    : {href: "/", label: WEB ? "What this is" : "Today"};

  // Her guess beside the answer, with why — on the compare step, and on the
  // guess step itself once her run is accepted (owner, 2026-11-11).
  const guessCard = part.reveal ? (
    <section className="guessbox">
      <p className="lbl">Your guess</p>
      <p className="pick">
        <b>You picked:</b> <Html text={part.reveal.picked} />
      </p>
      {!part.reveal.right && (
        <p className="pick">
          <b>The answer:</b> <Html text={part.reveal.answer} />
        </p>
      )}
      {part.reveal.because && <p><Html text={part.reveal.because} /></p>}
      {run.prediction?.why && (
        <blockquote>
          <b>Your reason</b>
          <p>{run.prediction.why}</p>
        </blockquote>
      )}
    </section>
  ) : null;

  return (
    <Shell
      active={away ? "/curriculum" : "/"}
      block={part.block}
      blockName={blockName}
      session={part.session}
      busy={busy}
      bubble={
        <AskBubble
          mode={bubble}
          concepts={part.concepts ?? []}
          part={part.id}
          attempt={attempt}
          reason={askReason(assistant)}
        />
      }
    >
      {error && (
        <p className="inline miss" role="alert">
          {error}{" "}
          {/* Only where trying again can work: a busy record or a dropped
              request. A refusal is an answer, and "Try again" under one was a
              button that could never do anything. */}
          {(error === SAY.store_busy || error.startsWith("Could not")) && (
            <button className="text-button" onClick={() => { setError(""); load(attempt).catch(problem => setError(problem.message)); }}>
              Try again
            </button>
          )}
        </p>
      )}

      {!atDone && (
        <>
          <ol className={labels.length > 1 ? "pips" : "pips single"}>
            {labels.map((label, position) => (
              <li key={label}>
                <button
                  disabled={busy || position > run.max_step}
                  className={position === index ? "pip on" : position <= run.max_step ? "pip reached" : "pip"}
                  aria-current={position === index ? "step" : undefined}
                  aria-label={`Step ${position + 1}: ${label}`}
                  onClick={() => go(steps[position])}
                >
                  {position < index && position <= run.max_step
                    ? <span className="tk"><Icon name="check" /></span>
                    : <span className="step-number">{position + 1}</span>}
                  <span className={position === index ? "step-word now" : "step-word"}> {label}</span>
                </button>
              </li>
            ))}
          </ol>
          {part.goal && <p className="goal"><b>By the end:</b> {part.goal}</p>}
          <div className="navline">
            {index === 0 ? (
              <Link className="bk" href={home.href}><Icon name="back" /> {home.label}</Link>
            ) : (
              <button className="bk" disabled={busy} onClick={() => go(steps[index - 1])}>
                <Icon name="back" /> Step {index}
              </button>
            )}
            {attempt > 1 && (
              <button className="text-button" disabled={busy} onClick={async () => {
                setBusy(true);
                try { await load(attempt - 1); } catch (problem) { setError(problem instanceof Error ? problem.message : "Could not open that try."); } finally { setBusy(false); }
              }}>
                Back to try {attempt - 1}
              </button>
            )}
            {locked && <span><Icon name="lock" /> Answer locked</span>}
          </div>
        </>
      )}

      {run.step === "predict" && part.predict && (
        <>
          <div className="ask">
            <Html text={part.predict.ask} />
          </div>
          {part.predict.type === "choice" ? (
            <div className="opts">
              {(part.predict.options ?? []).map((option, position) => (
                <label className={(choice === position ? "opt sel" : "opt") + (part.reveal?.answer === option ? " answer" : "")} key={option}>
                  <input
                    type="radio"
                    name="prediction"
                    checked={choice === position}
                    disabled={locked || busy}
                    onChange={() => setChoice(position)}
                  />
                  <span><Html text={option} /></span>
                </label>
              ))}
            </div>
          ) : (
            <p className="row">
              <input
                className="qty"
                type="number"
                value={quantity}
                disabled={locked || busy}
                onChange={event => { setQuantity(event.target.value); saveDraft(attempt, {quantity: event.target.value}); }}
              />
              <span className="hint">{part.predict.unit}</span>
            </p>
          )}
          <label className="sr-only" htmlFor="why">{part.predict.why_prompt}</label>
          <textarea
            id="why"
            value={why}
            disabled={locked || busy}
            readOnly={locked}
            placeholder={part.predict.why_prompt}
            onChange={event => { setWhy(event.target.value); saveDraft(attempt, {why: event.target.value}); }}
          />
          {guessCard}
          <div className="row">
            {locked ? next(steps[1], "Step 2") : (
              <button
                className="go"
                disabled={busy || (part.predict.type === "choice" ? choice === null : !quantity.trim())}
                onClick={async () => {
                  const body = part.predict!.type === "choice" ? {choice, why} : {value: Number(quantity), why};
                  if (await send("seal", body)) await go(steps[1]);
                }}
              >
                Lock in my answer
              </button>
            )}
            <span className="hint">{locked ? "Locked. Rereading is free." : "Then the tasks appear."}</span>
          </div>
        </>
      )}

      {run.step === "attempt" && part.kind === "lab" && (
        <>

          <h2>{["", "One thing", "Two things", "Three things", "Four things"][(part.tasks ?? []).length] ?? "In order"}, in order</h2>
          <p className="sub">In your terminal, not on this page. Do them in order: the paste at the bottom needs all of them.</p>
          {(part.rules ?? []).length > 0 && (
            <div className="chips">
              {/* Only the rule is an alarm; the other two are reassurance, and
                  cinnabar would read them as prohibitions. */}
              {part.rules!.map((rule, position) => (
                <span key={rule} className={position === 0 ? "chip hot" : "chip"}>{rule}</span>
              ))}
            </div>
          )}
          {(part.before_you_start ?? []).length > 0 && (
            <details className="refcard">
              <summary>
                <span className="rl">Never opened a terminal</span>
                <span className="refsum">{part.before_you_start!.length} lines <Icon name="chev" /></span>
              </summary>
              <div className="term">
                {part.before_you_start!.map(line => {
                  const [command, ...rest] = line.split(" — ");
                  return (
                    <div className="tl" key={line}>
                      <code>{command}</code>
                      <span className="tg">{rest.join(" — ")}</span>
                    </div>
                  );
                })}
              </div>
            </details>
          )}
          {part.needs_environment && part.activate_command && (
            <div className="refcard">
              {part.environment_ready === false ? (
                <>
                  <span className="rl">This one needs Python 3.12 or newer, with the course’s packages</span>
                  <p className="undercode">The course’s Python is not on this machine yet. This installs it, and prints each step as it goes:</p>
                  <pre>{part.setup_command}</pre>
                  <p className="undercode">Then make your lab environment from it: the environment check on Today shows the commands.</p>
                </>
              ) : (
                <>
                  <span className="rl">This one runs in your lab environment, with the course’s packages</span>
                  <pre>{"cd ~/cs-core\nsource .venv/bin/activate"}</pre>
                  <p className="undercode">That goes to your lab folder and switches this terminal to its Python. If <code>python3 --version</code> there is older than 3.12, the environment check on Today shows how to make a newer one.</p>
                  {/* What the environment must contain is on the part that needs it,
                      with the one command (REBUILD.md R8). */}
                  {part.packages_command && (
                    <>
                      <p className="undercode">Once, with that environment switched on: this installs the packages the course uses, numpy among them, at the versions the course was measured with.</p>
                      <pre>{part.packages_command}</pre>
                    </>
                  )}
                </>
              )}
            </div>
          )}
          {(part.reading ?? []).length > 0 && (
            <details className="refcard">
              <summary>
                <span className="rl">Read this first</span>
                <span className="refsum">
                  {part.reading!.reduce((total, row) => total + row.minutes, 0)} min <Icon name="chev" />
                </span>
              </summary>
              {part.reading!.map(row => (
                <div className="refrow" key={row.url}>
                  <span>{row.teaches}</span>
                  <p>
                    <a href={row.url} target="_blank" rel="noreferrer">{row.title} <Icon name="out" /></a>
                  </p>
                </div>
              ))}
            </details>
          )}
          <div className="lad">
            {(part.tasks ?? []).map((task, position) => (
              <div
                className={task.guess && run.task_predictions?.[position]?.will_pass === undefined ? "rung hi" : "rung"}
                key={task.name}
              >
                <span className="num">{position + 1}</span>
                <div className="task-copy">
                  <b>{task.name}</b>
                  <p><Html text={task.brief} /></p>
                  {task.uses.length > 0 && (
                    <p className="uses">Uses:{" "}
                      {task.uses.map((use, at) => (
                        <span key={use}>{at ? " · " : ""}{use === "the reference card on this page" ? <a href="#card">{use}</a> : use}</span>
                      ))}
                    </p>
                  )}
                  {task.guess && run.task_predictions?.[position]?.will_pass === undefined ? (
                    <div className="pass">
                      Guess first: will this one work when you run it?{" "}
                      <button disabled={busy || frozen || skipped} onClick={() => send(`task/${position}`, {will_pass: true})}>yes</button>{" "}
                      <button disabled={busy || frozen || skipped} onClick={() => send(`task/${position}`, {will_pass: false})}>no</button>
                    </div>
                  ) : (
                    <p className="pass"><b>Passes when</b> <Html text={task.passes_when} /></p>
                  )}
                  {/* The outcome is asked only once the guess for that task
                      is in, so it can never be answered before the guess. */}
                  {(!task.guess || run.task_predictions?.[position]?.will_pass !== undefined) && (
                    <div className="pass">
                      Did it work?{" "}
                      <button
                        disabled={busy || passed || skipped}
                        aria-pressed={run.task_predictions?.[position]?.did_pass === true}
                        onClick={() => send(`task/${position}`, {did_pass: true})}
                      >yes</button>{" "}
                      <button
                        disabled={busy || passed || skipped}
                        aria-pressed={run.task_predictions?.[position]?.did_pass === false}
                        onClick={() => send(`task/${position}`, {did_pass: false})}
                      >not yet</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {/* Open, and the target of "Uses: the reference card": a task that
              needs it once pointed at a card folded shut below the tasks. */}
          <details className="refcard" id="card" open>
            <summary>
              <span className="rl">Reference card</span>
              <span className="refsum">{(part.reference_card ?? []).length} lines of syntax <Icon name="chev" /></span>
            </summary>
            {(part.reference_card ?? []).map(row => (
              <div className="refrow" key={row.label}>
                <span>{row.label}</span>
                <pre>{row.code}</pre>
              </div>
            ))}
            <p className="undercode">
              Syntax only — never this task’s own data, and never the shape of the answer. What the card does not
              give you is the part you are here to work out.
            </p>
          </details>
{part.provenance && (
            <details className="refcard">
              <summary>
                <span className="rl">Where this comes from</span>
                <span className="refsum">
                  {part.provenance.level === "authored" ? "authored here"
                    : part.provenance.level === "shaped" ? "shaped by the courses below"
                      : "from the course below"} <Icon name="chev" />
                </span>
              </summary>
              <div className="srclist">
                {part.provenance.courses.map(course => (
                  <a className={course.kind === "catalog" ? "chip src weaker" : "chip src"}
                     key={course.url + course.name} href={course.url} target="_blank" rel="noreferrer">
                    {course.name} <Icon name="out" />
                    {course.kind === "catalog" && <em> catalog only</em>}
                  </a>
                ))}
              </div>
              <p className="undercode">
                Each link was checked on {part.provenance.courses.map(course => course.checked).sort().slice(-1)[0]}.
                {part.provenance.courses.some(course => course.kind === "catalog")
                  && " A catalog entry proves the subject exists, not what it teaches."}
              </p>
            </details>
          )}
          <label className="receipt-label" htmlFor="receipt"><Html text={part.receipt_prompt} /></label>
          <textarea
            id="receipt"
            value={paste}
            readOnly={passed || skipped}
            placeholder={part.receipt_hint}
            onChange={event => { setPaste(event.target.value); saveDraft(attempt, {paste: event.target.value}); }}
          />
          {run.checks?.map(check => (
            <p className={check.pass ? "inline good" : "inline miss"} key={check.id}>
              {/* Out of the record, so on the trial it is whatever file the
                  visitor loaded: sanitized, not trusted. */}
              <Icon name={check.pass ? "check" : "close"} /> <HtmlFromRecord text={check.message} />
            </p>
          ))}
          <div className="row">
            {passed || skipped ? next(steps[index + 1], skipped ? "Read the explanation" : "See the explanation") : (
              <button
                className="go"
                disabled={busy || frozen || !paste.trim() || !run.task_predictions?.some(task => task.did_pass !== undefined)}
                onClick={() => send("receipt", {raw: paste})}
              >
                Check it
              </button>
            )}
            {!passed && !skipped && <span className="hint">Paste what came back. Mark at least one task above.</span>}
            {/* No terminal and no course Python on a web page, so the trial
                lets a visitor past the lab and keeps that it was not run. */}
            {WEB && !passed && !skipped && (
              <button className="secondary" disabled={busy || frozen} onClick={() => send("skip-lab", {})}>
                I can’t run this here
              </button>
            )}
          </div>
        </>
      )}

      {run.step === "attempt" && part.kind === "teardown" && part.scored === false && (
        <>
          <h2>{part.product}</h2>
          <p className="sub">{part.teardown_reveal?.what_it_is}</p>
          {part.why && (
            <div className="why">
              <span className="wl">Why this one is here</span>
              <Html text={part.why} />
            </div>
          )}
          {(part.reading ?? []).length > 0 && (
            <section className="read">
              <header className="rh">
                <b>Read this</b>
                <span>{part.reading!.reduce((total, row) => total + row.minutes, 0)} min</span>
              </header>
              {/* A teardown's readings are first given here, so their ticks
                  are here; the session's note is on the session page. */}
              <ReadingList session={part.session} rows={part.reading!} />
            </section>
          )}
          <div className="panel">
            <header><b>Its parts, and what each one does</b></header>
            <div className="panel-body">
              {(part.teardown_reveal?.parts ?? []).map(row => (
                <div className="refrow" key={row.part}>
                  <span>{row.part}</span>
                  <p>{row.does}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="row">{next("done", "Done reading")}</div>
        </>
      )}

      {run.step === "attempt" && part.kind === "teardown" && part.scored === true && (
        <>
          <h2>{part.product}</h2>
          <p className="sub">Nothing open. Write what you can name, then the list appears.</p>
          {part.why && (
            <div className="why">
              <span className="wl">Why this one is here</span>
              <Html text={part.why} />
            </div>
          )}
          {(part.teardown_fields ?? []).map(field => (
            <div key={field}>
              <label className="receipt-label" htmlFor={`f-${field}`}>{field}</label>
              <textarea
                id={`f-${field}`}
                value={fields[field] ?? ""}
                readOnly={frozen}
                onChange={event => setFields({...fields, [field]: event.target.value})}
              />
            </div>
          ))}
          <div className="row">
            {frozen ? next(steps[index + 1]) : (
              <button className="go" disabled={busy} onClick={async () => {
                if (await send("answers", {recall: fields})) await go(steps[index + 1]);
              }}>Hand it in</button>
            )}
          </div>
        </>
      )}

      {run.step === "attempt" && part.kind === "withdraw" && (
        <>
          <h2>No-help check</h2>
          <p className="sub">
            Nothing open: no notes, no AI. {(run.items ?? []).length} of {(run.drawn ?? []).length} answered.
          </p>
          {item ? (
            <>
              <div className="ask"><Html text={item.prompt} /></div>
              <textarea
                key={item.item_id}
                id="item"
                value={answer}
                readOnly={busy}
                placeholder="Your answer"
                onChange={event => setAnswer(event.target.value)}
              />
              <div className="row">
                <button
                  className="go"
                  disabled={busy || !answer.trim()}
                  onClick={async () => {
                    // The last answer goes straight to the comparison: a
                    // click that only moved the engine on was one too many
                    // (owner, 2026-11-11; L-UI-11).
                    const at = item.index;
                    const last = (run.items ?? []).length + 1 >= (run.drawn ?? []).length;
                    setAnswer("");
                    const sealed = await send(`item/${at}/seal`, {text: answer});
                    if (sealed && last) await go(steps[index + 1]);
                  }}
                >
                  {busy ? "Locking it in…" : "Lock in my answer"}
                </button>
                <span className="hint">One answer at a time. You cannot come back to it.</span>
              </div>
            </>
          ) : (
            <div className="row">{next(steps[index + 1], "See how it went")}</div>
          )}
        </>
      )}

      {run.step === "attempt" && part.kind === "interview" && (
        <>
          <h2>Talk through someone else’s code</h2>
          {part.brief && <p className="sub"><Html text={part.brief} /></p>}
          {/* Two questions without the program, then the program, open, with
              its note beside it, then the third (REBUILD.md, R2): a box at the
              end headed "for question 3" read as context for 3 alone. */}
          <h3 className="qhead">First, without the program</h3>
          {(part.questions ?? []).map((question, position) => (
            <div key={question}>
            {position === 2 && (
              <>
                {part.target_locked ? (
                  <div className="refcard">
                    <span className="rl">The program</span>
                    <p className="undercode">
                      It opens once you have locked this session&rsquo;s guess in the lab — it gives that answer away.
                    </p>
                  </div>
                ) : (
                  <div className="refcard program">
                    <span className="rl">Now read the program</span>
                    {part.target_note && <p className="undercode"><Html text={part.target_note} /></p>}
                    <pre>{part.target_text}</pre>
                  </div>
                )}
                <h3 className="qhead">Then, with the program in front of you</h3>
              </>
            )}
            <div key={question}>
              <label className="receipt-label" htmlFor={`q${position + 1}`}>{position + 1}. {question}</label>
              <textarea
                id={`q${position + 1}`}
                value={replies[`q${position + 1}`] ?? ""}
                // Question 3 is about the program; with it closed there is
                // nothing to walk through yet.
                readOnly={frozen || (position === 2 && !!part.target_locked)}
                onChange={event => {
                  const updated = {...replies, [`q${position + 1}`]: event.target.value};
                  setReplies(updated);
                  saveDraft(attempt, updated);
                }}
              />
            </div>
            </div>
          ))}
          {part.looks_for && (
            <div className="panel">
              <header><b>What each question was getting at</b></header>
              <div className="panel-body">
                {part.looks_for.map((line, position) => (
                  <p className="looked-for" key={position}>
                    <b>{position + 1}</b> <Html text={line} />
                  </p>
                ))}
                <p className="undercode">
                  {frozen
                    ? "Nothing here is scored. Read it against what you wrote."
                    : "Nothing here is scored. Read it against what you wrote, and add to your answers if you want to."}
                </p>
              </div>
            </div>
          )}
          {!frozen && !saved && !part.target_locked && (
            <p className="undercode">
              Write a sentence or two for each, then save. Nothing is kept until you press Save my answers.
            </p>
          )}
          {!frozen && part.target_locked && (
            <p className="undercode">
              Questions 1 and 2 can be written now. Question 3, and finishing this part, wait for the program — it
              opens once this session’s lab guess is locked.
            </p>
          )}
          <div className="row">
            {/* Save and stay: the three lines this part can give back are on
                this screen, and saving used to leave it in the same click. A
                finished interview is read-only and only leads back. */}
            {frozen ? next("done") : part.target_locked ? (
              <button className="bk" disabled={busy} onClick={() => send("answers", replies)}>Save what I have</button>
            ) : saved ? (
              <>
                <button className="go" disabled={busy} onClick={async () => {
                  // She is invited to add to her answers after reading these,
                  // so finishing saves what is in the boxes first.
                  if (await send("answers", replies)) await go(steps[index + 1]);
                }}>
                  Done with this part
                </button>
                <button className="bk" disabled={busy} onClick={() => send("answers", replies)}>Save again</button>
              </>
            ) : (
              <button
                className="go"
                disabled={busy || !["q1", "q2", "q3"].every(key => (replies[key] ?? "").trim().length >= 20)}
                onClick={() => send("answers", replies)}
              >
                Save my answers
              </button>
            )}
          </div>
        </>
      )}

      {run.step === "compare" && part.kind === "lab" && part.compare && (
        <>
          <h2>{skipped ? "What this lab shows" : "Your result, explained"}</h2>
          {/* One reading order (owner, 2026-11-11): her run, then her guess
              beside the answer, then the reference panes, quieter, then the
              margin note. Nothing here says "wrong". */}
          <section className="yours">
            <div className={skipped ? "verdict" : "verdict good"}>
              <span className="big">{skipped ? "You did not run this lab" : "Output accepted"}</span>
              {skipped && (
                <span>
                  The labs are run in a terminal against the course’s own Python, and this page has
                  neither. What follows is still worth reading; the result it explains is one you have
                  not seen.
                </span>
              )}
              {/* Today's wording for each check she passed, not the wording
                  saved when it was graded (review, 2026-11-11). */}
              {!skipped && (run.checks ?? []).filter(check => check.pass).map(check => (
                // A check that no longer exists (an attempt made before a
                // rebuild) keeps only "Output accepted": its old wording may
                // no longer be true.
                part.pass_messages && !(check.id in part.pass_messages) ? null :
                // The served wording is this repository's; the stored one is
                // the record's, so only the first is trusted as markup.
                <span key={check.id}>{part.pass_messages?.[check.id] !== undefined
                  ? <Html text={part.pass_messages[check.id]} />
                  : <HtmlFromRecord text={check.message} />}</span>
              ))}
            </div>
            {/* Nothing was pasted and there is no result of hers to explain. */}
            {!skipped && (
              <>
                <p className="lbl">What you pasted</p>
                <pre>{run.receipt_raw}</pre>
                {part.ai_allowed !== false && <TeacherNote part={part.id} attempt={attempt} />}
              </>
            )}
          </section>
          {guessCard}
          {/* Reference panes only where the chain makes them evidence (REBUILD.md, R2). */}
          {(part.compare.mine || part.compare.theirs || part.compare.table) && (
            <section className="refs">
              <p className="refh">For comparison: not your run</p>
              <div className="code2">
                <div>
                  <p className="lbl">{part.compare.mine_label}</p>
                  <pre><Html text={part.compare.mine} /></pre>
                </div>
                <div>
                  <p className="lbl">{part.compare.theirs_label}</p>
                  <pre><Html text={part.compare.theirs} /></pre>
                </div>
              </div>
              {part.compare.table && (
                <table className="wk">
                  <tbody>
                    {part.compare.table.map((row, position) => (
                      <tr key={position}>
                        {row.map((cell, column) =>
                          position === 0 ? <th key={column}>{cell}</th> : <td key={column}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          )}
          <div className="note">
            <b className="nh">Why it works this way</b>
            <Html text={part.compare.note} />
            {part.compare.after && <p><Html text={part.compare.after} /></p>}
          </div>
          {gated.variant && (
            <div className="panel">
              <header><b>One more, in a different setting</b></header>
              <div className="panel-body">
                <div className="ask"><Html text={gated.variant.ask} /></div>
                <div className="opts">
                  {gated.variant.options.map((option, position) => (
                    <label className={variantChoice === position ? "opt sel" : "opt"} key={option}>
                      <input
                        type="radio"
                        name="variant"
                        disabled={busy || frozen || !!run.variant_result}
                        checked={run.variant_result ? run.variant_result.choice === position : variantChoice === position}
                        onChange={() => setVariantChoice(position)}
                      />
                      <span><Html text={option} /></span>
                    </label>
                  ))}
                </div>
                {run.variant_result ? (
                  <p className={run.variant_result.pass ? "inline good" : "inline miss"}>
                    <Icon name={run.variant_result.pass ? "check" : "close"} />{" "}
                    {run.variant_result.pass
                      ? "Right, in a setting you had not seen."
                      : "Not that one. It is the same question as above, moved."}
                  </p>
                ) : (
                  <button className="bk" disabled={busy || frozen || variantChoice === null} onClick={() => send("variant", {choice: variantChoice})}>
                    Answer
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="row">{next(steps[index + 1], "Next", !frozen && !!gated.variant && !run.variant_result)}</div>
        </>
      )}

      {run.step === "compare" && part.kind === "withdraw" && (
        <>
          <h2>How it went</h2>
          <p className="sub">
            {(run.items ?? []).filter(entry => entry.pass).length} of {(run.items ?? []).length} right.
          </p>
          {(gated.items ?? []).map((entry, position) => (
            <div className="panel" key={entry.item_id}>
              <header>
                <b>Question {position + 1}</b>
                <span className={entry.pass ? "pill right" : "pill wrong"}>{entry.pass ? "right" : "not right"}</span>
              </header>
              <div className="panel-body">
                {/* A whole question read back is a sentence, not a heading. */}
                <p className="asked"><Html text={entry.prompt} /></p>
                <blockquote>
                  <b>You wrote</b>
                  <p>{entry.answer}</p>
                </blockquote>
                {entry.explain_after
                  ? <p className="undercode">{laterLine(entry.explain_after)}</p>
                  : <p><Html text={entry.explain} /></p>}
              </div>
            </div>
          ))}
          <div className="row">{next(steps[index + 1])}</div>
        </>
      )}

      {run.step === "compare" && part.kind === "teardown" && (
        <>
          <h2>{part.product}, from its own sources</h2>
          <div className="code2">
            <div>
              <p className="lbl">What you named</p>
              <pre>{String((run.answers?.recall as Record<string, string>)?.parts ?? "")}</pre>
            </div>
            <div>
              <p className="lbl">Its parts</p>
              <pre>{(part.teardown_reveal?.parts ?? []).map(row => `${row.part} — ${row.does}`).join("\n")}</pre>
            </div>
          </div>
          <div className="row">{next(steps[index + 1])}</div>
        </>
      )}

      {run.step === "resurface" && (
        <>
          <h2>From before</h2>
          {resurfaced.length > 0 && (
            <p className="sub">
              {["", "One thing", "Two things", "Three things"][resurfaced.length] ?? "A few things"} you have already
              met.
            </p>
          )}
          {resurfaced.length === 0 && <p className="inline">Nothing came back this time.</p>}
          {resurfaced.map(entry => {
            const done = entry.answered;
            const closed = !!done || !!run.finished_at;
            return (
              <div className="panel" key={entry.id}>
                <header>
                  <b>
                    {entry.legacy ? "This came back here"
                      : done
                      // "Again" is true of something she had right before: a
                      // pool-B item, and a lab's guess that is back only
                      // because a paste was sent back.
                      ? entry.pool === "B" || entry.cause === "paste"
                        ? done.pass ? "Right, again" : "Not this time"
                        : done.pass ? "Right this time" : "Still not this one"
                      : entry.pool === "B" ? "You had this one right"
                        : entry.kind === "recall" ? "You missed this one"
                          : entry.cause === "paste" ? "From a lab where your paste was sent back" : "This one caught you"}
                  </b>
                </header>
                <div className="panel-body">
                  <div className="ask"><Html text={entry.prompt} /></div>
                  {entry.note && entry.note !== RIGHT_REASON && (
                    <p className="undercode">What you said last time: {entry.note}</p>
                  )}
                  {entry.kind === "choice" ? (
                    <div className="opts">
                      {(entry.options ?? []).map((option, position) => (
                        <label className="opt" key={option}>
                          <input
                            type="radio"
                            name={`rs-${entry.id}`}
                            disabled={busy || closed}
                            checked={done ? done.choice === position : undefined}
                            onChange={() => answerResurface(entry, {choice: position})}
                          />
                          <span><Html text={option} /></span>
                        </label>
                      ))}
                    </div>
                  ) : entry.legacy ? null : closed ? (
                    <blockquote>
                      <b>You wrote</b>
                      <p>{done?.text ?? "Nothing — you left this one."}</p>
                    </blockquote>
                  ) : (
                    <>
                      <label className="sr-only" htmlFor={`rs-${entry.id}`}>Your answer</label>
                      <textarea
                        id={`rs-${entry.id}`}
                        className="one-line"
                        value={again[entry.id] ?? ""}
                        placeholder="Your answer"
                        onChange={event => setAgain({...again, [entry.id]: event.target.value})}
                      />
                      <div className="row">
                        <button
                          className="bk"
                          disabled={busy || !(again[entry.id] ?? "").trim()}
                          onClick={() => answerResurface(entry, {text: again[entry.id]})}
                        >
                          Answer
                        </button>
                      </div>
                    </>
                  )}
                  {done && (
                    <>
                      <p className={done.pass ? "inline good" : "inline miss"}>
                        <Icon name={done.pass ? "check" : "close"} />{" "}
                        {done.pass
                          ? entry.kind === "recall" ? "Right. It comes back once more, later." : "Right. It will not come back."
                          : "Not that one. It comes back later."}
                      </p>
                      {done.explain_after
                        ? <p className="undercode">{laterLine(done.explain_after)}</p>
                        : done.explain && <p className="undercode"><Html text={done.explain} /></p>}
                    </>
                  )}
                  {entry.legacy ? (
                    <p className="undercode">This part was finished before answers on this step were kept.</p>
                  ) : !done && frozen && entry.kind === "choice" && (
                    <p className="undercode">You left this one unanswered.</p>
                  )}
                </div>
              </div>
            );
          })}
          <div className="row">
            {next("done", "Finish this part", !frozen && resurfaced.some(entry => !entry.answered))}
          </div>
        </>
      )}

      {atDone && (
        <>
          <h1>This part is done.</h1>
          {summary && summary.moved.length > 0 ? (
            summary.moved.map(skill => (
              <p className="inline good" key={skill.label}>
                <Icon name="check" /> <b>{skill.label}</b> — {skill.says}: now <b>{STATE_WORDS[skill.state]}</b>.
              </p>
            ))
          ) : summary?.board_damaged ? (
            <div className="wire" role="status">
              <b>Warning</b>
              <p>
                The record of what you can do on your own could not be read, so this screen cannot say whether a
                skill moved. This part is saved, and so is everything else.
              </p>
            </div>
          ) : null}
          {part.kind === "teardown" && part.scored && part.teardown_reveal && (
            <div className="panel">
              <header><b>What {part.product} is made of</b></header>
              <div className="panel-body">
                {part.teardown_reveal.parts.map(row => (
                  <div className="refrow" key={row.part}>
                    <span>{row.part}</span>
                    <p>{row.does}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {part.kind === "interview" && (part.questions ?? []).length > 0 && (
            <div className="panel">
              <header><b>What you said</b></header>
              <div className="panel-body">
                {part.questions!.map((question, position) => (
                  <div key={question}>
                    <p className="asked">{question}</p>
                    <blockquote><p>{String((run.answers ?? {})[`q${position + 1}`] ?? "")}</p></blockquote>
                  </div>
                ))}
              </div>
            </div>
          )}
          {summary && summary.moved.length > 0 && (
            <>
              <div className="board">
                {summary.board.map(block => (
                  <div className="blk" key={block.block}>
                    <div className="n"><span className="bid">{block.block}</span> {block.name}</div>
                    <div className="bars">
                      {block.skills.map((skill, position) => (
                        <div className="bar2" key={position}>
                          <span className="bl">
                            <span className="bh">{skill.label}</span>
                            <span className="bx">{skill.says}</span>
                          </span>
                          <span className={skill.state === "own" ? "pill solo" : skill.state === "borrowed" ? "pill help" : "pill"}>
                            {STATE_WORDS[skill.state]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="key">
                <span><i className="k0" />not started</span>
                <span><i className="k1" />with help — notes open</span>
                <span><i className="k2" />on your own — no notes, a question you had not seen</span>
              </div>
            </>
          )}
          <div className="row">
            {summary?.next_part
              ? <Link className="go" href={`/session/${summary.next_part.id}`}>Next: {summary.next_part.title}</Link>
              : <Link className="go" href={home.href}>{home.label}</Link>}
            <button className="bk" disabled={busy} onClick={() => go(steps[steps.length - 2])}>
              Back to the last step
            </button>
            {summary?.next_part && <Link className="bk" href={home.href}>{home.label}</Link>}
            {attempt > 1 && (
              <button
                className="text-button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try { await load(attempt - 1); } catch (problem) { setError(problem instanceof Error ? problem.message : "Could not open that try."); } finally { setBusy(false); }
                }}
              >
                Back to try {attempt - 1}
              </button>
            )}
            {/* From an earlier try this would reopen the later one, not start
                a new one, so it only offers from the latest. */}
            {attempt < attemptsTotal ? (
              <button
                className="text-button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try { await load(attemptsTotal); } catch (problem) { setError(problem instanceof Error ? problem.message : "Could not open that try."); } finally { setBusy(false); }
                }}
              >
                Forward to try {attemptsTotal}
              </button>
            ) : exhausted ? (
              <span className="hint">There are no unseen questions left to run this check again.</span>
            ) : (
            <button
              className="text-button"
              disabled={busy}
              onClick={async () => {
                // A new attempt starts empty and Today then offers it again,
                // so say what it costs before it happens.
                if (!window.confirm(
                  `Start this part again from step 1?\n\nThis try stays saved — "Back to try ${attempt}" sits at the `
                  + `top of every step of the new one. ${
                    todayNow !== undefined && part.session !== todayNow
                      ? `Session ${part.session}’s card`
                      : WEB ? "The session’s card" : "Today"
                  } will offer `
                  + "the new try until you finish it.",
                )) return;
                setBusy(true);
                try { await load(attempt + 1); } catch (problem) {
                  const message = problem instanceof Error ? problem.message : "Could not open that try.";
                  if (message === SAY.bank_short) setExhausted(true);
                  setError(message);
                } finally { setBusy(false); }
              }}
            >
              Run it again from the start
            </button>
            )}
          </div>
        </>
      )}
    </Shell>
  );
}
