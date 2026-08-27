import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLesson } from "@/lib/content";

type ClientResult = {
  exerciseId: string;
  response: string;
  correct: boolean;
  firstTry: boolean;
};

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
  };
  const lesson = body.lessonId ? getLesson(body.lessonId) : undefined;
  if (!lesson || !Array.isArray(body.results)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const exercises = new Map(lesson.exercises.map((e) => [e.id, e]));
  const results = body.results.filter((r) => exercises.has(r.exerciseId));
  if (results.length === 0) {
    return NextResponse.json({ awardedXp: 0, xpPersisted: true });
  }

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

  let awardedXp = 0;
  for (const r of results) {
    if (!r.correct || priorCorrect.has(r.exerciseId)) continue;
    const xp = exercises.get(r.exerciseId)!.xp_value;
    awardedXp += r.firstTry ? xp : Math.floor(xp / 2);
  }

  let xpPersisted = true;
  if (awardedXp > 0) {
    const { error: xpError } = await supabase.from("xp_events").insert({
      user_id: user.id,
      amount: awardedXp,
      source: lesson.id,
    });
    // Fails until migration 0002 adds the insert policy — degrade gracefully.
    if (xpError) xpPersisted = false;
  }

  return NextResponse.json({ awardedXp, xpPersisted });
}
