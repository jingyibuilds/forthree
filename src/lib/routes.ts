export const COURSE_SLUG = "engineering-literacy-code-ai-agents";
export const COURSE_PATH = `/courses/${COURSE_SLUG}`;
export const START_PATH = "/start";

export function lessonPath(lessonId: string, step?: number) {
  const path = `${COURSE_PATH}/${lessonId}`;
  return typeof step === "number" ? `${path}?step=${step}` : path;
}
