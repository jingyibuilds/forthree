import type { Dict } from "@/lib/i18n-shared";

export function TestAccountReset({
  t,
  className = "",
}: {
  t: Dict;
  className?: string;
}) {
  return (
    <form action="/api/test/reset-me" method="post" className={className}>
      <button
        type="submit"
        className="min-h-11 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-muted shadow-sm transition-[background-color,border-color,color,transform] hover:-translate-y-px hover:border-accent hover:bg-accent-soft hover:text-accent active:translate-y-0"
      >
        {t.resetTestLearner}
      </button>
    </form>
  );
}
