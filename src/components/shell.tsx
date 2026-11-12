import Link from "next/link";
import { ReactNode } from "react";

// §4.2's layout contract: window chrome, a 168px rail of three screens with
// the active one marked by a 2px left border, one content column. The rail's
// foot shows the block and the session ordinal — never a date or a week.
const RAIL = [
  {href: "/", label: "Today"},
  {href: "/curriculum", label: "Curriculum"},
  {href: "/board", label: "The board"},
] as const;

export default function Shell({
  active, block, blockName, session, total = 21, children, bubble, busy = false,
}: {
  active: "/" | "/curriculum" | "/board";
  block?: string;
  blockName?: string;
  session?: number;
  total?: number;
  children: ReactNode;
  bubble?: ReactNode;
  busy?: boolean;
}) {
  return (
    <div className="study-page">
      <div className="win">
        <div className="bar">
          <i />
          <i />
          <i />
          <code>localhost:3000</code>
        </div>
        <div className="app">
          <nav className="rail" aria-label="Main navigation">
            <div className="brand">
              <span className="sealmk">f3</span> CS Core
            </div>
            {RAIL.map(item => (
              <Link
                key={item.href}
                className="nav"
                href={item.href}
                aria-current={item.href === active ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
            {block && (
              <div className="railfoot">
                <b>{block}</b> {blockName}
                {session ? <span className="rail-session">session {session} of {total}</span> : null}
              </div>
            )}
          </nav>
          <main className="study-body" aria-busy={busy}>
            {children}
          </main>
          {bubble}
        </div>
      </div>
    </div>
  );
}
