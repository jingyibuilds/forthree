import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { hasRedeemedInvite, hasRememberedInvite } from "@/lib/access";
import { hasCompletedActivation } from "@/lib/activation-diagnostic";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getLearnerProfile, hasCompletedOnboarding } from "@/lib/profile";
import { START_PATH } from "@/lib/routes";
import { recordEvent } from "@/lib/analytics-server";
import { canResetTestAccount } from "@/lib/test-account";
import { resetLearnerOwnedState } from "@/lib/test-account-reset";

// Magic-link landing. Supports both Supabase email flows:
// 1. Default template ({{ .ConfirmationURL }}): arrives with ?code=..., exchanged
//    for a session (PKCE — the link must be opened in the browser that requested it).
// 2. Custom template with token_hash (requires custom SMTP to edit): ?token_hash=...&type=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirectAfterAuth(supabase, request.url);
    }
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return redirectAfterAuth(supabase, request.url);
    }
  }

  return NextResponse.redirect(new URL("/login?error=invalid_link", request.url));
}

async function redirectAfterAuth(
  supabase: Awaited<ReturnType<typeof createClient>>,
  requestUrl: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", requestUrl));
  }

  if (canResetTestAccount(user.email)) {
    await resetLearnerOwnedState(user.id);
    return NextResponse.redirect(new URL(`${START_PATH}?fresh=1`, requestUrl));
  }

  let profile = await getLearnerProfile(supabase, user.id);
  const hasInvite = await hasRememberedInvite(user.email);
  if (hasInvite && !hasCompletedOnboarding(profile)) {
    try {
      const admin = createAdminClient();
      const now = new Date().toISOString();
      await admin.from("learner_profiles").upsert({
        user_id: user.id,
        background: {
          ...(profile?.background ?? {}),
          invite: {
            redeemed: true,
            redeemed_at: now,
            version: 1,
          },
        },
        preferences: profile?.preferences ?? {},
        lang_pref: profile?.lang_pref ?? "en",
        success_definition: profile?.success_definition ?? null,
        weekly_budget_hours: profile?.weekly_budget_hours ?? null,
        updated_at: now,
      });
      profile = await getLearnerProfile(supabase, user.id);
    } catch {
      // The remembered invite still lets this first run continue; the durable
      // marker is best-effort if local admin env is missing during development.
    }
  }
  const hasDurableInvite = hasRedeemedInvite(profile);
  await recordEvent({
    eventName:
      hasInvite ||
      hasDurableInvite ||
      hasCompletedOnboarding(profile) ||
      hasCompletedActivation(profile)
        ? "auth_completed"
        : "auth_friction_detected",
    userId: user.id,
    route: "/auth/confirm",
    properties: {
      has_profile: Boolean(profile),
      onboarded: hasCompletedOnboarding(profile),
      activation_completed: hasCompletedActivation(profile),
      invite_cookie_present: hasInvite,
      invite_redeemed: hasDurableInvite,
    },
  });
  const nextPath = hasCompletedOnboarding(profile)
    ? "/"
    : hasCompletedActivation(profile)
      ? "/"
      : hasInvite || hasDurableInvite
        ? START_PATH
        : "/login?error=not_authorized";
  return NextResponse.redirect(new URL(nextPath, requestUrl));
}
