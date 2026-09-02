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
      className={`grid min-h-11 min-w-11 place-items-center rounded-lg border border-line bg-surface px-3 text-sm font-medium text-muted shadow-sm transition-[background-color,border-color,color,transform] hover:-translate-y-px hover:border-primary hover:bg-primary/5 hover:text-primary ${
        inline ? "" : "absolute right-4 top-4"
      }`}
    >
      {dict[locale].toggleLabel}
    </a>
  );
}
