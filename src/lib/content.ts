// Tier-0 static content spine: JSON in /content, statically imported so it
// ships inside the bundle (no fs, no DB). Register new files here; structure
// is enforced by scripts/validate-content.mjs at build time.
import m01 from "../../content/stage-1/module-01/module.json";
import m00 from "../../content/stage-0/module-00/module.json";
import m00l01 from "../../content/stage-0/module-00/lesson-01.json";
import m00l02 from "../../content/stage-0/module-00/lesson-02.json";
import m00l03 from "../../content/stage-0/module-00/lesson-03.json";
import m01l01 from "../../content/stage-1/module-01/lesson-01.json";
import m01l02 from "../../content/stage-1/module-01/lesson-02.json";
import m01l03 from "../../content/stage-1/module-01/lesson-03.json";
import m01l04 from "../../content/stage-1/module-01/lesson-04.json";
import m01l05 from "../../content/stage-1/module-01/lesson-05.json";
import m01l06 from "../../content/stage-1/module-01/lesson-06.json";
import m01l07 from "../../content/stage-1/module-01/lesson-07.json";
import m01l08 from "../../content/stage-1/module-01/lesson-08.json";
import m01l09 from "../../content/stage-1/module-01/lesson-09.json";
import stagesData from "../../content/stages.json";

const ORIENTATION_MODULE_ID = "m00";

export type VisualKind =
  | "cs-scope-map"
  | "source-code-file"
  | "terminal-command"
  | "agent-command-log"
  | "pseudocode-vs-code"
  | "failure-stage"
  | "python-output";

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
export type VisualBlock = {
  type: "visual";
  kind: VisualKind;
  title_en: string;
  title_zh: string;
  caption_en: string;
  caption_zh: string;
  alt_en: string;
  alt_zh: string;
};
export type ExerciseBlock = { type: "exercise"; ref: string };
export type Block = ReadingBlock | ConceptBlock | VisualBlock | ExerciseBlock;

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
  advanced?: boolean;
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
  advanced?: boolean;
};
export type DragOrderExercise = {
  id: string;
  type: "drag_order";
  prompt_en: string;
  prompt_zh: string;
  items_en: string[];
  items_zh: string[];
  answer: number[];
  explain_en: string;
  explain_zh: string;
  difficulty: number;
  xp_value: number;
  advanced?: boolean;
};
export type Exercise = McqExercise | FillInExercise | DragOrderExercise;

export type LessonResource = {
  title_en: string;
  title_zh: string;
  source: string;
  url: string;
  est_minutes: number;
  placement: "optional" | "required";
  reviewed_on: string;
  fit_en: string;
  fit_zh: string;
  note_en: string;
  note_zh: string;
};

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
  // Optional concrete ability earned by the end of the lesson.
  outcome_en?: string;
  outcome_zh?: string;
  takeaway_move_en: string;
  takeaway_move_zh: string;
  resources?: LessonResource[];
  review_tags?: string[];
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

export type CourseSource = {
  name: string;
  url: string;
  focus_en: string;
  focus_zh: string;
  reviewed_on: string;
  fit_en: string;
  fit_zh: string;
};

export type CourseMap = {
  course_title_en: string;
  course_title_zh: string;
  course_promise_en: string;
  course_promise_zh: string;
  course_sources?: CourseSource[];
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
  capability_en?: string;
  capability_zh?: string;
  refusal_en?: string;
  refusal_zh?: string;
  capability_moves_en?: string[];
  capability_moves_zh?: string[];
  customization_points?: Array<{
    id: string;
    applies_to: string[];
    default_profile: string;
    rewrite_when: string;
  }>;
};

export const modules: Module[] = [m00 as Module, m01 as Module].sort(
  (a, b) => a.stage - b.stage || a.order - b.order
);
export const lessons: Lesson[] = [
  m00l01 as Lesson,
  m00l02 as Lesson,
  m00l03 as Lesson,
  m01l01 as Lesson,
  m01l02 as Lesson,
  m01l03 as Lesson,
  m01l04 as Lesson,
  m01l05 as Lesson,
  m01l06 as Lesson,
  m01l07 as Lesson,
  m01l08 as Lesson,
  m01l09 as Lesson,
].sort((a, b) => a.module_id.localeCompare(b.module_id) || a.order - b.order);

export function getLesson(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}

export function getModule(id: string): Module | undefined {
  return modules.find((m) => m.id === id);
}

// A lesson is complete when every one of its exercises has a correct attempt.
export function nextLesson(correctExerciseIds: Set<string>): Lesson | undefined {
  const hasPostOrientationProgress = lessons.some(
    (lesson) =>
      lesson.module_id !== ORIENTATION_MODULE_ID &&
      lesson.exercises.some((exercise) => correctExerciseIds.has(exercise.id))
  );

  return lessons.find((lesson) => {
    if (hasPostOrientationProgress && lesson.module_id === ORIENTATION_MODULE_ID) {
      return false;
    }
    return !lesson.exercises.every((exercise) => correctExerciseIds.has(exercise.id));
  });
}

export function hasProgressAfterOrientation(correctExerciseIds: Set<string>) {
  return lessons.some(
    (lesson) =>
      lesson.module_id !== ORIENTATION_MODULE_ID &&
      lesson.exercises.some((exercise) => correctExerciseIds.has(exercise.id))
  );
}
