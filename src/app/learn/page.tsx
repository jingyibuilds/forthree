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
    <main className="relative mx-auto min-h-screen w-full max-w-5xl px-5 py-12 sm:px-8">
      <LocaleToggle locale={locale} />
      <div className="flex max-w-3xl items-start gap-4">
        <Link href="/" aria-label={t.name}>
          <Seal size={48} />
        </Link>
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-wide">
            {locale === "zh" ? courseMap.course_title_zh : courseMap.course_title_en}
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-7 text-muted">
            {locale === "zh" ? courseMap.course_promise_zh : courseMap.course_promise_en}
          </p>
        </div>
      </div>

      <section className="mt-10">
        <p className="text-sm font-medium text-muted">{t.courseArc}</p>
        <ol className="mt-4 grid gap-6 border-t border-line pt-5 md:grid-cols-4">
          {courseMap.stages.map((s) => (
            <li key={s.stage} className="relative">
              <div className="flex items-center gap-3">
                <span
                  className={`grid h-9 w-9 place-items-center rounded-full text-sm font-semibold ${
                    s.stage === 1
                      ? "bg-primary text-on-primary"
                      : "border border-line bg-surface text-muted"
                  }`}
                >
                  {s.stage}
                </span>
                <span
                  className={`text-sm font-medium ${
                    s.stage === 1 ? "text-primary" : "text-muted"
                  }`}
                >
                  {locale === "zh" ? s.label_zh : s.label_en}
                </span>
              </div>
              <p className="mt-3 font-serif text-lg font-semibold leading-snug">
                {locale === "zh" ? s.title_zh : s.title_en}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                {locale === "zh" ? s.milestone_zh : s.milestone_en}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-12 space-y-12 border-t border-line pt-10">
        {modules.map((m) => {
          const stage = courseMap.stages.find((s) => s.stage === m.stage);
          const moduleLessons = lessons.filter((l) => l.module_id === m.id);
          const completeCount = moduleLessons.filter((l) =>
            l.exercises.every((e) => correct.has(e.id))
          ).length;

          return (
            <section key={m.id}>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-medium text-primary">
                  {stage && (locale === "zh" ? stage.label_zh : stage.label_en)}
                </span>
                <span className="text-muted">/</span>
                <span className="text-muted">
                  {stage && (locale === "zh" ? stage.title_zh : stage.title_en)}
                </span>
                <span className="h-px min-w-16 flex-1 bg-line" />
                <span className="font-medium text-muted">{t.currentModule}</span>
              </div>

              <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div>
                  <h2 className="font-serif text-4xl font-semibold leading-tight">
                    {locale === "zh" ? m.title_zh : m.title_en}
                  </h2>
                  <p className="mt-3 max-w-2xl text-lg leading-8 text-muted">
                    {locale === "zh" ? m.description_zh : m.description_en}
                  </p>
                </div>

                <aside className="border-l-4 border-accent pl-5">
                  <p className="text-sm font-medium text-accent">{t.lessons}</p>
                  <p className="mt-2 font-serif text-3xl font-semibold">
                    {completeCount}/{moduleLessons.length}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {t.moduleContext}
                  </p>
                </aside>
              </div>

              <ol className="mt-7 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
                {moduleLessons.map((l, i) => {
                  const complete = l.exercises.every((e) => correct.has(e.id));
                  const isNext = next?.id === l.id;
                  return (
                    <li key={l.id}>
                      <Link
                        href={`/learn/${l.id}`}
                        className={`grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-4 px-5 py-5 text-base transition-colors hover:bg-background ${
                          isNext ? "bg-primary/5" : ""
                        }`}
                      >
                        <span
                          className={`grid h-9 w-9 place-items-center rounded-full text-sm font-semibold ${
                            complete
                              ? "bg-success-soft text-success"
                              : isNext
                                ? "bg-primary text-on-primary"
                                : "border border-line text-muted"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className="min-w-0">
                          <span className={complete ? "text-muted" : "text-ink"}>
                            {locale === "zh" ? l.title_zh : l.title_en}
                          </span>
                          <span className="mt-1 block text-sm text-muted">
                            {l.est_minutes} {t.minutes}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 text-sm font-medium ${
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
              </ol>
            </section>
          );
        })}
      </div>
    </main>
  );
}
