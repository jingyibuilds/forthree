import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dict, getLocale } from "@/lib/i18n";
import { LocaleToggle } from "@/components/locale-toggle";
import { lessons, modules, nextLesson } from "@/lib/content";

export default async function LearnPage() {
  const locale = await getLocale();
  const t = dict[locale];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: attempts } = await supabase
    .from("attempts")
    .select("exercise_id")
    .eq("correct", true);
  const correct = new Set((attempts ?? []).map((a) => a.exercise_id as string));
  const next = nextLesson(correct);

  return (
    <main className="relative mx-auto min-h-screen max-w-2xl p-6 pt-16">
      <LocaleToggle locale={locale} />
      <h1 className="text-xl font-semibold">{t.yourPath}</h1>

      {modules.map((m) => (
        <section key={m.id} className="mt-6">
          <h2 className="text-lg font-medium">
            {locale === "zh" ? m.title_zh : m.title_en}
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            {locale === "zh" ? m.description_zh : m.description_en}
          </p>
          <ul className="mt-4 space-y-2">
            {lessons
              .filter((l) => l.module_id === m.id)
              .map((l) => {
                const complete = l.exercises.every((e) => correct.has(e.id));
                const isNext = next?.id === l.id;
                return (
                  <li key={l.id}>
                    <Link
                      href={`/learn/${l.id}`}
                      className={`flex items-center justify-between rounded-md border px-4 py-3 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900 ${
                        isNext
                          ? "border-neutral-900 dark:border-white"
                          : "border-neutral-200 dark:border-neutral-800"
                      }`}
                    >
                      <span>
                        <span className={complete ? "text-neutral-400" : ""}>
                          {locale === "zh" ? l.title_zh : l.title_en}
                        </span>
                        <span className="ml-2 text-xs text-neutral-400">
                          {l.est_minutes} {t.minutes}
                        </span>
                      </span>
                      <span className="text-xs font-medium">
                        {complete ? `✓ ${t.done}` : isNext ? t.start : t.review}
                      </span>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </main>
  );
}
