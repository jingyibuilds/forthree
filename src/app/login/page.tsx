import Link from "next/link";
import { dict, getLocale } from "@/lib/i18n";
import { LocaleToggle } from "@/components/locale-toggle";
import { LoginForm } from "./login-form";
import { Seal } from "@/components/seal";
import { hasRememberedInvite } from "@/lib/access";
import { hasCompletedActivation } from "@/lib/activation-diagnostic";
import { nextLesson } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";
import {
  getLearnerProfile,
  hasCompletedOnboarding,
  ONBOARDING_PATH,
} from "@/lib/profile";
import { canResetTestAccount } from "@/lib/test-account";
import { COURSE_PATH, START_PATH, lessonPath } from "@/lib/routes";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const locale = await getLocale();
  const t = dict[locale];
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getLearnerProfile(supabase, user.id) : null;
  const onboarded = hasCompletedOnboarding(profile);
  const { data: attempts } = user
    ? await supabase.from("attempts").select("exercise_id").eq("correct", true)
    : { data: [] };
  const correct = new Set((attempts ?? []).map((a) => a.exercise_id as string));
  const next = nextLesson(correct);
  const rememberedInvite = user ? await hasRememberedInvite(user.email) : false;
  const canStartOrientation =
    Boolean(user && !onboarded) &&
    hasCompletedActivation(profile) &&
    (rememberedInvite || canResetTestAccount(user?.email));
  const canStartDiagnostic =
    Boolean(user) &&
    !onboarded &&
    !hasCompletedActivation(profile) &&
    (rememberedInvite || canResetTestAccount(user?.email));
  const continueHref = onboarded
    ? next
      ? lessonPath(next.id)
      : COURSE_PATH
    : canStartDiagnostic
      ? START_PATH
    : canStartOrientation
      ? lessonPath("m00-l01")
      : ONBOARDING_PATH;

  return (
    <main className="relative min-h-dvh overflow-x-hidden px-5 py-6 sm:px-8 sm:py-10">
      <LocaleToggle locale={locale} />
      <div className="mx-auto grid min-w-0 w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center lg:gap-10">
        <section className="min-w-0 space-y-5 sm:space-y-8">
          <div className="flex items-center gap-3">
            <Seal size={40} />
            <div>
              <p className="font-serif text-2xl font-semibold">{t.name}</p>
              <p className="mt-0.5 text-sm text-muted">{t.tagline}</p>
              {t.nameMeaning && (
                <p className="mt-0.5 text-xs text-muted">{t.nameMeaning}</p>
              )}
            </div>
          </div>

          <div className="max-w-2xl border-l-4 border-accent pl-5">
            <h1 className="landing-headline max-w-[20ch] whitespace-pre-line font-serif text-[clamp(1.6rem,7vw,3rem)] font-semibold text-ink">
              {t.landingTitle}
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-muted sm:text-base sm:leading-7">
              {t.landingBody}
            </p>
            <p className="mt-3 hidden max-w-lg text-sm italic leading-6 text-muted sm:mt-4 sm:block">
              {t.landingAudience}
            </p>
          </div>

          <div className="hidden max-w-xl border-y border-line py-4 sm:block">
            <p className="text-xs font-medium uppercase text-muted">{t.landingProof}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-primary sm:text-sm">
              {t.landingSources.map((source) => (
                <span key={source}>{source}</span>
              ))}
            </div>
          </div>
        </section>

        <aside className="min-w-0 rounded-lg border border-line bg-surface p-5 shadow-lg">
          {user ? (
            <div className="space-y-4">
              <p className="text-sm font-medium text-ink">{t.signedInNote}</p>
              <Link
                href={continueHref}
                className="block rounded-lg bg-primary px-5 py-3 text-center text-sm font-semibold text-on-primary shadow-sm transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-primary-hover active:translate-y-0"
              >
                {t.continueLearning}
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="w-full rounded-lg border border-line bg-background px-5 py-3 text-sm font-medium text-muted transition-[border-color,color,transform] hover:-translate-y-px hover:border-primary hover:text-primary active:translate-y-0"
                >
                  {t.signOut}
                </button>
              </form>
            </div>
          ) : (
            <>
              <LoginForm
                t={{
                  email: t.email,
                  inviteHint: t.inviteHint,
                  firstSignupInvite: t.firstSignupInvite,
                  send: t.send,
                  sending: t.sending,
                  linkInvalid: t.linkInvalid,
                  notAuthorizedLogin: t.notAuthorizedLogin,
                }}
                linkError={error === "invalid_link"}
                accessError={error === "not_authorized"}
              />
              <p className="mt-4 border-t border-line pt-4 text-sm leading-6 text-muted">
                {t.loginInviteNote}
              </p>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
