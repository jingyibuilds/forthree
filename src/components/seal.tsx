// The 反三 seal (印章) — the brand mark, in 朱砂 vermilion like a name chop.
export function Seal({ size = 36 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex select-none items-center justify-center rounded-[5px] bg-accent font-serif font-semibold text-white"
      style={{
        width: size,
        height: size,
        writingMode: "vertical-rl",
        fontSize: size * 0.42,
        lineHeight: 1,
        letterSpacing: "0.08em",
      }}
    >
      反三
    </span>
  );
}
