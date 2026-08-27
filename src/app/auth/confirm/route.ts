import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
      return NextResponse.redirect(new URL("/", request.url));
    }
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=invalid_link", request.url));
}
