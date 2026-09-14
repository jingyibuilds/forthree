import { NextResponse, type NextRequest } from "next/server";
import { recordEvent } from "@/lib/analytics-server";
import { hasSupabaseAuthCookieInList } from "@/lib/supabase/session-cookies";
import { createClient } from "@/lib/supabase/server";

// Sets the UI language cookie and bounces back. A plain GET link rather than
// a server action so it keeps working on pages left open across deploys.
export async function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get("to") === "zh" ? "zh" : "en";
  const requestedBack = request.nextUrl.searchParams.get("back");

  const referer = request.headers.get("referer");
  let back = "/";
  if (requestedBack?.startsWith("/") && !requestedBack.startsWith("//")) {
    back = requestedBack;
  } else if (referer) {
    const url = new URL(referer);
    if (url.origin === request.nextUrl.origin) {
      back = url.pathname + url.search;
    }
  }

  const res = NextResponse.redirect(new URL(back, request.url));
  res.cookies.set("locale", to, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  if (hasSupabaseAuthCookieInList(request.cookies.getAll())) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await recordEvent({
        eventName: "locale_changed",
        userId: user.id,
        locale: to,
        route: back,
        properties: { to },
      });
    }
  }
  return res;
}
