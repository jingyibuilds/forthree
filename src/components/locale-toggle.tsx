import { dict, type Locale } from "@/lib/i18n-shared";

export function LocaleToggle({
  locale,
  inline = false,
  back,
}: {
  locale: Locale;
  inline?: boolean;
  back?: string;
}) {
  const next = locale === "zh" ? "en" : "zh";
  const href = back
    ? `/locale?to=${next}&back=${encodeURIComponent(back)}`
    : `/locale?to=${next}`;
  return (
    <a
      href={href}
      className={`rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-muted shadow-sm transition-colors hover:border-primary hover:text-primary ${
        inline ? "" : "absolute right-4 top-4"
      }`}
    >
      {dict[locale].toggleLabel}
    </a>
  );
}
