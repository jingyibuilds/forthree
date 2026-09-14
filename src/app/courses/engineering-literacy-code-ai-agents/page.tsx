import Link from "next/link";
import { redirect } from "next/navigation";
import { canEnterFirstRun, canEnterLearnerApp, hasRememberedInvite } from "@/lib/access";
import { hasCompletedActivation } from "@/lib/activation-diagnostic";
import {
  getDevLocalProfile,
  getDevLocalUser,
} from "@/lib/dev-local-account";
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
import { START_PATH, lessonPath } from "@/lib/routes";
import { estimateMinuteRange, formatActiveMinutes } from "@/lib/study-time";

const TIME_PAGE_SIZE = 1000;

function devPreviewCorrectExerciseIds() {
  const orientationExerciseIds = lessons
    .filter((lesson) => lesson.module_id === "m00")
    .flatMap((lesson) => lesson.exercises.map((exercise) => exercise.id));
  const firstStageOneExercise = lessons
    .find((lesson) => lesson.module_id === "m01")
    ?.exercises.at(0)?.id;

  return new Set(
    firstStageOneExercise
      ? [...orientationExerciseIds, firstStageOneExercise]
      : orientationExerciseIds
  );
}

export default async function LearnPage({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const locale = await getLocale();
  const t = dict[locale];
  const preview = (await searchParams)?.preview === "1";
  const isDevPreview = process.env.NODE_ENV !== "production" && preview;
  const devUser = isDevPreview ? null : await getDevLocalUser();
  const devProfile = devUser ? await getDevLocalProfile() : null;
  const isDevLocal = Boolean(devUser);

  let showTestReset = false;
  let correct = isDevPreview ? devPreviewCorrectExerciseIds() : new Set<string>();
  let activeSeconds = isDevPreview ? 12 * 60 : 0;
  let hasOrientationAccess = false;
  let signedInUserId: string | null = null;
  const supabase = isDevPreview || isDevLocal ? null : await createClient();

  if (devUser) {
    if (!hasCompletedActivation(devProfile)) redirect(START_PATH);
    hasOrientationAccess = !canEnterLearnerApp(devUser.email, devProfile);
  } else if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    signedInUserId = user.id;
    showTestReset = canResetTestAccount(user.email);
    const profile = await getLearnerProfile(supabase, user.id);
    const hasFullAccess = canEnterLearnerApp(user.email, profile);
    hasOrientationAccess =
      !hasFullAccess &&
      (canEnterFirstRun(user.email, profile) ||
        hasCompletedActivation(profile) ||
        (await hasRememberedInvite(user.email)));
    if (!hasFullAccess && !hasOrientationAccess) redirect(ONBOARDING_PATH);
    if (hasOrientationAccess && !hasCompletedActivation(profile)) redirect(START_PATH);

    const { data: attempts } = await supabase
      .from("attempts")
      .select("exercise_id")
      .eq("correct", true);
    correct = new Set((attempts ?? []).map((a) => a.exercise_id as string));
  }

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
  if (supabase && signedInUserId && lessonIds.length > 0) {
    activeSeconds = 0;
    for (let page = 0; page < 20; page += 1) {
      const from = page * TIME_PAGE_SIZE;
      const to = from + TIME_PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("lesson_time_events")
        .select("active_seconds")
        .eq("user_id", signedInUserId)
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
  const courseTitle =
    locale === "zh" ? courseMap.course_title_zh : courseMap.course_title_en;
  const moduleTitle =
    locale === "zh" ? currentModule?.title_zh : currentModule?.title_en;
  const coursePromise =
    locale === "zh" ? courseMap.course_promise_zh : courseMap.course_promise_en;
  const releaseMarker = locale === "zh" ? "当前开放" : "Current release:";
  const [coursePromiseLead, releaseRest] = coursePromise.split(releaseMarker);
  const releaseNote = releaseRest
    ? `${releaseMarker}${releaseRest}`.trim()
    : "";
  const completedLessons = currentModuleLessons.filter((lesson) =>
    lesson.exercises.every((exercise) => correct.has(exercise.id))
  ).length;
  const remainingLessons = Math.max(
    0,
    currentModuleLessons.length - completedLessons
  );
  const capabilityProgress =
    locale === "zh"
      ? `距离「能读懂一段 agent 工作记录」还差 ${remainingLessons} 节`
      : `${remainingLessons} lessons until you can read a short agent work trail`;

  return (
    <main className="relative mx-auto min-h-dvh w-full max-w-5xl px-5 py-6 sm:px-8 sm:py-10">
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <Link
          href={`${ONBOARDING_PATH}?edit=1`}
          className="min-h-11 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm font-medium text-muted shadow-sm transition-[background-color,border-color,color,transform] hover:-translate-y-px hover:border-primary hover:bg-primary/5 hover:text-primary"
        >
          {t.learningProfile}
        </Link>
        <LocaleToggle locale={locale} inline />
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="min-h-11 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-muted shadow-sm transition-[background-color,border-color,color,transform] hover:-translate-y-px hover:border-primary hover:bg-primary/5 hover:text-primary"
          >
            {t.signOut}
          </button>
        </form>
      </div>
      <header className="flex max-w-4xl items-start gap-3">
        <Link href="/" aria-label={t.name}>
          <Seal size={36} />
        </Link>
        <div>
          <h1 className="font-serif text-xl font-semibold leading-tight sm:text-3xl">
            {courseTitle}
          </h1>
          <p className="mt-1 text-sm font-medium text-primary">
            {moduleTitle}
          </p>
          <p className="mt-2 hidden max-w-2xl text-sm leading-6 text-muted sm:block">
            {coursePromiseLead.trim()}
          </p>
          {releaseNote && (
            <p className="mt-2 hidden rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted sm:inline-block">
              {releaseNote}
            </p>
          )}
        </div>
      </header>

      {next && currentModule && (
        <section className="mt-6 rounded-lg border border-primary/30 bg-surface p-4 shadow-lg sm:mt-8 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary">
                {t.today} · {moduleTitle}
              </p>
              <h2 className="mt-1 break-words font-serif text-2xl font-semibold leading-tight sm:text-3xl">
                {locale === "zh"
                  ? `第 ${next.order} 课 · ${next.title_zh}`
                  : `Lesson ${next.order} · ${next.title_en}`}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {capabilityProgress}
              </p>
              <div className="mt-3 hidden flex-wrap gap-2 sm:flex">
                {capabilityMoves.map((move) => (
                  <span
                    key={move}
                    className="rounded-full border border-line bg-background px-3 py-1.5 text-sm text-muted"
                  >
                    {move}
                  </span>
                ))}
              </div>
              <p className="mt-3 hidden max-w-3xl text-sm leading-6 text-muted sm:block">
                {currentModule &&
                  (locale === "zh" ? currentModule.capability_zh : currentModule.capability_en)}
              </p>
            </div>
            <div className="flex flex-col gap-2 lg:items-end">
              <Link
                href={lessonPath(next.id)}
                className="min-h-12 rounded-lg bg-primary px-6 py-3 text-center text-base font-semibold text-on-primary shadow-sm transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-primary-hover active:translate-y-0"
              >
                {nextLessonHasProgress ? t.resumeLesson : t.startNextLesson}
              </Link>
              {showTestReset && <TestAccountReset t={t} />}
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="h-2 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${milestonePercent}%` }}
              />
            </div>
            <p className="text-sm text-muted">
              <span className="font-medium text-ink">{milestonePercent}%</span>{" "}
              {completedExercises}/{totalExercises} {t.exerciseProgress}
            </p>
          </div>
        </section>
      )}

      <details className="mt-4 rounded-lg border border-line bg-surface p-4 shadow-sm sm:mt-6">
        <summary className="cursor-pointer text-sm font-medium text-primary">
          <span className="mr-2">+</span>
          {t.viewFullRoute}
        </summary>

        <section className="mt-5 space-y-3 border-t border-line pt-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="text-sm font-medium text-muted">{t.courseArc}</p>
            {currentModule && (
              <p className="text-sm text-muted">
                {t.activeLearningTime}: {formatActiveMinutes(activeSeconds, locale)} ·{" "}
                {t.estimatedPathTime}: {totalMinutes} {t.minutes}
              </p>
            )}
          </div>

          {courseMap.stages.map((stage) => {
            const stageModules = modules.filter((m) => m.stage === stage.stage);
            const isActiveStage = stage.stage === activeStage;
            const isPastStage = stage.stage < activeStage;

            if (stageModules.length === 0) {
              return (
                <div
                  key={stage.stage}
                  className="rounded-lg border border-dashed border-line bg-background px-4 py-4"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold ${
                        isPastStage
                          ? "bg-success-soft text-success"
                          : isActiveStage
                            ? "bg-primary text-on-primary"
                            : "border border-line bg-surface text-muted"
                      }`}
                    >
                      {stage.stage}
                    </span>
                    <span className="text-sm font-medium text-muted">
                      {locale === "zh" ? stage.label_zh : stage.label_en}
                    </span>
                    <span className="h-px min-w-8 flex-1 bg-line" />
                    <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">
                      {t.comingSoon}
                    </span>
                  </div>
                  <h2 className="mt-3 font-serif text-xl font-semibold leading-tight">
                    {locale === "zh" ? stage.title_zh : stage.title_en}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                    {locale === "zh" ? stage.milestone_zh : stage.milestone_en}
                  </p>
                </div>
              );
            }

            return (
              <div key={stage.stage} className="space-y-3">
                {stageModules.map((m) => {
                  const moduleLessons = lessons.filter((l) => l.module_id === m.id);
                  const completeCount = moduleLessons.filter((l) =>
                    l.exercises.every((e) => correct.has(e.id))
                  ).length;
                  const isCurrentModule = currentModule?.id === m.id;
                  const isOptionalOrientation =
                    m.id === "m00" && orientationIsOptional;

                  return (
                    <details
                      key={m.id}
                      open={isCurrentModule}
                      className="rounded-lg border border-line bg-background px-4 py-3"
                    >
                      <summary className="cursor-pointer list-none">
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold ${
                              isCurrentModule
                                ? "bg-primary text-on-primary"
                                : completeCount === moduleLessons.length
                                  ? "bg-success-soft text-success"
                                  : "border border-line bg-surface text-muted"
                            }`}
                          >
                            {stage.stage}
                          </span>
                          <span className="text-sm font-medium text-primary">
                            {locale === "zh" ? stage.label_zh : stage.label_en}
                          </span>
                          <h2 className="font-serif text-xl font-semibold leading-tight">
                            {locale === "zh" ? m.title_zh : m.title_en}
                          </h2>
                          <span className="h-px min-w-8 flex-1 bg-line" />
                          <span className="text-sm font-medium text-muted">
                            {isCurrentModule
                              ? t.currentModule
                              : isOptionalOrientation
                                ? t.optionalBridge
                              : completeCount === moduleLessons.length
                                ? t.done
                                : t.planned}
                          </span>
                          <span className="text-sm text-muted">
                            {completeCount}/{moduleLessons.length}
                          </span>
                          <span
                            aria-hidden="true"
                            className="text-lg leading-none text-primary"
                          >
                            +
                          </span>
                        </div>
                      </summary>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                        {locale === "zh" ? m.description_zh : m.description_en}
                      </p>

                      <ol className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-background">
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
                                className={`grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 px-4 py-4 text-base transition-colors hover:bg-surface sm:grid-cols-[2.25rem_minmax(0,1fr)_auto] ${
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
                                  <span
                                    className={complete ? "text-muted" : "text-ink"}
                                  >
                                    {locale === "zh" ? l.title_zh : l.title_en}
                                  </span>
                                  <span className="mt-1 block text-sm text-muted">
                                    {t.estimatedDuration}{" "}
                                    {estimateMinuteRange(l.est_minutes)} {t.minutes}
                                    {resourceMinutes > 0 &&
                                      ` + ${resourceMinutes} ${t.minutes} ${t.referenceTime}`}
                                  </span>
                                </span>
                                <span
                                  className={`col-start-2 text-sm font-medium sm:col-start-auto ${
                                    complete
                                      ? "text-success"
                                      : isNext
                                        ? "text-primary"
                                        : "text-muted"
                                  }`}
                                >
                                  {complete
                                    ? `✓ ${t.done}`
                                    : isNext
                                      ? t.start
                                      : t.review}
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ol>
                    </details>
                  );
                })}
              </div>
            );
          })}
        </section>

      {courseMap.course_sources && courseMap.course_sources.length > 0 && (
        <section className="mt-6 border-t border-line pt-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-sm font-medium text-primary">{t.sourceInfluence}</p>
            <p className="text-sm text-muted">{t.sourceNote}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {courseMap.course_sources.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-line bg-surface px-3 py-2 text-sm shadow-sm transition-[background-color,border-color,transform] hover:-translate-y-px hover:border-primary hover:bg-primary/5"
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
      </details>
    </main>
  );
}
