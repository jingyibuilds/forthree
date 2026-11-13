// §16's board: four block cells, two skills each, and nothing else moves on
// this screen — no spine, no session count, no dates, no percentages. The key
// states the standard rather than translating a coined word (§4.1).
//
// It takes prepared rows and imports nothing that reads a file, so the same
// markup serves her copy (rendered on the server from her record) and the web
// trial (rendered in the browser from the record it keeps).
export interface BoardRow {
  id: string;
  name: string;
  question: string;
  bars: {bar: string; label: string; says: string; state: string}[];
}

export interface BoardData {
  rows: BoardRow[];
  first_gate: number;
  own_gate: number;
  /** board.json could not be read: the eight lines show as not started, and
   *  the screen says so rather than implying nothing has been done. */
  damaged: boolean;
}

const WORDS: Record<string, string> = {none: "not started", borrowed: "with help", own: "on your own"};
const PILL: Record<string, string> = {none: "pill", borrowed: "pill help", own: "pill solo"};

export default function BoardView({data}: {data: BoardData}) {
  return (
    <>
      {data.damaged && (
        <div className="wire" role="status">
          <b>Warning</b>
          <p>
            The record of what you can do on your own could not be read, so the eight lines below show as
            not started. Your sessions are intact and every one still opens from the map.
          </p>
        </div>
      )}
      <h1>With help, or on your own</h1>
      <p className="sub">
        Four blocks, two skills each. No percentages, no streaks, no dates — these eight lines are the whole
        record.
      </p>
      <div className="board">
        {data.rows.map(row => (
          <div className="blk" key={row.id}>
            <div className="n">
              <span className="bid">{row.id}</span> {row.name}
            </div>
            <div className="q">{row.question}</div>
            <div className="bars">
              {row.bars.map(bar => (
                <div className="bar2" key={bar.bar}>
                  <span className="bl">
                    <span className="bh">{bar.label}</span>
                    <span className="bx">{bar.says}</span>
                  </span>
                  <span className={PILL[bar.state]}>{WORDS[bar.state]}</span>
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
      <p className="after">
        Nothing here moves before session {data.first_gate}. A1&rsquo;s two skills both reach{" "}
        <b>with help</b> and then <b>on your own</b> at session {data.own_gate}, which is where they are
        graded.
      </p>
    </>
  );
}
