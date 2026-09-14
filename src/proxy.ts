import { NextResponse, type NextRequest } from "next/server";
import { DEV_LOCAL_USER_COOKIE } from "@/lib/dev-local-account";
import { hasSupabaseAuthCookieInList } from "@/lib/supabase/session-cookies";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    if (request.nextUrl.pathname.startsWith("/dev/")) {
      return NextResponse.next();
    }
    if (request.cookies.get(DEV_LOCAL_USER_COOKIE)?.value === "1") {
      return NextResponse.next();
    }
  }

  if (!hasSupabaseAuthCookieInList(request.cookies.getAll())) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on everything except static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
