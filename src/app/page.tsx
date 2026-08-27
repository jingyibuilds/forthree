import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { dict, getLocale } from "@/lib/i18n";
import { LocaleToggle } from "@/components/locale-toggle";

export default async function Home() {
  const locale = await getLocale();
  const t = dict[locale];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="relative flex min-h-screen items-center justify-center p-6">
      <LocaleToggle locale={locale} />
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-semibold">{t.name}</h1>
        <p className="text-sm text-neutral-500">{t.tagline}</p>

        {user ? (
          <div className="space-y-4">
            <Link
              href="/learn"
              className="inline-block rounded-md bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
            >
              {t.continueLearning}
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                {t.signOut}
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-block rounded-md bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
          >
            {t.signIn}
          </Link>
        )}
      </div>
    </main>
  );
}
