import Link from "next/link";
import AskBubble from "@/components/ask-bubble";
import { askReason } from "@/components/ask-reason";
import Shell from "@/components/shell";
import { Icon } from "@/components/icons";
import { Html } from "@/components/html";
import { redirect } from "next/navigation";
import { assistantState, getToday } from "@/lib/study/service";
import { StudyError } from "@/lib/study/types";
import { WEB } from "@/lib/mode";
import ReadingList from "@/components/reading-list";
import { withEmptyRecord } from "@/lib/study/web";

// One card, two doors. `/` shows the session Today is on; `/sessions/N` shows
// any written session she opens from the map. She looks at anything and works
// in order (DECISIONS 2026-11-10): a finished session is there to go over
// again, a session ahead is there to read and opens when the ones before it
// are done. Opening a card is a read: it changes nothing in her record.
export default async function SessionCard({viewing}: {viewing?: number}) {
  let today: Awaited<ReturnType<typeof getToday>>;
  try {
    today = await withEmptyRecord(() => getToday(viewing));
  } catch (error) {
    const message = error instanceof StudyError ? error.message : "Your study record could not be read. No automatic repair was attempted.";
    return (
      <Shell active={viewing === undefined ? "/" : "/curriculum"}>
        <h1>Your record could not be read</h1>
        <p className="inline miss" role="alert">{message}</p>
      </Shell>
    );
  }

  // Today's own session has one address — but on the web trial that address
  // is the page saying what the course is, so sending session 1 there would
  // bounce a visitor straight back off the door they just opened.
  if (!WEB && viewing !== undefined && today.viewing?.is_today) redirect("/");

  if (!today.session || !today.main) {
    const done = today.done_sessions ?? [];
    // The same rule as every other screen: a no-help check left open in a
    // session she went back to quiets Ask here too.
    // Same as the map: no record on the web trial, so nothing to read here.
    const ask = WEB ? {open: true, reason: ""} : await assistantState().catch(() => ({open: true, reason: ""}));
    return (
      <Shell active="/" bubble={<AskBubble mode={ask.open ? "live" : "disabled"} reason={askReason(ask)} />}>
        <h1>{today.completed ? "All twenty-one are done." : `Session ${today.plan.current_session} is not written yet.`}</h1>
        <p className="sub">
          {today.completed
            ? "What you can show for it is written up in study/evidence.md."
            : `Sessions 1 to ${today.authored_through} are done. You can re-read any of them while the next one is being written.`}
        </p>
        {done.length > 0 && (
          <div className="row">
            <Link className="go" href={`/sessions/${done[done.length - 1].session}`}>
              Re-read session {done[done.length - 1].session}
            </Link>
          </div>
        )}
        {today.board_damaged && <BoardDamaged />}
        {done.length > 0 && (
          <div className="parts">
            <span className="rl">What you have done</span>
            {done.map(entry => (
              <div className="prow" key={entry.session}>
                <span className="pn">{entry.session}</span>
                <span className="pt"><Link href={`/sessions/${entry.session}`}>{entry.title}</Link></span>
                <span className="pk">done</span>
              </div>
            ))}
          </div>
        )}
      </Shell>
    );
  }

  const {session, parts, wires, main, main_record, environment} = today;
  const view = today.viewing;
  const elsewhere = !!view && !view.is_today;
  // One obvious action, and it is the next thing to do — not the finished
  // part that happens to be expanded.
  const mainRow = parts.find(part => part.id === main.id) ?? parts[0];
  // With everything finished the one action is the main part's ending, not
  // "Start" on whichever part happens to be listed first.
  const nextPart = parts.find(part => !part.finished) ?? mainRow;
  const reading = main.reading ?? [];
  const minutes = reading.reduce((total, row) => total + row.minutes, 0);
  // `done` is a position in the list, not a step with a name, so it never
  // appears in the resume line and never counts toward the total.
  const finished = !!main_record?.finished_at || main_record?.step === "done";
  // A record exists the moment she opens the part, so "where you stopped" is
  // true from then on, not only once a step has been left.
  const allFinished = parts.every(part => part.finished);
  // The part in progress, if the next thing to do is one she has already
  // opened. It holds the screen's one filled button ("Pick it up"), whichever
  // kind it is: a no-help check one answer in is as much "where you stopped"
  // as a lab on its second step.
  const resume = nextPart.started ? nextPart : null;

  return (
    <Shell
      active={elsewhere ? "/curriculum" : "/"}
      block={session.block}
      blockName={session.block_name}
      session={session.session}
      bubble={
        <AskBubble
          mode={main.ai_allowed === false ? "hidden" : today.assistant?.open ? "live" : "disabled"}
          reason={askReason(today.assistant ?? {reason: "not_sealed"})}
          part={main.id}
          attempt={today.main_attempt}
        />
      }
    >
      {elsewhere && view && (
        <p className="viewing">
          <b>Session {session.session}</b>{" "}
          {view.again
            ? "You have done this one, and a part of it is being run again. Every part opens from the list below."
            : view.done
            ? "You have done this one. Every part opens again from the list below."
            : view.earlier_open.length
              // She can look at anything and she works in order: a session
              // ahead is here to read, and opens when the ones before it are
              // done.
              ? `You are looking ahead. This session opens once ${view.earlier_open.length === 1 ? "session" : "sessions"} ${
                  view.earlier_open.length > 1
                    ? `${view.earlier_open.slice(0, -1).join(", ")} and ${view.earlier_open[view.earlier_open.length - 1]}`
                    : view.earlier_open[0]
                } ${view.earlier_open.length === 1 ? "is" : "are"} finished; until then it is here to read.`
              : "This is not the session Today is on."}{" "}
          <Link href="/">
            {view.today <= today.authored_through ? `Today is session ${view.today}` : "Back to Today"}
          </Link>
        </p>
      )}
      <h1>{session.title}</h1>
      {session.subtitle && <p className="sub">{session.subtitle}</p>}

      {/* On the web trial this page is rendered without the visitor's record,
          so it cannot say where they stopped; the part itself can, because the
          record travels with the call (PUBLISH.md §6). */}
      {WEB && (
        <p className="viewing">
          This page shows the session as it looks before you start. The trial keeps your progress in this
          browser: open a part and it picks up where you left it, and{" "}
          <Link href="/board">the board</Link> reads the same record.
        </p>
      )}

      {main.why && (
        <div className="why">
          <span className="wl">Why this one is here</span>
          <Html text={main.why} />
        </div>
      )}

      {environment && (
        <>
          {(() => {
            // Three states, not two: the check can also fail to run, and that
            // is not the same as everything passing.
            if (!environment.report) {
              return (
                <p className="envline not-yet">
                  {/* On the web trial there is no machine of hers to read, and
                      the server's own is not an answer (PUBLISH.md §6). */}
                  {WEB
                    ? "This page cannot see your machine, so nothing here is measured. The setup check runs on your own computer, where the course is installed."
                    : <>
                        The setup check could not run just now.{" "}
                        {environment.ready
                          ? "The course environment is here; nothing is blocked."
                          : "The course environment is not here yet — session 1 is where it gets installed."}
                      </>}
                </p>
              );
            }
            const rows = environment.report.rows;
            // The terminal row is never `ok` — the app cannot see her shell —
            // so it is not one of the things to put right.
            const open = rows.filter(row => !row.ok && row.id !== "your-terminal");
            // Session 1's lab asks her to find which python3 runs, how many
            // there are and what architecture each is. The report is required
            // (§1.1) and must not answer that on the way in, so during session
            // 1 each open row shows what to do and not what it measured.
            const findings = session.session !== 1;
            return (
              <>
                <p className={open.length ? "envline not-yet" : "envline"}>
                  {environment.report.ok && <span className="tick"><Icon name="check" /></span>}
                  <span>
                  {/* During session 1 this line states no measurement: which
                      python3 answers and what it is built for is that
                      session's own task 3. */}
                  {open.length === 0
                    ? "Nothing the app can check needs putting right. What your own terminal is using, only you can check — below."
                    : session.session === 1
                      ? `${open.length} thing${open.length === 1 ? " is" : "s are"} not in place yet. Each row below says what to do.`
                      : `${open.length} thing${open.length === 1 ? "" : "s"} to put right. Each row says what to do.`}
                  </span>
                </p>
                {(
                  <section className="read envcheck">
                    <header className="rh">
                      <b>{findings ? "Your machine, one row per fact" : open.length ? "What is not in place yet" : "What only you can check"}</b>
                      <span>read, never changed — nothing here stops a session</span>
                    </header>
                    {/* Six package rows that all pass are six lines of noise
                        on the largest block of the home screen. */}
                    {(() => {
                      const packages = rows.filter(row => row.id.startsWith("package-"));
                      const same = open.length > 1
                        && open.every(row => row.command && row.command === open[0].command);
                      let shown = (findings ? rows : [...open, ...rows.filter(row => row.id === "your-terminal")])
                        .filter(row => !(row.id.startsWith("package-") && row.ok && packages.every(entry => entry.ok)));
                      // Seven rows whose cure is one command print it seven
                      // times. Name them together and give the command once.
                      if (same) {
                        shown = shown.filter(row => !open.includes(row) || row === open[0]);
                        shown = shown.map(row => row === open[0]
                          ? {...row, label: "The project environment and its packages",
                             detail: open.map(entry => entry.label).join(", ")}
                          : row);
                      }
                      return shown;
                    })().map(row => (
                      <div
                        className={`reading-row ${row.id === "your-terminal" ? "env-unknown" : row.ok ? "env-ok" : "env-miss"}`}
                        key={row.id}
                      >
                        <span className="env-label">
                          {row.id === "your-terminal" ? <span className="unknown">—</span>
                            : row.ok ? <Icon name="check" /> : <Icon name="close" />} {row.label}
                        </span>
                        {/* The terminal row measures nothing, so its reason is
                            shown in session 1 too: it cannot pre-answer task 3. */}
                        {(findings || row.id === "your-terminal") && (
                          <span className="reading-description">
                            {/* In session 1 the command would print which
                                python3 answers and what it is built for —
                                that session's own task 3. */}
                            {!findings && row.id === "your-terminal"
                              ? "This app cannot see it. Finding out is this session’s lab."
                              : row.detail}
                          </span>
                        )}
                        {row.command && (findings || row.id !== "your-terminal") && (
                          <span className="env-fix">
                            <pre>{row.command}</pre>
                            <small>{row.explanation}</small>
                          </span>
                        )}
                      </div>
                    ))}
                    {findings && rows.filter(row => row.id.startsWith("package-")).every(row => row.ok) && (
                      <div className="reading-row env-ok">
                        <span className="env-label"><Icon name="check" /> The course’s own Python has the six packages it pins</span>
                        <span className="reading-description">all present, at the pinned versions</span>
                      </div>
                    )}
                  </section>
                )}
              </>
            );
          })()}
        </>
      )}

      {reading.length > 0 && (
        <section className="read">
          <header className="rh">
            <b>Read this first</b>
            <span>{minutes} min · the material itself, not my summary of it</span>
          </header>
          {/* Her ticks and her note live here and nowhere else; the log
              page shows them all (owner, 2026-11-13). */}
          <ReadingList session={session.session} rows={reading} note />
        </section>
      )}

      {resume && (
        <div className="resume">
          <span className="rl">
            <span className="rk">Where you stopped{resume.id === main.id ? "" : ` · ${resume.title}`}</span>
            <span className="rt">
              Step {resume.step} of {resume.step_total} — {resume.step_name}
            </span>
          </span>
          <Link className="go" href={`/session/${resume.id}`}>Pick it up</Link>
        </div>
      )}

      <div className="parts">
        <span className="rl">
          This session has {parts.length === 3 ? "three" : parts.length === 4 ? "four" : parts.length} parts
        </span>
        {parts.map((part, index) => (
          <div
            // The marked row is the next thing to do, not the lab for ever.
            className={`prow${part.id === nextPart.id && !allFinished ? " now" : ""}${part.finished ? " done" : ""}`}
            key={part.id}
          >
            <span className="pn">{index + 1}</span>
            <span className="pt">
              {/* Every row opens its part, except the lab while its tasks
                  are set out in the panel below. */}
              {(part.id === main.id && !part.finished) || !part.open
                ? part.title
                : <Link href={`/session/${part.id}`}>{part.title}</Link>}
            </span>
            <span className="pk">
              {part.finished
                // The web trial's escape: done, and the lab was not run.
                ? part.lab_skipped ? `${part.kind_label} · done, not run` : `${part.kind_label} · done`
                : part.id === main.id
                  ? `${part.kind_label} · below`
                  : part.kind === "withdraw"
                    ? `${part.minutes} min${session.session === 1 ? " · at the end, this session only" : ""}`
                    : `${part.kind_label} · ${part.minutes} min`}
            </span>
          </div>
        ))}
        {session.session === 1 && !session.check_first && (
          <p className="undercode">
            Normally this check comes first and gates the session. Session 1 is the exception: nothing has been
            studied yet.
          </p>
        )}
      </div>

      {today.board_damaged && <BoardDamaged />}

      {wires.map(wire => (
        <div className="wire" key={wire.id} role="status">
          <b>Warning</b>
          <p>{wire.says}</p>
          {wire.consequence && <p className="undercode">{wire.consequence}</p>}
        </div>
      ))}

      {/* With the lab done and a later part in progress, the resume card above
          says everything this panel would: a header over an empty box. */}
      {!(resume && finished) && (
      <section className="panel">
        <header>
          <b>
            {main.kind === "lab"
              ? allFinished
                ? "The lab · finished"
                : finished
                  // The lab is done; the panel is now about what comes next.
                  ? `Next · ${nextPart.title}`
                  : `The lab · ${["", "one thing", "two things", "three things", "four things"][(main.tasks ?? []).length] ?? "stop anywhere"}, stop anywhere`
              : mainRow.title}
          </b>
          {/* The lab's sources belong under the lab's own header. */}
          {main.provenance && !(finished && !allFinished) && (
            <details className="source">
              <summary>
                Where this comes from <Icon name="chev" />
              </summary>
              <div className="srclist">
                {main.provenance.courses.map(course => (
                  <a className="chip src" key={course.url} href={course.url} target="_blank" rel="noreferrer">
                    {course.name} <Icon name="out" />
                  </a>
                ))}
              </div>
              <p>
                {main.provenance.level === "authored"
                  ? "Authored here for your own machine. The readings above are the material."
                  : main.provenance.level === "shaped"
                    ? "The skill and how hard it is come from those courses; this task was written here."
                    : "Taken from that course's own published material."}
                {" "}Checked {main.provenance.courses.map(course => course.checked).sort().slice(-1)[0]}.
              </p>
            </details>
          )}
        </header>
        <div className="panel-body">
          {main.setup && !finished && (
            <p className="sub">
              <Html text={main.setup} />
            </p>
          )}
          {!finished && (main.rules ?? []).length > 0 && (
            <div className="chips">
              {main.rules!.map((rule, position) => (
                <span key={rule} className={position === 0 ? "chip hot" : "chip"}>{rule}</span>
              ))}
            </div>
          )}
          {!finished && (main.tasks ?? []).length > 0 && (
            <div className="lad">
              {main.tasks!.map((task, index) => (
                <div className="rung" key={task.name}>
                  <span className="num">{index + 1}</span>
                  <div className="task-copy">
                    <b>{task.name}</b>
                    <p>
                      <Html text={task.brief} />
                    </p>
                    {(task.uses ?? []).length > 0 && <p className="uses">Uses: {task.uses!.join(" · ")}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* While the resume card is up it holds the one filled button; a
              second "Pick it up" here competed with it. */}
          <div className="row">
            {!resume && nextPart.open && (
              <Link className="go" href={`/session/${nextPart.id}`}>
                {allFinished ? "See how it ended" : nextPart.id === main.id ? "Begin" : "Start"}
              </Link>
            )}
            {!resume && nextPart.open && !allFinished && nextPart.id === main.id && (
              <span className="hint">It opens with a question.</span>
            )}
          </div>
        </div>
      </section>
      )}

      <p className="after">
        No clock on this card. The session is done when you can do the thing, whether that took forty minutes or
        three sittings.
      </p>
      {!elsewhere && today.sessions.length > 1 && (
        <p className="after">
          Every written session can be opened from <Link href="/curriculum">Curriculum</Link>: an earlier one
          to go over again, a later one to read ahead.
        </p>
      )}
    </Shell>
  );
}

function BoardDamaged() {
  return (
    <div className="wire" role="status">
      <b>Warning</b>
      <p>
        The record of what you can do on your own could not be read, and was kept with a .corrupt suffix.
        Everything else — your sessions, what you pasted, the mistake log — is intact.
      </p>
    </div>
  );
}
