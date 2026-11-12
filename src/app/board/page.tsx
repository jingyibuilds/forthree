import AskBubble from "@/components/ask-bubble";
import { checkOpenReason } from "@/components/ask-reason";
import RecordError from "@/components/record-error";
import Shell from "@/components/shell";
import { readBoard } from "@/lib/study/board";
import { loadBlocks } from "@/lib/study/content";
import { BARS, BLOCK_NAMES, TAUGHT, loadTrunk } from "@/lib/study/map";
import { BarKey, StudyError } from "@/lib/study/types";
import { assistantState } from "@/lib/study/service";

export const dynamic = "force-dynamic";

const WORDS: Record<string, string> = {none: "not started", borrowed: "with help", own: "on your own"};
const PILL: Record<string, string> = {none: "pill", borrowed: "pill help", own: "pill solo"};

// §16: four block cells, two skills each, and nothing else moves on this
// screen — no spine, no session count, no dates, no percentages. The key
// states the standard rather than translating a coined word (§4.1).
export default async function Board() {
  let loaded;
  try {
    loaded = await Promise.all([loadTrunk(), loadBlocks(), readBoard()]);
  } catch (error) {
    return <RecordError active="/board" message={error instanceof StudyError ? error.message : "Your study record could not be read."} />;
  }
  const [trunk, blocks, board] = loaded;
  // These screens hold no prediction open, so the only thing that quiets the
  // assistant here is a no-help check open elsewhere in the session.
  const ask = await assistantState().catch(() => ({reason: "", session: undefined}));
  const quiet = ask.reason === "check_open";
  const taught = trunk.filter(block => TAUGHT[block.id]);

  return (
    <Shell active="/board" bubble={<AskBubble mode={quiet ? "disabled" : "live"} reason={checkOpenReason(ask.session)} />}>
      <h1>With help, or on your own</h1>
      <p className="sub">
        Four blocks, two skills each. No percentages, no streaks, no dates — these eight lines are the whole
        record.
      </p>
      <div className="board">
        {taught.map(block => {
          const bars = blocks.find(candidate => candidate.block === block.id)?.bars ?? BARS[block.id];
          const states = board[block.id] as Record<string, {state: string}> | undefined;
          return (
            <div className="blk" key={block.id}>
              <div className="n">
                <span className="bid">{block.id}</span> {BLOCK_NAMES[block.id]}
              </div>
              <div className="q">{block.question}</div>
              <div className="bars">
                {(["judge", "build"] as BarKey[]).map(bar => {
                  const state = states?.[bar]?.state ?? "none";
                  return (
                    <div className="bar2" key={bar}>
                      <span className="bl">
                        <span className="bh">{bars[bar].label}</span>
                        <span className="bx">{bars[bar].says}</span>
                      </span>
                      <span className={PILL[state]}>{WORDS[state]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="key">
        <span><i className="k0" />not started</span>
        <span><i className="k1" />with help — notes open</span>
        <span><i className="k2" />on your own — no notes, a question you had not seen</span>
      </div>
      <p className="after">
        Nothing here moves before session {Math.min(...Object.values(blocks[0]?.bars ?? {}).map(bar => bar.borrowed_gate))}.
        A1&rsquo;s two skills both reach <b>with help</b> and then <b>on your own</b> at session{" "}
        {blocks[0]?.bars.judge.own_gate}, which is where they are graded.
      </p>
    </Shell>
  );
}
