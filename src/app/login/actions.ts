"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasCompletedActivation } from "@/lib/activation-diagnostic";
import { actionMessages, getLocale } from "@/lib/i18n";
import { getLearnerProfile, hasCompletedOnboarding } from "@/lib/profile";
import { COURSE_PATH, START_PATH } from "@/lib/routes";
import { recordEvent } from "@/lib/analytics-server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isInviteCookieSigningConfigured,
  rememberInviteForEmail,
} from "@/lib/access";

export type LoginState = {
  status: "idle" | "sent" | "error";
  message: string;
  email: string;
  needsInvite: boolean;
};

export type InviteRecoveryState = {
  status: "idle" | "error";
  message: string;
};

export async function sendMagicLink(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const invite = String(formData.get("invite") ?? "").trim();
  const m = actionMessages[await getLocale()];

  if (!email) {
    return { status: "error", message: m.enterEmail, email, needsInvite: false };
  }

  // Signup gate: a new account is only created when the invite code matches.
  // Existing users sign in with email alone. A mistyped invite must not send a
  // magic link, even for an existing email, because the user explicitly tried
  // the gated path.
  const configuredInvite = process.env.INVITE_CODE?.trim();
  const allowSignup = Boolean(configuredInvite) && invite === configuredInvite;

  if (invite.length > 0 && !allowSignup) {
    return { status: "error", message: m.inviteRequired, email, needsInvite: true };
  }

  if (allowSignup && !isInviteCookieSigningConfigured()) {
    return { status: "error", message: m.sendFailed, email, needsInvite: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: allowSignup,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
    },
  });

  if (error) {
    // Supabase returns "Signups not allowed for otp" when the user does not
    // exist and shouldCreateUser is false.
    if (/signups not allowed/i.test(error.message)) {
      return { status: "error", message: m.inviteRequired, email, needsInvite: true };
    }
    return { status: "error", message: m.sendFailed, email, needsInvite: false };
  }

  if (allowSignup) {
    await rememberInviteForEmail(email);
  }

  return { status: "sent", message: m.sent(email), email, needsInvite: false };
}

export async function redeemInviteForCurrentUser(
  _prev: InviteRecoveryState,
  formData: FormData
): Promise<InviteRecoveryState> {
  const locale = await getLocale();
  const m = actionMessages[locale];
  const invite = String(formData.get("invite") ?? "").trim();
  const configuredInvite = process.env.INVITE_CODE?.trim();

  if (!configuredInvite || invite !== configuredInvite) {
    await recordEvent({
      eventName: "auth_friction_detected",
      locale,
      route: "/login",
      properties: { reason: "bad_invite_recovery" },
    });
    return { status: "error", message: m.inviteRequired };
  }

  if (!isInviteCookieSigningConfigured()) {
    return { status: "error", message: m.sendFailed };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { status: "error", message: m.loginRequired };
  }

  await rememberInviteForEmail(user.email);
  let profile = await getLearnerProfile(supabase, user.id);
  try {
    const admin = createAdminClient();
    const now = new Date().toISOString();
    const { error } = await admin.from("learner_profiles").upsert({
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
      lang_pref: profile?.lang_pref ?? locale,
      success_definition: profile?.success_definition ?? null,
      weekly_budget_hours: profile?.weekly_budget_hours ?? null,
      updated_at: now,
    });
    if (error) {
      return { status: "error", message: m.profileSaveFailed };
    }
  } catch {
    return { status: "error", message: m.profileSaveFailed };
  }
  profile = await getLearnerProfile(supabase, user.id);
  await recordEvent({
    eventName: "invite_redeemed",
    userId: user.id,
    locale,
    route: "/login",
    properties: { surface: "signed_in_recovery" },
  });

  if (hasCompletedOnboarding(profile)) redirect(COURSE_PATH);
  redirect(hasCompletedActivation(profile) ? COURSE_PATH : START_PATH);
}
