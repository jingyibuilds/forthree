import Link from "next/link";
import AskBubble from "@/components/ask-bubble";
import { checkOpenReason } from "@/components/ask-reason";
import RecordError from "@/components/record-error";
import Shell from "@/components/shell";
import { Icon } from "@/components/icons";
import { readBoardSafe } from "@/lib/study/board";
import { loadBlocks } from "@/lib/study/content";
import { BARS, BLOCK_NAMES, PLANNED, TAUGHT, TEARDOWN, loadTrunk } from "@/lib/study/map";
import { getStudyOverview } from "@/lib/study/service";
import { BarKey, StudyError } from "@/lib/study/types";
import { assistantState } from "@/lib/study/service";

export const dynamic = "force-dynamic";

// Gate G3: all ten blocks from `trunk.json`, the four taught ones with their
// sessions and the courses behind them, the other six named with their
// question and visibly set aside. Gate G4: every course a session claims is a
// link to evidence, with `catalog`-only evidence marked as weaker.
export default async function Curriculum() {
  let loaded;
  try {
    loaded = await Promise.all([loadTrunk(), loadBlocks(), readBoardSafe(), getStudyOverview().catch(() => null)]);
  } catch (error) {
    return <RecordError active="/curriculum" message={error instanceof StudyError ? error.message : "Your study record could not be read."} />;
  }
  // The map is the way into every session, so a damaged board.json costs it
  // the two skill chips' state and nothing else.
  const [trunk, blocks, {board, damaged}, overview] = loaded;
  const ask = await assistantState().catch(() => ({reason: "", session: undefined}));
  const quiet = ask.reason === "check_open";
  // Past the last authored session `overview.session` is null, and falling
  // back to 1 pinned "you are here" to a finished session and marked nothing
  // done — the map contradicting Today off the same record.
  const here = overview?.session?.session ?? overview?.plan?.current_session ?? 1;
  // Every written session's card opens from here (DECISIONS 2026-11-10):
  // "done" is read off her record, not inferred from where Today is, because
  // she may have done a later session before an earlier one.
  const done = new Set((overview?.sessions ?? []).filter(entry => entry.done).map(entry => entry.session));
  const authored = new Map(blocks.flatMap(block => block.sessions.map(session => [session.session, {session, block}] as const)));
  const taught = trunk.filter(block => TAUGHT[block.id]);
  const untaught = trunk.filter(block => !TAUGHT[block.id]);

  return (
    <Shell active="/curriculum" bubble={<AskBubble mode={quiet ? "disabled" : "live"} reason={checkOpenReason(ask.session)} />}>
      {damaged && (
        <div className="wire" role="status">
          <b>Warning</b>
          <p>
            The record of what you can do on your own could not be read, so the two skills under each block
            show as not started. Your sessions are intact and every one still opens from here.
          </p>
        </div>
      )}
      <h1>Ten blocks. This semester teaches four.</h1>
      <p className="sub">
        In teaching order. The six at the bottom are real blocks from the same map, left out of this semester.
      </p>

      <div className="totals">
        <div className="tot">
          <div className="tv">21</div>
          <div className="tk">sessions</div>
        </div>
        <div className="tot">
          <div className="tv">8</div>
          <div className="tk">skills — the two listed under each block below</div>
        </div>
        <div className="tot">
          <div className="tv">{new Set(taught.flatMap(block => (block.courses ?? []).map(course => course.url))).size}</div>
          <div className="tk">university courses, all linked below</div>
        </div>
      </div>

      {taught.map(block => {
        const meta = TAUGHT[block.id];
        const bars = blocks.find(candidate => candidate.block === block.id)?.bars ?? BARS[block.id];
        const states = board[block.id] as Record<string, {state: string}> | undefined;
        const rows: [number, string, boolean][] = [];
        for (let n = meta.from; n <= meta.to; n += 1) {
          const found = authored.get(n);
          const planned = (PLANNED[block.id] ?? []).find(row => row[0] === n);
          rows.push([n, found?.session.title ?? planned?.[1] ?? "—", !!found]);
        }
        const isHere = here >= meta.from && here <= meta.to;
        return (
          <div className={isHere ? "cblk now" : "cblk"} key={block.id}>
            <div className="chd">
              <span className="cl">
                <span className="bid">{block.id}</span> {BLOCK_NAMES[block.id]}{" "}
                <em>{block.question}</em>
              </span>
              <span className="cr">{meta.range}</span>
            </div>
            <div className="cbd">
              <div className="csk">
                {(["judge", "build"] as BarKey[]).map(bar => (
                  <span className={states?.[bar]?.state !== "none" ? "cs on" : "cs"} key={bar}>
                    <b>{bars[bar].label}</b>
                    {bars[bar].says}
                  </span>
                ))}
              </div>
              <table className="wk">
                <tbody>
                  {rows.map(([n, title, isAuthored]) => (
                    <tr className={n === here ? (isAuthored ? "at" : "at unwritten") : undefined} key={n}>
                      <td className="wn">{n}</td>
                      <td className="wt">
                        {n === here && isAuthored ? (
                          <Link className="hererow" href="/">
                            {title}
                            <span className="here">you are here — open it</span>
                          </Link>
                        ) : isAuthored ? (
                          // Every written session opens: the title is the link.
                          <Link className="openrow" href={`/sessions/${n}`}>{title}</Link>
                        ) : (
                          title
                        )}
                        {isAuthored && done.has(n) && n !== here && <span className="wm2">done</span>}
                        {!isAuthored && <span className="wm2">not written yet</span>}
                        {TEARDOWN[n] && <span className="wm2">+ take apart: {TEARDOWN[n]}</span>}
                        {blocks.find(candidate => candidate.block === block.id)
                          && Object.values(blocks.find(candidate => candidate.block === block.id)!.bars).some(entry => entry.own_gate === n) && (
                          <span className="wm">both skills → on your own</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3 className="rl">The six things this block has to teach</h3>
              <ol className="learnlist">
                {block.learn.map(item => <li key={item}>{item}</li>)}
              </ol>
              <div className="chips">
                {(block.courses ?? []).map(course => (
                  <a className="chip src" key={course.url + course.code} href={course.url} target="_blank" rel="noreferrer">
                    {course.school} {course.code} <Icon name="out" />
                  </a>
                ))}
              </div>
              {block.id === "A1" && (
                <p className="conf2">
                  The courses this block is drawn from. Each session carries its own dated evidence on its card.
                </p>
              )}
            </div>
          </div>
        );
      })}

      <div className="cblk">
        <div className="chd">
          <span className="cl">
            <span className="bid">21</span> <em>Capstone, and an exam in three sizes</em>
          </span>
          <span className="cr">scored against the source</span>
        </div>
        <div className="cbd">
          <table className="wk">
            <tbody>
              <tr><td className="wn">S</td><td className="wt">Simple — build it, cold</td></tr>
              <tr><td className="wn">M</td><td className="wt">Medium — put a product’s own published steps in order</td></tr>
              <tr><td className="wn">L</td><td className="wt">Difficult — name the tricky parts before reading them</td></tr>
            </tbody>
          </table>
          <p className="conf2">
            Counted against the engineering write-ups for a product you have never taken apart. No person grades
            it, and no model does either.
          </p>
        </div>
      </div>

      <h2>Not in this semester</h2>
      {untaught.map(block => (
        <div className={block.id === "C1" ? "off c1" : "off"} key={block.id}>
          <span className="oi">{block.id}</span>
          <span className="on">{BLOCK_NAMES[block.id]}</span>
          <span className="oq">{block.question}</span>
        </div>
      ))}
      <p className="after">
        If hours free up, C1 goes first — its question is closer to why you started than any block this semester
        teaches.
      </p>
    </Shell>
  );
}
