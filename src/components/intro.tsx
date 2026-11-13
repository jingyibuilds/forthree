import Link from "next/link";
import RecordKeeper from "@/components/record-keeper";
import Shell from "@/components/shell";
import { Icon } from "@/components/icons";
import { loadBlocks } from "@/lib/study/content";

// The front door of the public web trial (PUBLISH.md §6), and the only screen
// that exists for it. Her own copy opens on Today: she knows what this is.
// A visitor does not, so this page answers three things before it offers a
// door — what the course is for, why it is one line rather than a library, and
// exactly what the trial can and cannot do.
export default async function Intro() {
  const blocks = await loadBlocks();
  const sessions = blocks.flatMap(block => block.sessions).sort((left, right) => left.session - right.session);
  const first = sessions[0];

  return (
    <Shell active="/">
      <h1>Twenty-one sessions, one line through.</h1>
      <p className="sub">
        A computer-science semester for someone who already does the work: statistics, machine learning, SQL,
        and an AI that writes code faster than you can judge it. This course builds the judging.
      </p>

      <div className="why">
        <span className="wl">Why it is one line</span>
        <p>
          MIT&rsquo;s course is good. So is CS50. You cannot tell whether either is worth finishing until you
          have finished it, and the first evening that gets hard you open a second document, then a third.
        </p>
        <p>
          The reading was done once, against a map of what a data person is actually missing. What survived is
          twenty-one sessions in a fixed order, each hard enough to be worth an evening and small enough to
          finish in one. When a session gets hard, the thread back is the next part of it — not another
          document.
        </p>
      </div>

      <section className="read">
        <header className="rh">
          <b>How a session goes</b>
          <span>four parts, about ninety minutes</span>
        </header>
        <div className="reading-row">
          <span className="env-label">You guess first</span>
          <span className="reading-description">
            Before any explanation is on the screen. Nothing you read beforehand gives the answer away.
          </span>
        </div>
        <div className="reading-row">
          <span className="env-label">You run the lab in your own terminal</span>
          <span className="reading-description">
            The app never runs your code. You run it, paste back what it printed, and a deterministic check
            reads that.
          </span>
        </div>
        <div className="reading-row">
          <span className="env-label">You take a check with no notes open</span>
          <span className="reading-description">
            A question you have not seen, from a sealed bank. It is the only thing that moves the board from
            <i> with help</i> to <i>on your own</i>.
          </span>
        </div>
        <div className="reading-row">
          <span className="env-label">You talk a program through</span>
          <span className="reading-description">
            Three questions about code you did not write — the thing you do every day with an AI, done
            deliberately.
          </span>
        </div>
      </section>

      <div className="wire" role="status">
        <b>What this page can and cannot do</b>
        <p>
          This is the course running in your browser, with no account and no server keeping anything.{" "}
          <b>Your progress is stored in this browser only</b> — clear your site data and it is gone. Save the
          file below if you want to come back to it.
        </p>
        <p>
          The labs are run in a terminal, against the course&rsquo;s own Python. A web page has neither, so a
          lab here shows its commands and lets you past, marked <i>not run</i>. To do the course properly,
          install it: one clone, one script, <code>npm run dev</code>.
        </p>
        <p className="undercode">
          Written so far: {sessions.length === 1 ? "session" : "sessions"}{" "}
          {sessions.map(session => session.session).join(", ")} of 21. The AI margin notes are not connected
          yet, here or locally.
        </p>
      </div>

      <RecordKeeper />

      {first && (
        <div className="resume">
          <span className="rl">
            <span className="rk">Start here</span>
            <span className="rt">Session {first.session} — {first.title}</span>
          </span>
          <Link className="go" href={`/sessions/${first.session}`}>Open session {first.session}</Link>
        </div>
      )}

      <div className="parts">
        <span className="rl">Every written session opens from here</span>
        {sessions.map(session => (
          <div className="prow" key={session.session}>
            <span className="pn">{session.session}</span>
            <span className="pt"><Link href={`/sessions/${session.session}`}>{session.title}</Link></span>
            <span className="pk">{session.parts.length} parts</span>
          </div>
        ))}
      </div>

      <p className="after">
        <a href="https://github.com/jingyibuilds/forthree" target="_blank" rel="noreferrer">
          Install it on your own machine <Icon name="out" />
        </a>{" "}
        — the full course, your labs really running, your record a folder on your disk.
      </p>
      <p className="after">
        The map this was cut from: <Link href="/curriculum">the ten blocks</Link>, four of them taught here.
      </p>
    </Shell>
  );
}
