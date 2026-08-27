import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dict, getLocale } from "@/lib/i18n";
import { getLesson } from "@/lib/content";
import { LessonPlayer } from "./lesson-player";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const lesson = getLesson(lessonId);
  if (!lesson) notFound();

  const locale = await getLocale();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ids = lesson.exercises.map((e) => e.id);
  const { data: attempts } = await supabase
    .from("attempts")
    .select("exercise_id")
    .eq("correct", true)
    .in("exercise_id", ids);
  const alreadyCorrect = (attempts ?? []).map((a) => a.exercise_id as string);

  return (
    <LessonPlayer
      lesson={lesson}
      locale={locale}
      t={dict[locale]}
      alreadyCorrect={alreadyCorrect}
    />
  );
}
