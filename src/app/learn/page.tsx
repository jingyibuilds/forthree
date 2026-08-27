import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dict, getLocale } from "@/lib/i18n";
import { LocaleToggle } from "@/components/locale-toggle";
import { Seal } from "@/components/seal";
import { courseMap, lessons, modules, nextLesson } from "@/lib/content";

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
    <main className="relative mx-auto min-h-screen w-full max-w-2xl p-6 pt-16">
      <LocaleToggle locale={locale} />
      <div className="flex items-start gap-3">
        <Link href="/" aria-label={t.name}>
          <Seal size={40} />
        </Link>
        <div>
          <h1 className="font-serif text-xl font-semibold tracking-wide">
            {locale === "zh" ? courseMap.course_title_zh : courseMap.course_title_en}
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {locale === "zh" ? courseMap.course_promise_zh : courseMap.course_promise_en}
          </p>
        </div>
      </div>

      <div className="mt-6 border-l-2 border-line pl-4 text-xs leading-6 text-muted">
        {courseMap.stages.map((s) => (
          <p key={s.stage} className={s.stage === 1 ? "text-ink" : ""}>
            <span className="font-serif font-semibold">
              {locale === "zh" ? s.label_zh : s.label_en}
            </span>
            {" · "}
            {locale === "zh" ? s.title_zh : s.title_en}
            {" — "}
            {locale === "zh" ? s.milestone_zh : s.milestone_en}
          </p>
        ))}
      </div>

      {modules.map((m) => (
        <section key={m.id} className="mt-8">
          <h2 className="font-serif text-lg font-semibold">
            {locale === "zh" ? m.title_zh : m.title_en}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {locale === "zh" ? m.description_zh : m.description_en}
          </p>
          <ul className="mt-4 space-y-2.5">
            {lessons
              .filter((l) => l.module_id === m.id)
              .map((l) => {
                const complete = l.exercises.every((e) => correct.has(e.id));
                const isNext = next?.id === l.id;
                return (
                  <li key={l.id}>
                    <Link
                      href={`/learn/${l.id}`}
                      className={`flex items-center justify-between rounded-lg border bg-surface px-4 py-3.5 text-sm transition-colors ${
                        isNext
                          ? "border-primary shadow-sm"
                          : "border-line hover:border-muted"
                      }`}
                    >
                      <span>
                        <span className={complete ? "text-muted" : ""}>
                          {locale === "zh" ? l.title_zh : l.title_en}
                        </span>
                        <span className="ml-2 text-xs text-muted">
                          {l.est_minutes} {t.minutes}
                        </span>
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          complete
                            ? "text-success"
                            : isNext
                              ? "text-primary"
                              : "text-muted"
                        }`}
                      >
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
