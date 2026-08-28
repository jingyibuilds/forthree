import { dict, type Locale } from "@/lib/i18n";

export function LocaleToggle({
  locale,
  inline = false,
}: {
  locale: Locale;
  inline?: boolean;
}) {
  const next = locale === "zh" ? "en" : "zh";
  return (
    <a
      href={`/locale?to=${next}`}
      className={`rounded-md border border-line bg-surface px-2 py-1 text-xs text-muted transition-colors hover:border-primary hover:text-primary ${
        inline ? "" : "absolute right-4 top-4"
      }`}
    >
      {dict[locale].toggleLabel}
    </a>
  );
}
