import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canResetTestAccount } from "@/lib/test-account";

const USER_SCOPED_TABLES = [
  "lesson_assistant_messages",
  "lesson_assistant_threads",
  "lesson_time_events",
  "attempts",
  "xp_events",
  "user_achievements",
  "srs_items",
  "streaks",
  "pulse_checks",
  "skip_debts",
  "llm_usage",
  "plans",
  "learner_profiles",
] as const;

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

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "test reset is not configured" }, { status: 503 });
  }

  for (const table of USER_SCOPED_TABLES) {
    const { error } = await admin.from(table).delete().eq("user_id", user.id);
    if (error) {
      return NextResponse.json({ error: `reset failed on ${table}` }, { status: 500 });
    }
  }

  return NextResponse.redirect(new URL("/onboarding?fresh=1", request.url));
}
