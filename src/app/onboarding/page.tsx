import Link from "next/link";
import { redirect } from "next/navigation";
import { canEnterLearnerApp, hasRememberedInvite } from "@/lib/access";
import { FreshStartCleanup } from "@/components/fresh-start-cleanup";
import { LocaleToggle } from "@/components/locale-toggle";
import { Seal } from "@/components/seal";
import { dict, getLocale } from "@/lib/i18n";
import { getLearnerProfile, hasCompletedOnboarding, learningId } from "@/lib/profile";
import { COURSE_PATH } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ fresh?: string; edit?: string }>;
}) {
  const locale = await getLocale();
  const t = dict[locale];
  const { fresh, edit } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getLearnerProfile(supabase, user.id);
  const canCreateProfile =
    canEnterLearnerApp(user.email, profile) || (await hasRememberedInvite(user.email));
  if (!canCreateProfile) redirect("/login?error=not_authorized");

  if (hasCompletedOnboarding(profile) && edit !== "1") {
    redirect(COURSE_PATH);
  }

  return (
    <main className="relative mx-auto min-h-dvh w-full max-w-5xl px-5 py-10 sm:px-8">
      {fresh === "1" && <FreshStartCleanup target="/onboarding" />}
      <LocaleToggle locale={locale} />
      <header className="flex max-w-3xl items-start gap-4">
        <Link href="/" aria-label={t.name}>
          <Seal size={48} />
        </Link>
        <div>
          <p className="text-sm font-medium text-primary">{t.onboardingKicker}</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight">
            {t.onboardingTitle}
          </h1>
          <p className="mt-3 text-base leading-7 text-muted">{t.onboardingIntro}</p>
        </div>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        {t.onboardingSignals.map((signal, index) => (
          <div key={signal} className="border-l-4 border-accent bg-surface px-4 py-3 shadow-sm">
            <p className="font-mono text-xs text-primary">0{index + 1}</p>
            <p className="mt-1 text-sm font-medium leading-5">{signal}</p>
          </div>
        ))}
      </section>

      <div className="mt-8 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted shadow-sm">
        <span className="font-medium text-ink">{t.learningIdLabel}</span>{" "}
        <span className="font-mono text-primary">{learningId(user)}</span>
        <span className="mx-2 text-line">/</span>
        <span>{user.email}</span>
      </div>

      <div className="mt-8">
        <OnboardingForm t={t} />
      </div>
    </main>
  );
}
