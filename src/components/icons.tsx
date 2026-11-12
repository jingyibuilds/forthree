// §4.2: icons are drawn SVG at one stroke weight, from the demo's own
// five-glyph set. Never a Unicode arrow, tick or chevron standing in for one.
const PATHS: Record<string, string> = {
  check: "M3.5 8.5l3 3 6-6.5",
  chev: "M4 6l4 4 4-4",
  out: "M6 10l4-4M6.5 5.8H10v3.4",
  close: "M4.5 4.5l7 7M11.5 4.5l-7 7",
  back: "M9.5 3.5L5 8l4.5 4.5",
  lock: "M4.5 7V5.2a3.5 3.5 0 017 0V7M3.5 7h9v6h-9z",
};

export function Icon({name, flip = false}: {name: keyof typeof PATHS | string; flip?: boolean}) {
  return (
    <svg
      className={flip ? "ic flip" : "ic"}
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name] ?? PATHS.chev} />
    </svg>
  );
}
