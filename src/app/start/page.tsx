import Link from "next/link";
import { redirect } from "next/navigation";
import { canEnterFirstRun, hasRememberedInvite } from "@/lib/access";
import { hasCompletedActivation } from "@/lib/activation-diagnostic";
import { LocaleToggle } from "@/components/locale-toggle";
import { Seal } from "@/components/seal";
import { dict, getLocale } from "@/lib/i18n";
import { getLearnerProfile } from "@/lib/profile";
import { COURSE_PATH } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { StartDiagnostic } from "./start-diagnostic";

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ again?: string }>;
}) {
  const locale = await getLocale();
  const t = dict[locale];
  const { again } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getLearnerProfile(supabase, user.id);
  const rememberedInvite = await hasRememberedInvite(user.email);
  const canStart =
    canEnterFirstRun(user.email, profile) ||
    rememberedInvite ||
    hasCompletedActivation(profile);
  if (!canStart) redirect("/login?error=not_authorized");

  if (again !== "1" && hasCompletedActivation(profile)) {
    redirect(COURSE_PATH);
  }

  return (
    <main className="relative min-h-dvh px-5 py-8 sm:px-8 sm:py-10">
      <LocaleToggle locale={locale} />
      <Link
        href="/"
        aria-label={t.name}
        className="inline-flex items-center gap-3"
      >
        <Seal size={40} />
        <span>
          <span className="block font-serif text-2xl font-semibold leading-none text-ink">
            {t.name}
          </span>
          <span className="mt-1 block text-sm text-muted">{t.tagline}</span>
        </span>
      </Link>
      <StartDiagnostic locale={locale} />
    </main>
  );
}
