import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { hasRememberedInvite } from "@/lib/access";
import { hasCompletedActivation } from "@/lib/activation-diagnostic";
import { createClient } from "@/lib/supabase/server";
import { getLearnerProfile, hasCompletedOnboarding, ONBOARDING_PATH } from "@/lib/profile";
import { lessonPath, START_PATH } from "@/lib/routes";

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

  const profile = await getLearnerProfile(supabase, user.id);
  const nextPath = hasCompletedOnboarding(profile)
    ? "/"
    : (await hasRememberedInvite(user.email))
      ? hasCompletedActivation(profile)
        ? lessonPath("m00-l01")
        : START_PATH
      : ONBOARDING_PATH;
  return NextResponse.redirect(new URL(nextPath, requestUrl));
}
