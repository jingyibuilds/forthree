import Link from "next/link";
import { notFound } from "next/navigation";
import { LocaleToggle } from "@/components/locale-toggle";
import { Seal } from "@/components/seal";
import { dict, getLocale } from "@/lib/i18n";
import { StartDiagnostic } from "@/app/start/start-diagnostic";

export const dynamic = "force-dynamic";

export default async function DevStartPreview() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const locale = await getLocale();
  const t = dict[locale];

  return (
    <main className="relative min-h-dvh px-5 py-8 sm:px-8 sm:py-10">
      <LocaleToggle locale={locale} />
      <Link
        href="/"
        aria-label={t.name}
        className="inline-flex items-center gap-3"
      >
        <Seal size={40} />
        <span>
          <span className="block font-serif text-2xl font-semibold leading-none text-ink">
            {t.name}
          </span>
          <span className="mt-1 block text-sm text-muted">{t.tagline}</span>
        </span>
      </Link>
      <StartDiagnostic locale={locale} preview />
    </main>
  );
}
