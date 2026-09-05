"use server";

import { createClient } from "@/lib/supabase/server";
import { actionMessages, getLocale } from "@/lib/i18n";
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
