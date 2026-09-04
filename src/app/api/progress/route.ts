import { NextResponse, type NextRequest } from "next/server";
import { canEnterLearnerApp, hasRememberedInvite } from "@/lib/access";
import { hasCompletedActivation } from "@/lib/activation-diagnostic";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLesson } from "@/lib/content";
import { getLearnerProfile } from "@/lib/profile";

type ClientResult = {
  exerciseId: string;
  response: string;
  correct: boolean;
  firstTry: boolean;
};

type TimeSource = "heartbeat" | "step" | "completion";

const MAX_ACTIVE_SECONDS_PER_EVENT = 600;
const TIME_PAGE_SIZE = 1000;

function boundedActiveSeconds(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(MAX_ACTIVE_SECONDS_PER_EVENT, Math.max(0, Math.floor(value)));
}

function parseDate(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sameUserDayBounds(body: { todayStartIso?: string; todayEndIso?: string }) {
  const start = parseDate(body.todayStartIso);
  const end = parseDate(body.todayEndIso);
  if (start && end) {
    const hours = (end.getTime() - start.getTime()) / 36e5;
    if (hours > 0 && hours <= 36) {
      return { start: start.toISOString(), end: end.toISOString() };
    }
  }

  const fallbackStart = new Date();
  fallbackStart.setUTCHours(0, 0, 0, 0);
  const fallbackEnd = new Date(fallbackStart);
  fallbackEnd.setUTCDate(fallbackEnd.getUTCDate() + 1);
  return { start: fallbackStart.toISOString(), end: fallbackEnd.toISOString() };
}

async function timeSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  lessonId: string,
  body: { todayStartIso?: string; todayEndIso?: string }
) {
  async function sumLessonSeconds() {
    let total = 0;
    for (let page = 0; page < 20; page += 1) {
      const from = page * TIME_PAGE_SIZE;
      const to = from + TIME_PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("lesson_time_events")
        .select("active_seconds")
        .eq("user_id", userId)
        .eq("lesson_id", lessonId)
        .order("id", { ascending: true })
        .range(from, to);
      if (error) return 0;
      total += (data ?? []).reduce((sum, row) => sum + (row.active_seconds ?? 0), 0);
      if (!data || data.length < TIME_PAGE_SIZE) return total;
    }
    return total;
  }

  const bounds = sameUserDayBounds(body);
  async function sumTodaySeconds() {
    let total = 0;
    for (let page = 0; page < 20; page += 1) {
      const from = page * TIME_PAGE_SIZE;
      const to = from + TIME_PAGE_SIZE - 1;
      const { data, error } = await supabase
        .from("lesson_time_events")
        .select("active_seconds")
        .eq("user_id", userId)
        .gte("created_at", bounds.start)
        .lt("created_at", bounds.end)
        .order("id", { ascending: true })
        .range(from, to);
      if (error) return 0;
      total += (data ?? []).reduce((sum, row) => sum + (row.active_seconds ?? 0), 0);
      if (!data || data.length < TIME_PAGE_SIZE) return total;
    }
    return total;
  }

  const [lessonActiveSeconds, todayActiveSeconds] = await Promise.all([
    sumLessonSeconds(),
    sumTodaySeconds(),
  ]);

  return { lessonActiveSeconds, todayActiveSeconds };
}

// Records lesson results: attempts rows + one xp_events row.
// XP rules (content/schema.md): first-try correct = full value; correct after
// a wrong try = half; already-completed exercises = zero (no grinding).
// firstTry is client-reported — acceptable while single-user.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const body = (await request.json()) as {
    lessonId?: string;
    results?: ClientResult[];
    activeSeconds?: number;
    blockIndex?: number;
    clientEventId?: string;
    source?: TimeSource;
    timeSummary?: boolean;
    todayStartIso?: string;
    todayEndIso?: string;
  };
  const lesson = body.lessonId ? getLesson(body.lessonId) : undefined;
  if (!lesson) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const profile = await getLearnerProfile(supabase, user.id);
  const hasFullAccess = canEnterLearnerApp(user.email, profile);
  const hasOrientationAccess =
    !hasFullAccess &&
    hasCompletedActivation(profile) &&
    lesson.module_id === "m00" &&
    (await hasRememberedInvite(user.email));
  if (!hasFullAccess && !hasOrientationAccess) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const activeSeconds = boundedActiveSeconds(body.activeSeconds);
  const wantsTime = Boolean(body.timeSummary) || activeSeconds > 0;
  if (!Array.isArray(body.results) && !wantsTime) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (activeSeconds > 0 && !body.clientEventId) {
    return NextResponse.json({ error: "missing time event id" }, { status: 400 });
  }

  const exercises = new Map(lesson.exercises.map((e) => [e.id, e]));
  const results = Array.isArray(body.results)
    ? body.results.filter((r) => exercises.has(r.exerciseId))
    : [];
  let awardedXp = 0;
  let xpPersisted = true;
  let timePersisted = true;

  if (results.length > 0) {
    const { data: prior } = await supabase
      .from("attempts")
      .select("exercise_id")
      .eq("correct", true)
      .in(
        "exercise_id",
        results.map((r) => r.exerciseId)
      );
    const priorCorrect = new Set((prior ?? []).map((a) => a.exercise_id as string));

    const { error: attemptsError } = await supabase.from("attempts").insert(
      results.map((r) => ({
        user_id: user.id,
        exercise_id: r.exerciseId,
        response: { value: r.response },
        correct: r.correct,
        hints_used: 0,
      }))
    );
    if (attemptsError) {
      return NextResponse.json({ error: attemptsError.message }, { status: 500 });
    }

    for (const r of results) {
      if (!r.correct || priorCorrect.has(r.exerciseId)) continue;
      const xp = exercises.get(r.exerciseId)!.xp_value;
      awardedXp += r.firstTry ? xp : Math.floor(xp / 2);
    }

    if (awardedXp > 0) {
      const { error: xpError } = await supabase.from("xp_events").insert({
        user_id: user.id,
        amount: awardedXp,
        source: lesson.id,
      });
      // Fails until migration 0002 adds the insert policy — degrade gracefully.
      if (xpError) xpPersisted = false;
    }
  }

  if (activeSeconds > 0 && body.clientEventId) {
    const source: TimeSource =
      body.source === "step" || body.source === "completion" ? body.source : "heartbeat";
    try {
      const admin = createAdminClient();
      const { error: timeError } = await admin.from("lesson_time_events").insert({
        user_id: user.id,
        lesson_id: lesson.id,
        block_index:
          typeof body.blockIndex === "number" && Number.isInteger(body.blockIndex)
            ? body.blockIndex
            : null,
        active_seconds: activeSeconds,
        source,
        client_event_id: body.clientEventId,
      });

      // Duplicate keepalive retries are harmless; missing migration degrades to
      // estimated-only progress until 0006 is applied.
      if (timeError && timeError.code !== "23505") timePersisted = false;
    } catch {
      timePersisted = false;
    }
  }

  const summary = wantsTime
    ? await timeSummary(supabase, user.id, lesson.id, body)
    : { lessonActiveSeconds: 0, todayActiveSeconds: 0 };

  return NextResponse.json({ awardedXp, xpPersisted, timePersisted, ...summary });
}
