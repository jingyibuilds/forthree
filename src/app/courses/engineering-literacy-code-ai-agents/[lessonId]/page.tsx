import { notFound, redirect } from "next/navigation";
import { canEnterFirstRun, canEnterLearnerApp, hasRememberedInvite } from "@/lib/access";
import { hasCompletedActivation } from "@/lib/activation-diagnostic";
import {
  getDevLocalProfile,
  getDevLocalUser,
} from "@/lib/dev-local-account";
import { createClient } from "@/lib/supabase/server";
import { dict, getLocale } from "@/lib/i18n";
import { getLesson, lessons, nextLesson } from "@/lib/content";
import { LessonPlayer } from "@/components/lesson-player";
import { getLearnerProfile, ONBOARDING_PATH } from "@/lib/profile";
import { START_PATH } from "@/lib/routes";

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { lessonId } = await params;
  const { step } = await searchParams;
  const lesson = getLesson(lessonId);
  if (!lesson) notFound();
  const parsedStep = Number(step);
  const initialIndex =
    Number.isInteger(parsedStep) && parsedStep >= 0 && parsedStep < lesson.blocks.length
      ? parsedStep
      : 0;

  const locale = await getLocale();
  const devUser = await getDevLocalUser();
  const supabase = devUser ? null : await createClient();
  const {
    data: { user: supabaseUser },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const user = devUser ?? supabaseUser;
  if (!user) redirect("/login");
  const profile = devUser
    ? await getDevLocalProfile()
    : supabase
      ? await getLearnerProfile(supabase, user.id)
      : null;
  const hasFullAccess = canEnterLearnerApp(user.email, profile);
  const hasOrientationAccess =
    !hasFullAccess &&
    lesson.module_id === "m00" &&
    (canEnterFirstRun(user.email, profile) ||
      hasCompletedActivation(profile) ||
      (await hasRememberedInvite(user.email)));
  if (!hasFullAccess && !hasOrientationAccess) {
    redirect(ONBOARDING_PATH);
  }
  if (hasOrientationAccess && !hasCompletedActivation(profile)) {
    redirect(START_PATH);
  }

  const ids = lesson.exercises.map((e) => e.id);
  const { data: attempts } = supabase
    ? await supabase
        .from("attempts")
        .select("exercise_id")
        .eq("user_id", user.id)
        .eq("correct", true)
    : { data: [] };
  const correctExerciseIds = new Set(
    (attempts ?? []).map((a) => a.exercise_id as string)
  );
  const alreadyCorrect = ids.filter((id) => correctExerciseIds.has(id));
  const afterCompletionCorrect = new Set([...correctExerciseIds, ...ids]);
  const lessonIndex = lessons.findIndex((item) => item.id === lesson.id);
  const devLocalNextLesson =
    devUser && lessonIndex >= 0 ? lessons[lessonIndex + 1] : undefined;
  const nextAfterCompletion = devUser
    ? devLocalNextLesson
    : nextLesson(afterCompletionCorrect);
  const nextLessonIdAfterCompletion =
    nextAfterCompletion &&
    (hasFullAccess || nextAfterCompletion.module_id === "m00")
      ? nextAfterCompletion.id
      : undefined;

  return (
    <LessonPlayer
      lesson={lesson}
      locale={locale}
      t={dict[locale]}
      alreadyCorrect={alreadyCorrect}
      initialIndex={initialIndex}
      assistantEnabled={hasFullAccess}
      nextLessonIdAfterCompletion={nextLessonIdAfterCompletion}
    />
  );
}
