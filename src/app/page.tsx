import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasRememberedInvite } from "@/lib/access";
import { dict, getLocale } from "@/lib/i18n";
import { LocaleToggle } from "@/components/locale-toggle";
import { Seal } from "@/components/seal";
import { courseMap, nextLesson } from "@/lib/content";
import { FreshStartCleanup } from "@/components/fresh-start-cleanup";
import { TestAccountReset } from "@/components/test-account-reset";
import { canResetTestAccount } from "@/lib/test-account";
import {
  getLearnerProfile,
  hasCompletedOnboarding,
  learningId,
  ONBOARDING_PATH,
} from "@/lib/profile";
import { COURSE_PATH, lessonPath } from "@/lib/routes";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ fresh?: string }>;
}) {
  const locale = await getLocale();
  const t = dict[locale];
  const { fresh } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: attempts } = user
    ? await supabase.from("attempts").select("exercise_id").eq("correct", true)
    : { data: [] };
  const correct = new Set((attempts ?? []).map((a) => a.exercise_id as string));
  const next = nextLesson(correct);
  const showTestReset = canResetTestAccount(user?.email);
  const profile = user ? await getLearnerProfile(supabase, user.id) : null;
  const onboarded = hasCompletedOnboarding(profile);
  const rememberedInvite = user ? await hasRememberedInvite(user.email) : false;
  const canStartOrientation =
    Boolean(user && next?.module_id === "m00") &&
    !onboarded &&
    (rememberedInvite || showTestReset);
  const continueHref = onboarded
    ? next
      ? lessonPath(next.id)
      : COURSE_PATH
    : canStartOrientation && next
      ? lessonPath(next.id)
    : ONBOARDING_PATH;

  return (
    <main className="relative min-h-dvh px-5 py-10 sm:px-8">
      {fresh === "1" && <FreshStartCleanup />}
      <LocaleToggle locale={locale} />
      {user ? (
        <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-md items-center justify-center">
          <div className="w-full space-y-10 text-center">
            <div className="flex flex-col items-center gap-5">
              <Seal size={56} />
              <div>
                <h1 className="font-serif text-5xl font-semibold text-ink">
                  {t.name}
                </h1>
                <p className="mt-3 text-base text-muted">{t.tagline}</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="rounded-full border border-line bg-surface px-4 py-2 text-sm text-muted shadow-sm">
                {onboarded ? t.currentCourse : t.learningIdLabel} ·{" "}
                <span className="text-ink">
                  {onboarded
                    ? locale === "zh"
                      ? courseMap.course_title_zh
                      : courseMap.course_title_en
                    : learningId(user)}
                </span>
              </p>
              <div className="grid grid-cols-3 gap-2 text-left">
                {t.homeSignals.map((signal, index) => (
                  <div
                    key={signal}
                    className="rounded-lg border border-line bg-surface px-3 py-3 shadow-sm transition-[border-color,transform,box-shadow] hover:-translate-y-px hover:border-primary/45"
                  >
                    <span className="font-mono text-xs text-primary">0{index + 1}</span>
                    <p className="mt-1 text-sm font-medium leading-5">{signal}</p>
                  </div>
                ))}
              </div>
              <Link
                href={continueHref}
                className="inline-block rounded-lg bg-primary px-9 py-3.5 text-base font-semibold text-on-primary shadow-sm transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-primary-hover active:translate-y-0"
              >
                {onboarded
                  ? t.continueLearning
                  : canStartOrientation
                    ? t.startOrientation
                    : t.beginOnboarding}
              </Link>
              {showTestReset && (
                <div className="rounded-lg border border-line bg-surface p-4 text-left shadow-sm">
                  <p className="text-sm font-semibold text-primary">{t.testMode}</p>
                  <p className="mt-1 text-sm leading-6 text-muted">{t.testModeNote}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={COURSE_PATH}
                      className="min-h-11 rounded-lg border border-line bg-background px-4 py-2.5 text-sm font-medium text-muted shadow-sm transition-[background-color,border-color,color,transform] hover:-translate-y-px hover:border-primary hover:text-primary active:translate-y-0"
                    >
                      {t.browseCourse}
                    </Link>
                    <TestAccountReset t={t} />
                  </div>
                </div>
              )}
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="text-xs text-muted transition-colors hover:text-ink"
                >
                  {t.signOut}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto grid min-h-[calc(100dvh-5rem)] w-full max-w-5xl gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-center">
          <section className="flex min-w-0 flex-col justify-center space-y-8">
            <div className="flex items-center gap-3">
              <Seal size={52} />
              <div>
                <p className="font-serif text-3xl font-semibold text-ink">{t.name}</p>
                <p className="mt-1 text-sm text-muted">{t.tagline}</p>
              </div>
            </div>
            <div className="max-w-3xl border-l-4 border-accent pl-5">
              <h1 className="break-words font-serif text-4xl font-semibold leading-tight text-ink sm:text-6xl">
                {t.landingTitle}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
                {t.landingBody}
              </p>
            </div>
            <p className="max-w-2xl text-sm font-medium leading-6 text-primary">
              {t.landingProof}
            </p>
          </section>

          <aside className="flex min-w-0 flex-col justify-center gap-5">
            <div className="grid gap-2 text-left">
              {t.landingSignals.map((signal, index) => (
                <div
                  key={signal}
                  className="rounded-lg border border-line bg-surface px-4 py-3 shadow-sm"
                >
                  <span className="font-mono text-xs text-primary">0{index + 1}</span>
                  <p className="mt-1 text-sm font-medium leading-5">{signal}</p>
                </div>
              ))}
            </div>
            <Link
              href="/login"
              className="inline-block rounded-lg bg-primary px-7 py-3.5 text-center text-base font-semibold text-on-primary shadow-sm transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-primary-hover active:translate-y-0"
            >
              {t.landingPrimary}
            </Link>
            <Link
              href="/login"
              className="text-center text-sm font-medium text-muted transition-colors hover:text-ink"
            >
              {t.landingSecondary}
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}
