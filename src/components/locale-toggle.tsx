import { flipLocale } from "@/lib/locale-actions";
import { dict, type Locale } from "@/lib/i18n";

export function LocaleToggle({ locale }: { locale: Locale }) {
  return (
    <form action={flipLocale} className="absolute right-4 top-4">
      <button
        type="submit"
        className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        {dict[locale].toggleLabel}
      </button>
    </form>
  );
}
