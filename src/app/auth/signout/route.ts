import { NextResponse, type NextRequest } from "next/server";
import { clearDevLocalCookies } from "@/lib/dev-local-account";
import { hasSupabaseAuthCookieInList } from "@/lib/supabase/session-cookies";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  if (hasSupabaseAuthCookieInList(request.cookies.getAll())) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  const response = NextResponse.redirect(new URL("/login", request.url));
  clearDevLocalCookies(response.cookies);
  return response;
}
