import { flipLocale } from "@/lib/locale-actions";
import { dict, type Locale } from "@/lib/i18n";

export function LocaleToggle({
  locale,
  inline = false,
}: {
  locale: Locale;
  inline?: boolean;
}) {
  return (
    <form action={flipLocale} className={inline ? "" : "absolute right-4 top-4"}>
      <button
        type="submit"
        className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-muted transition-colors hover:border-primary hover:text-primary"
      >
        {dict[locale].toggleLabel}
      </button>
    </form>
  );
}
