// The brand seal (印章): 一角实,三角虚 — one corner given (solid), three
// returned by the learner (outlined). The name's mechanism, drawn.
export function Seal({ size = 36 }: { size?: number }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className="select-none"
    >
      <rect width="64" height="64" rx="9" className="fill-accent" />
      {/* 举一 — the corner shown */}
      <rect x="13" y="13" width="17" height="17" rx="3.5" fill="#ffffff" />
      {/* 反三 — the three you return */}
      <rect x="34" y="13" width="17" height="17" rx="3.5" fill="none" stroke="#ffffff" strokeWidth="2.5" />
      <rect x="13" y="34" width="17" height="17" rx="3.5" fill="none" stroke="#ffffff" strokeWidth="2.5" />
      <rect x="34" y="34" width="17" height="17" rx="3.5" fill="none" stroke="#ffffff" strokeWidth="2.5" />
    </svg>
  );
}
