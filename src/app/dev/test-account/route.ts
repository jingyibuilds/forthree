import { NextResponse, type NextRequest } from "next/server";
import {
  isDevLocalAccountEnabled,
  setDevLocalCookies,
} from "@/lib/dev-local-account";
import { START_PATH } from "@/lib/routes";

export function GET(request: NextRequest) {
  if (!isDevLocalAccountEnabled()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const response = NextResponse.redirect(new URL(`${START_PATH}?fresh=1`, request.url));
  setDevLocalCookies(response.cookies, "fresh");
  return response;
}
