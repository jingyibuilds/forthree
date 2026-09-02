import Link from "next/link";
import { redirect } from "next/navigation";
import { canEnterLearnerApp, hasRememberedInvite } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { dict, getLocale } from "@/lib/i18n";
import { LocaleToggle } from "@/components/locale-toggle";
import { Seal } from "@/components/seal";
import { TestAccountReset } from "@/components/test-account-reset";
import {
  courseMap,
  getModule,
  hasProgressAfterOrientation,
  lessons,
  modules,
  nextLesson,
} from "@/lib/content";
import { canResetTestAccount } from "@/lib/test-account";
import { getLearnerProfile, ONBOARDING_PATH } from "@/lib/profile";
import { lessonPath } from "@/lib/routes";
import { estimateMinuteRange, formatActiveMinutes } from "@/lib/study-time";

const TIME_PAGE_SIZE = 1000;

export default async function LearnPage() {
  const locale = await getLocale();
  const t = dict[locale];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const showTestReset = canResetTestAccount(user.email);
  const profile = await getLearnerProfile(supabase, user.id);
  const hasFullAccess = canEnterLearnerApp(user.email, profile);
  const hasOrientationAccess = !hasFullAccess && (await hasRememberedInvite(user.email));
  if (!hasFullAccess && !hasOrientationAccess) redirect(ONBOARDING_PATH);

  const { data: attempts } = await supabase
    .from("attempts")
    .select("exercise_id")
    .eq("correct", true);
  const correct = new Set((attempts ?? []).map((a) => a.exercise_id as string));
  const next = nextLesson(correct);
  if (hasOrientationAccess && next?.module_id !== "m00") redirect(ONBOARDING_PATH);
  const orientationIsOptional = hasProgressAfterOrientation(correct);
  const currentModule = next
    ? (getModule(next.module_id) ?? modules[0])
    : modules.at(-1);
  const currentModuleLessons = currentModule
    ? lessons.filter((lesson) => lesson.module_id === currentModule.id)
    : [];
  const totalExercises = currentModuleLessons.reduce(
    (sum, lesson) => sum + lesson.exercises.length,
    0
  );
  const completedExercises = currentModuleLessons.reduce(
    (sum, lesson) =>
      sum + lesson.exercises.filter((exercise) => correct.has(exercise.id)).length,
    0
  );
  const totalMinutes = currentModuleLessons.reduce(
    (sum, lesson) => sum + lesson.est_minutes,
    0
  );
  const lessonIds = currentModuleLessons.map((lesson) => lesson.id);
  let activeSeconds = 0;
  if (lessonIds.length > 0) {
    for (let page = 0; page < 20; page += 1) {
      const from = page * TIME_PAGE_SIZE;
      const to = from + TIME_PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("lesson_time_events")
        .select("active_seconds")
        .eq("user_id", user.id)
        .in("lesson_id", lessonIds)
        .order("id", { ascending: true })
        .range(from, to);
      if (error) break;
      activeSeconds += (data ?? []).reduce(
        (sum, event) => sum + ((event.active_seconds as number | null) ?? 0),
        0
      );
      if (!data || data.length < TIME_PAGE_SIZE) break;
    }
  }
  const nextLessonHasProgress = next
    ? next.exercises.some((exercise) => correct.has(exercise.id))
    : false;
  const milestonePercent =
    totalExercises === 0 ? 0 : Math.round((completedExercises / totalExercises) * 100);
  const capabilityMoves =
    (locale === "zh"
      ? currentModule?.capability_moves_zh
      : currentModule?.capability_moves_en) ?? [];
  const activeStage = currentModule?.stage ?? 0;

  return (
    <main className="relative mx-auto min-h-dvh w-full max-w-5xl px-5 py-12 sm:px-8">
      <LocaleToggle locale={locale} />
      <div className="flex max-w-3xl items-start gap-4">
        <Link href="/" aria-label={t.name}>
          <Seal size={48} />
        </Link>
        <div>
          <h1 className="font-serif text-3xl font-semibold">
            {locale === "zh" ? courseMap.course_title_zh : courseMap.course_title_en}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {locale === "zh" ? currentModule?.title_zh : currentModule?.title_en}
          </p>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
            {locale === "zh" ? courseMap.course_promise_zh : courseMap.course_promise_en}
          </p>
        </div>
      </div>

      {next && currentModule && (
        <section className="mt-8 rounded-lg border border-primary/30 bg-surface p-5 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-primary">{t.today}</p>
              <h2 className="mt-1 font-serif text-3xl font-semibold leading-tight">
                {locale === "zh"
                  ? `第 ${next.order} 课 · ${next.title_zh}`
                  : `Lesson ${next.order} · ${next.title_en}`}
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {capabilityMoves.map((move) => (
                  <span
                    key={move}
                    className="rounded-full border border-line bg-background px-3 py-1.5 text-sm text-muted"
                  >
                    {move}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">{t.sessionHint}</p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <Link
                href={lessonPath(next.id)}
                className="min-h-12 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-on-primary shadow-sm transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-primary-hover active:translate-y-0"
              >
                {nextLessonHasProgress ? t.resumeLesson : t.startNextLesson}
              </Link>
              {showTestReset && <TestAccountReset t={t} />}
            </div>
          </div>
        </section>
      )}

      <section className="mt-8">
        <p className="text-sm font-medium text-muted">{t.courseArc}</p>
        <ol className="mt-4 grid gap-4 border-t border-line pt-5 sm:grid-cols-2 lg:grid-cols-5">
          {courseMap.stages.map((s) => (
            <li key={s.stage} className="relative">
              <div className="flex items-center gap-3">
                <span
                  className={`grid h-9 w-9 place-items-center rounded-full text-sm font-semibold ${
                    s.stage === activeStage
                      ? "bg-primary text-on-primary"
                      : s.stage < activeStage
                        ? "bg-success-soft text-success"
                      : "border border-line bg-surface text-muted"
                  }`}
                >
                  {s.stage}
                </span>
                <span
                  className={`text-sm font-medium ${
                    s.stage === activeStage ? "text-primary" : "text-muted"
                  }`}
                >
                  {locale === "zh" ? s.label_zh : s.label_en}
                </span>
                {s.stage > activeStage && (
                  <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-xs text-muted">
                    {t.planned}
                  </span>
                )}
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

      {courseMap.course_sources && courseMap.course_sources.length > 0 && (
        <section className="mt-8 border-y border-line py-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-sm font-medium text-primary">{t.sourceInfluence}</p>
            <p className="text-sm text-muted">{t.sourceNote}</p>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {courseMap.course_sources.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-full border border-line bg-surface px-3 py-2 text-sm shadow-sm transition-[background-color,border-color,transform] hover:-translate-y-px hover:border-primary hover:bg-primary/5"
              >
                <span className="font-medium text-ink">{source.name}</span>
                <span className="ml-2 text-xs text-muted">
                  {locale === "zh" ? source.focus_zh : source.focus_en}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8 rounded-lg border border-line bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-primary">{t.currentModuleCapability}</p>
            <p className="mt-1 max-w-3xl text-base leading-7 text-muted">
              {currentModule &&
                (locale === "zh" ? currentModule.capability_zh : currentModule.capability_en)}
            </p>
            {currentModule?.refusal_en && currentModule.refusal_zh && (
              <p className="mt-3 max-w-3xl border-l-4 border-accent pl-4 text-sm leading-6 text-muted">
                <span className="font-medium text-accent">{t.moduleRefusal}: </span>
                {locale === "zh" ? currentModule.refusal_zh : currentModule.refusal_en}
              </p>
            )}
          </div>
          <p className="font-serif text-3xl font-semibold">{milestonePercent}%</p>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${milestonePercent}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <span>
            {completedExercises}/{totalExercises} {t.exerciseProgress}
          </span>
          <span>
            {t.activeLearningTime}: {formatActiveMinutes(activeSeconds, locale)} ·{" "}
            {t.estimatedPathTime}: {totalMinutes} {t.minutes}
          </span>
        </div>
      </section>

      <div className="mt-12 space-y-12 border-t border-line pt-10">
        {modules.map((m) => {
          const stage = courseMap.stages.find((s) => s.stage === m.stage);
          const moduleLessons = lessons.filter((l) => l.module_id === m.id);
          const completeCount = moduleLessons.filter((l) =>
            l.exercises.every((e) => correct.has(e.id))
          ).length;
          const isCurrentModule = currentModule?.id === m.id;
          const isOptionalOrientation = m.id === "m00" && orientationIsOptional;

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
                <span className="font-medium text-muted">
                  {isCurrentModule
                    ? t.currentModule
                    : isOptionalOrientation
                      ? t.optionalBridge
                    : completeCount === moduleLessons.length
                      ? t.done
                      : t.planned}
                </span>
              </div>

              <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div>
                  <h2 className="font-serif text-4xl font-semibold leading-tight">
                    {locale === "zh" ? m.title_zh : m.title_en}
                  </h2>
                  <p className="mt-3 max-w-2xl text-lg leading-8 text-muted">
                    {locale === "zh" ? m.description_zh : m.description_en}
                  </p>
                  {m.refusal_en && m.refusal_zh && (
                    <p className="mt-4 max-w-2xl border-l-4 border-accent pl-4 text-sm leading-6 text-muted">
                      <span className="font-medium text-accent">{t.moduleRefusal}: </span>
                      {locale === "zh" ? m.refusal_zh : m.refusal_en}
                    </p>
                  )}
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
                {moduleLessons.map((l) => {
                  const complete = l.exercises.every((e) => correct.has(e.id));
                  const isNext = next?.id === l.id;
                  const resourceMinutes = (l.resources ?? []).reduce(
                    (sum, resource) => sum + resource.est_minutes,
                    0
                  );
                  return (
                    <li key={l.id}>
                      <Link
                        href={lessonPath(l.id)}
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
                          {l.order}
                        </span>
                        <span className="min-w-0">
                          <span className={complete ? "text-muted" : "text-ink"}>
                            {locale === "zh" ? l.title_zh : l.title_en}
                          </span>
                          <span className="mt-1 block text-sm text-muted">
                            {t.estimatedDuration} {estimateMinuteRange(l.est_minutes)}{" "}
                            {t.minutes}
                            {resourceMinutes > 0 &&
                              ` + ${resourceMinutes} ${t.minutes} ${t.referenceTime}`}
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
