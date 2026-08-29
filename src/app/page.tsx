import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { dict, getLocale } from "@/lib/i18n";
import { LocaleToggle } from "@/components/locale-toggle";
import { Seal } from "@/components/seal";

export default async function Home() {
  const locale = await getLocale();
  const t = dict[locale];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <LocaleToggle locale={locale} />
      <div className="w-full max-w-md space-y-10 text-center">
        <div className="flex flex-col items-center gap-5">
          <Seal size={56} />
          <div>
            <h1 className="font-serif text-5xl font-semibold tracking-wide text-ink">
              {t.name}
            </h1>
            <p className="mt-3 text-base text-muted">{t.tagline}</p>
          </div>
        </div>

        {user ? (
          <div className="space-y-4">
            <Link
              href="/learn"
              className="inline-block rounded-lg bg-primary px-9 py-3.5 text-base font-medium text-on-primary shadow-sm transition-colors hover:bg-primary-hover"
            >
              {t.continueLearning}
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-xs text-muted transition-colors hover:text-ink"
              >
                {t.signOut}
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-block rounded-lg bg-primary px-9 py-3.5 text-base font-medium text-on-primary shadow-sm transition-colors hover:bg-primary-hover"
          >
            {t.signIn}
          </Link>
        )}
      </div>
    </main>
  );
}
