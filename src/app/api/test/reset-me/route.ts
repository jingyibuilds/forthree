import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canResetTestAccount } from "@/lib/test-account";
import { resetLearnerOwnedState } from "@/lib/test-account-reset";
import { START_PATH } from "@/lib/routes";

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return new URL(origin).origin === new URL(request.url).origin;
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!canResetTestAccount(user.email)) {
    return NextResponse.json({ error: "not a test account" }, { status: 403 });
  }

  try {
    await resetLearnerOwnedState(user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json(
      { error: message.startsWith("test reset failed") ? message : "test reset is not configured" },
      { status: message.startsWith("test reset failed") ? 500 : 503 }
    );
  }

  return NextResponse.redirect(new URL(`${START_PATH}?fresh=1`, request.url));
}
