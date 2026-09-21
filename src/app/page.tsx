import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasRedeemedInvite, hasRememberedInvite } from "@/lib/access";
import { hasCompletedActivation } from "@/lib/activation-diagnostic";
import { dict, getLocale } from "@/lib/i18n";
import { LocaleToggle } from "@/components/locale-toggle";
import { Seal } from "@/components/seal";
import { courseMap, nextLesson } from "@/lib/content";
import { getDevLocalProfile, getDevLocalUser } from "@/lib/dev-local-account";
import { FreshStartCleanup } from "@/components/fresh-start-cleanup";
import { TestAccountReset } from "@/components/test-account-reset";
import { TrackedLink } from "@/components/tracked-link";
import { canResetTestAccount } from "@/lib/test-account";
import {
  getLearnerProfile,
  hasCompletedOnboarding,
  learningId,
  ONBOARDING_PATH,
} from "@/lib/profile";
import { hasSupabaseAuthCookie } from "@/lib/supabase/session-cookies";
import { COURSE_PATH, START_PATH, lessonPath } from "@/lib/routes";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ fresh?: string }>;
}) {
  const locale = await getLocale();
  const t = dict[locale];
  const landingTitleParts = t.landingTitle.split("\n");
  const { fresh } = await searchParams;

  const devUser = await getDevLocalUser();
  const hasAuthCookie = devUser ? false : await hasSupabaseAuthCookie();
  const supabase = devUser || !hasAuthCookie ? null : await createClient();
  const {
    data: { user: supabaseUser },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const user = devUser ?? supabaseUser;
  const { data: attempts } = user
    ? supabase
      ? await supabase
          .from("attempts")
          .select("exercise_id")
          .eq("user_id", user.id)
          .eq("correct", true)
      : { data: [] }
    : { data: [] };
  const correct = new Set((attempts ?? []).map((a) => a.exercise_id as string));
  const next = nextLesson(correct);
  const showTestReset = canResetTestAccount(user?.email);
  const profile = devUser
    ? await getDevLocalProfile()
    : user && supabase
      ? await getLearnerProfile(supabase, user.id)
      : null;
  const onboarded = hasCompletedOnboarding(profile);
  const rememberedInvite = user ? await hasRememberedInvite(user.email) : false;
  const redeemedInvite = hasRedeemedInvite(profile);
  const canStartOrientation =
    Boolean(user && next?.module_id === "m00") &&
    !onboarded &&
    hasCompletedActivation(profile);
  const canContinueWithoutOnboarding =
    Boolean(user) && !onboarded && hasCompletedActivation(profile);
  const canStartDiagnostic =
    Boolean(user) &&
    !onboarded &&
    !hasCompletedActivation(profile) &&
    (rememberedInvite || redeemedInvite || showTestReset);
  const continueHref = onboarded || canContinueWithoutOnboarding
    ? next
      ? lessonPath(next.id)
      : COURSE_PATH
    : canStartDiagnostic
      ? START_PATH
    : canStartOrientation && next
      ? lessonPath(next.id)
    : ONBOARDING_PATH;

  return (
    <main className="relative min-h-dvh overflow-x-hidden px-5 py-10 sm:px-8">
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
              <Link
                href={continueHref}
                className="inline-block rounded-lg bg-primary px-9 py-3.5 text-base font-semibold text-on-primary shadow-sm transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-primary-hover active:translate-y-0"
              >
                {onboarded || (canContinueWithoutOnboarding && !canStartOrientation)
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
          <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-6xl flex-col justify-start gap-8 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-20 sm:justify-center sm:gap-12 sm:pt-20 lg:gap-16">
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
                    {locale === "zh" && (
                      <p className="text-sm leading-5 text-muted sm:text-base sm:leading-6">
                        {t.tagline}
                      </p>
                    )}
                    {t.nameMeaning && (
                      <p className="text-sm leading-5 text-muted sm:text-base sm:leading-6">
                        {t.nameMeaning}
                      </p>
                    )}
                  </div>
                </div>

                <div
                  className={
                    locale === "en"
                      ? "max-w-3xl space-y-4 sm:space-y-6"
                      : "max-w-3xl space-y-4 border-l-4 border-accent pl-5 sm:space-y-6 sm:pl-6"
                  }
                >
                  <h1 className="landing-headline landing-home-headline font-serif font-semibold text-ink">
                    {landingTitleParts.map((part, index) => (
                      <span
                        key={`${index}-${part}`}
                        aria-hidden={part === "" ? "true" : undefined}
                        className={
                          part === ""
                            ? "landing-title-gap"
                            : index === 0
                              ? "landing-title-lead"
                              : "landing-title-line"
                        }
                      >
                        {part}
                      </span>
                    ))}
                  </h1>
                  <div className="max-w-[34rem] space-y-3">
                    <p className="text-base leading-7 text-muted">
                      {t.landingBody}
                    </p>
                    {t.landingAudience && (
                      <p
                        className={
                          locale === "en"
                            ? "hidden text-base italic leading-7 text-muted sm:block"
                            : "text-base italic leading-7 text-muted"
                        }
                      >
                        {t.landingAudience}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <aside className="min-w-0 space-y-5 lg:pt-0">
                <div className="space-y-3 sm:space-y-4">
                  <TrackedLink
                    href="/login"
                    event={{
                      eventName: "landing_cta_clicked",
                      locale,
                      properties: { surface: "home", cta: "primary" },
                    }}
                    className="block min-h-11 rounded-lg bg-primary px-7 py-3 text-center text-base font-semibold text-on-primary shadow-lg transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-primary-hover hover:shadow-xl active:translate-y-0 sm:min-h-12 sm:py-4"
                  >
                    {t.landingPrimary}
                  </TrackedLink>
                  <TrackedLink
                    href="/login"
                    event={{
                      eventName: "landing_cta_clicked",
                      locale,
                      properties: { surface: "home", cta: "secondary" },
                    }}
                    className="block min-h-11 text-center text-sm font-medium leading-10 text-muted transition-colors hover:text-ink"
                  >
                    {t.landingSecondary}
                  </TrackedLink>
                </div>

                <div className="border-t border-line pt-4 lg:border-t-0 lg:pt-0">
                  <p className="text-[0.7rem] font-medium leading-5 text-muted">
                    {t.landingProof}
                  </p>
                  <p className="mt-1.5 max-w-full text-[0.7rem] leading-5 text-muted">
                    {t.landingSources.join(" · ")}
                  </p>
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
