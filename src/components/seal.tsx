// The brand seal (印章): a vermilion chop with the numeral 3 —
// language-agnostic, one mark for both locales.
export function Seal({ size = 36 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex select-none items-center justify-center rounded-[5px] bg-accent font-serif font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.62,
        lineHeight: 1,
        paddingBottom: size * 0.04,
      }}
    >
      3
    </span>
  );
}
