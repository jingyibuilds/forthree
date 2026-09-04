import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasRememberedInvite } from "@/lib/access";
import { hasCompletedActivation } from "@/lib/activation-diagnostic";
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
import { COURSE_PATH, START_PATH, lessonPath } from "@/lib/routes";

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
    hasCompletedActivation(profile) &&
    (rememberedInvite || showTestReset);
  const canStartDiagnostic =
    Boolean(user) && !onboarded && !hasCompletedActivation(profile) && (rememberedInvite || showTestReset);
  const continueHref = onboarded
    ? next
      ? lessonPath(next.id)
      : COURSE_PATH
    : canStartDiagnostic
      ? START_PATH
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
                  : canStartDiagnostic
                    ? t.startDiagnostic
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
        <>
          <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-6xl flex-col justify-center gap-8 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-6 sm:gap-12 sm:pt-20 lg:gap-16">
            <div className="grid min-w-0 items-end gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] lg:gap-20">
              <section className="min-w-0 space-y-5 sm:space-y-10">
                <div className="flex items-center gap-4">
                  <div className="[&>svg]:h-11 [&>svg]:w-11 sm:[&>svg]:h-[52px] sm:[&>svg]:w-[52px]">
                    <Seal size={52} />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="font-serif text-3xl font-semibold leading-none text-ink sm:text-4xl">
                      {t.name}
                    </p>
                    <p className="text-sm leading-5 text-muted sm:text-base sm:leading-6">
                      {t.tagline}
                    </p>
                    {t.nameMeaning && (
                      <p className="text-xs leading-4 text-muted sm:text-sm sm:leading-5">
                        {t.nameMeaning}
                      </p>
                    )}
                  </div>
                </div>

                <div className="max-w-3xl space-y-4 border-l-4 border-accent pl-5 sm:space-y-6 sm:pl-6">
                  <h1 className="landing-headline max-w-[21ch] font-serif text-[clamp(1.75rem,7.2vw,3.5rem)] font-semibold text-ink">
                    {t.landingTitle}
                  </h1>
                  <div className="max-w-[34rem] space-y-3 sm:space-y-4">
                    <p className="text-base leading-6 text-muted sm:text-lg sm:leading-8">
                      {t.landingBody}
                    </p>
                    <p className="text-base italic leading-6 text-muted sm:leading-7">
                      {t.landingAudience}
                    </p>
                  </div>
                </div>
              </section>

              <aside className="min-w-0 space-y-5 border-t border-line pt-4 lg:border-t-0 lg:pt-0">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase text-muted">
                    {t.landingProof}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold leading-5 text-primary sm:text-base sm:leading-7">
                    {t.landingSources.map((source) => (
                      <span key={source}>{source}</span>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <Link
                    href="/login"
                    className="block min-h-11 rounded-lg bg-primary px-7 py-3 text-center text-base font-semibold text-on-primary shadow-lg transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-primary-hover hover:shadow-xl active:translate-y-0 sm:min-h-12 sm:py-4"
                  >
                    {t.landingPrimary}
                  </Link>
                  <Link
                    href="/login"
                    className="block min-h-11 text-center text-sm font-medium leading-10 text-muted transition-colors hover:text-ink"
                  >
                    {t.landingSecondary}
                  </Link>
                </div>
              </aside>
            </div>
          </div>
          <footer className="mx-auto w-full max-w-6xl px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] text-center text-xs text-muted sm:px-8">
            <a
              href="https://github.com/jingyibuilds/forthree"
              className="underline decoration-line underline-offset-4 transition-colors hover:text-primary"
              target="_blank"
              rel="noreferrer"
            >
              {t.landingFooter}
            </a>
          </footer>
        </>
      )}
    </main>
  );
}
