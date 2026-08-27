"use server";

import { createClient } from "@/lib/supabase/server";
import { actionMessages, getLocale } from "@/lib/i18n";

export type LoginState = {
  status: "idle" | "sent" | "error";
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
    return { status: "error", message: m.enterEmail };
  }

  // Signup gate: a new account is only created when the invite code matches.
  // Existing users sign in with email alone.
  const allowSignup =
    invite.length > 0 && invite === process.env.INVITE_CODE;

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
      return { status: "error", message: m.inviteRequired };
    }
    return { status: "error", message: error.message };
  }

  return { status: "sent", message: m.sent(email) };
}
