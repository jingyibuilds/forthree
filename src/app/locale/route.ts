import { NextResponse, type NextRequest } from "next/server";

// Sets the UI language cookie and bounces back. A plain GET link rather than
// a server action so it keeps working on pages left open across deploys.
export async function GET(request: NextRequest) {
  const to = request.nextUrl.searchParams.get("to") === "zh" ? "zh" : "en";

  const referer = request.headers.get("referer");
  let back = "/";
  if (referer) {
    const url = new URL(referer);
    if (url.origin === request.nextUrl.origin) {
      back = url.pathname + url.search;
    }
  }

  const res = NextResponse.redirect(new URL(back, request.url));
  res.cookies.set("locale", to, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}
