// Tier-0 static content spine: JSON in /content, statically imported so it
// ships inside the bundle (no fs, no DB). Register new files here; structure
// is enforced by scripts/validate-content.mjs at build time.
import m01 from "../../content/stage-1/module-01/module.json";
import m01l01 from "../../content/stage-1/module-01/lesson-01.json";
import m01l02 from "../../content/stage-1/module-01/lesson-02.json";
import stagesData from "../../content/stages.json";

export type ReadingBlock = { type: "reading"; body_en: string; body_zh: string };
export type ConceptBlock = {
  type: "concept";
  term: string;
  term_zh: string;
  anchor_en: string;
  anchor_zh: string;
  explain_en: string;
  explain_zh: string;
};
export type ExerciseBlock = { type: "exercise"; ref: string };
export type Block = ReadingBlock | ConceptBlock | ExerciseBlock;

export type McqExercise = {
  id: string;
  type: "mcq";
  prompt_en: string;
  prompt_zh: string;
  options_en: string[];
  options_zh: string[];
  answer: number;
  explain_en: string;
  explain_zh: string;
  difficulty: number;
  xp_value: number;
};
export type FillInExercise = {
  id: string;
  type: "fill_in";
  prompt_en: string;
  prompt_zh: string;
  // Term drills deliberately require the English term (graduation ability #3:
  // agent transcripts are English); the player badges them so the requirement
  // reads as design, not as a gap in the Chinese course.
  term_drill?: boolean;
  answer_spec: { accept?: string[]; regex?: string; ignore_case?: boolean };
  explain_en: string;
  explain_zh: string;
  difficulty: number;
  xp_value: number;
};
export type Exercise = McqExercise | FillInExercise;

export type Lesson = {
  id: string;
  module_id: string;
  order: number;
  format: string;
  tag: "core" | "elective";
  est_minutes: number;
  title_en: string;
  title_zh: string;
  // Optional design rationale, shown at lesson start: why this lesson, why now.
  why_en?: string;
  why_zh?: string;
  blocks: Block[];
  exercises: Exercise[];
};

export type Stage = {
  stage: number;
  label_zh: string;
  label_en: string;
  title_en: string;
  title_zh: string;
  milestone_en: string;
  milestone_zh: string;
};

export type CourseMap = {
  course_title_en: string;
  course_title_zh: string;
  course_promise_en: string;
  course_promise_zh: string;
  stages: Stage[];
};

export const courseMap: CourseMap = stagesData as CourseMap;

export type Module = {
  id: string;
  stage: number;
  order: number;
  title_en: string;
  title_zh: string;
  description_en: string;
  description_zh: string;
  refs: string[];
};

export const modules: Module[] = [m01 as Module];
export const lessons: Lesson[] = [m01l01 as Lesson, m01l02 as Lesson].sort(
  (a, b) => a.module_id.localeCompare(b.module_id) || a.order - b.order
);

export function getLesson(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}

export function getModule(id: string): Module | undefined {
  return modules.find((m) => m.id === id);
}

// A lesson is complete when every one of its exercises has a correct attempt.
export function nextLesson(correctExerciseIds: Set<string>): Lesson | undefined {
  return lessons.find((l) => !l.exercises.every((e) => correctExerciseIds.has(e.id)));
}
