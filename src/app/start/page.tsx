import Link from "next/link";
import { redirect } from "next/navigation";
import { canEnterFirstRun, hasRememberedInvite } from "@/lib/access";
import { hasCompletedActivation } from "@/lib/activation-diagnostic";
import { LocaleToggle } from "@/components/locale-toggle";
import { Seal } from "@/components/seal";
import { FreshStartCleanup } from "@/components/fresh-start-cleanup";
import { getDevLocalProfile, getDevLocalUser } from "@/lib/dev-local-account";
import { dict, getLocale } from "@/lib/i18n";
import { getLearnerProfile } from "@/lib/profile";
import { COURSE_PATH, START_PATH } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { StartDiagnostic } from "./start-diagnostic";

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ again?: string; fresh?: string }>;
}) {
  const locale = await getLocale();
  const t = dict[locale];
  const { again, fresh } = await searchParams;
  const devUser = await getDevLocalUser();
  const supabase = devUser ? null : await createClient();
  const {
    data: { user: supabaseUser },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const user = devUser ?? supabaseUser;

  if (!user) redirect("/login");

  const profile = devUser
    ? await getDevLocalProfile()
    : supabase
      ? await getLearnerProfile(supabase, user.id)
      : null;
  const rememberedInvite = devUser ? true : await hasRememberedInvite(user.email);
  const canStart =
    canEnterFirstRun(user.email, profile) ||
    rememberedInvite ||
    hasCompletedActivation(profile);
  if (!canStart) redirect("/login?error=not_authorized");

  if (again !== "1" && hasCompletedActivation(profile)) {
    redirect(COURSE_PATH);
  }

  return (
    <main className="relative min-h-dvh overflow-x-hidden px-5 py-8 sm:px-8 sm:py-10">
      {fresh === "1" && <FreshStartCleanup target={START_PATH} />}
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
