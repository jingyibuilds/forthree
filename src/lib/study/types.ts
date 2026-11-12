// The authored record is DESIGN.md §14.2; the on-disk record is §19.1. Field
// names here match those sections exactly, including the internal ones the UI
// never prints (`sealed`, `borrowed`, `withdraw`) — §4.1 keeps those in code.

export type Step = "predict" | "attempt" | "compare" | "record" | "resurface" | "done";
export type Kind = "lab" | "teardown" | "withdraw" | "interview";
export type BarKey = "judge" | "build";

export interface Reading { title: string; url: string; teaches: string; minutes: number }

export interface Task {
  name: string;
  brief: string;
  passes_when: string;
  minutes: number;
  guess?: boolean;
}

export interface ReferenceRow { label: string; code: string }

export interface Predict {
  type: "choice" | "quantity";
  ask: string;
  options?: string[];
  unit?: string;
  magnitude?: boolean;
  correct: number;
  why_prompt: string;
}

export type Normalise = "trim" | "collapse" | "lower" | "sorted_lines" | "sequence";

// Only the §18 types this slice grades are implemented. The validator refuses
// any other, so an authored check can never fall through to "no check defined".
export type Check =
  | {id: string; type: "paired"; field?: string; pairs: {name: string; cue: string; value: string}[]; expect: Record<string, string>}
  | {id: string; type: "contains_all"; field?: string; need: string[]; case?: boolean}
  | {id: string; type: "contains_any"; field?: string; need: string[]; case?: boolean}
  | {id: string; type: "equal_to"; field?: string; value: string}
  | {id: string; type: "accept_any"; field?: string; accept_sha256: string[]; normalise: Normalise; mode?: "equals" | "contains"};

export interface Compare {
  mine_label: string;
  mine: string;
  theirs_label: string;
  theirs: string;
  note: string;
  table?: string[][];
  after?: string;
}

export interface Concept { term: string; anchor: string; explain: string }

// §18 gives a check its parameters and no place for the words a learner reads
// when it rejects her paste, and §17.3 requires a rejected receipt to say what
// was wrong. Authored per part, keyed by check id; `missing` is keyed by the
// one binding a `paired` check could not find. (DECISIONS.md 2026-11-09.)
export type Verdicts = Record<string, {pass: string; fail: string; partial?: string; missing?: Record<string, string>}>;

export interface Provenance {
  level: "from" | "shaped" | "authored";
  courses: {name: string; url: string; kind: string; checked: string}[];
  measured?: {machine: string; date: string};
}

export interface Part {
  id: string;
  kind: Kind;
  minutes: Partial<Record<"learn" | Step, number>>;
  ai_allowed: boolean;
  why?: string;
  setup?: string;
  /** The line Today prints for this part; a kind's standing name if absent. */
  shows?: string;
  /** This lab runs against the environment session 1 installs, so `attempt`
   *  prints the checkout's own activate command rather than a guessed path. */
  needs_environment?: boolean;
  before_you_start?: string[];
  reading?: Reading[];
  tasks?: Task[];
  reference_card?: ReferenceRow[];
  reference_card_bans?: string[];
  rules?: string[];
  predict?: Predict;
  acceptance_checks?: Check[];
  verdicts?: Verdicts;
  receipt_commands?: string[];
  receipt_fields?: string[];
  receipt_prompt?: string;
  receipt_hint?: string;
  compare?: Compare;
  labels?: string[];
  concepts?: Concept[];
  provenance?: Provenance;
  // withdraw
  bar?: BarKey;
  item_kind?: "recall" | "cold_write";
  // interview
  /** What the code is and where it came from, in one or two plain sentences,
   *  shown above the questions: two of the three are answered before she
   *  opens it, and cannot be if nothing says what "it" is. */
  brief?: string;
  questions?: string[];
  /** One line per question, naming what a good answer gets to. Served only
   *  after she has saved her own answers; it scores nothing and moves no
   *  skill (§4.3). */
  looks_for?: string[];
  target?: {kind: "diff" | "program"; path: string};
  // teardown
  anatomy_example?: string;
  product?: string;
  size?: "simple" | "medium" | "difficult";
  scored?: boolean;
  scorable?: {parts: number[]; tricky: number[]};
  held?: string[];
}

export interface CurriculumSession {
  session: number;
  title: string;
  subtitle?: string;
  double?: boolean;
  covers: number[];
  parts: Part[];
}

export interface Bar { label: string; says: string; borrowed_gate: number; own_gate: number }

export interface Block {
  block: string;
  name: string;
  bars: Record<BarKey, Bar>;
  sessions: CurriculumSession[];
}

/** What the client is allowed to see before the gate, per §17.1. */
export interface PublicPart {
  id: string;
  kind: Kind;
  session: number;
  block: string;
  ai_allowed: boolean;
  steps: Step[];
  step_labels: string[];
  step_names: string[];
  why?: string;
  setup?: string;
  before_you_start?: string[];
  reading?: Reading[];
  tasks?: {name: string; brief: string; guess: boolean; passes_when?: string}[];
  reference_card?: ReferenceRow[];
  rules?: string[];
  predict?: Omit<Predict, "correct">;
  acceptance_checks?: never;
  receipt_prompt?: string;
  receipt_hint?: string;
  compare?: Compare;
  labels?: string[];
  concepts?: Concept[];
  provenance?: Provenance;
  brief?: string;
  questions?: string[];
  looks_for?: string[];
  target_text?: string;
  target_locked?: boolean;
  target_kind?: "diff" | "program";
  product?: string;
  size?: "simple" | "medium" | "difficult";
  scored?: boolean;
  teardown_fields?: ("parts" | "flow" | "tricky")[];
  teardown_reveal?: {parts: {part: string; does: string}[]; flow?: string; tricky?: {what: string; why: string}[]; what_it_is: string};
  item_count?: number;
  needs_environment?: boolean;
  environment_ready?: boolean;
  setup_command?: string;
  activate_command?: string;
}

export interface CheckResult { id: string; pass: boolean; message: string; value?: number | null }

export interface DrawnItemAnswer { item_id: string; answer: string; pass: boolean; sealed_at: string }

export interface AttemptRecord {
  version: 1;
  part: string;
  session: number;
  block: string;
  attempt: number;
  started_at: string;
  step_entered_at: string;
  step: Step;
  max_step: number;
  prediction?: {choice: number | null; value: number | null; why: string; sealed_at: string};
  predict_result?: {correct: boolean; graded_at: string};
  drawn?: string[];
  items?: DrawnItemAnswer[];
  answers?: Record<string, unknown>;
  task_predictions: {will_pass?: boolean; did_pass?: boolean}[];
  receipt_raw?: string;
  checks?: CheckResult[];
  variant_result?: {choice: number; pass: boolean; at: string};
  passed_at?: string;
  mental_model?: string;
  /** The ids `From before` showed in this attempt. Written when the step is
   *  first served, never recomputed: a sibling part reads it to avoid asking
   *  the same thing twice in one session. */
  resurfaced?: string[];
  /** The same list with its pool and what she answered. Ids only — the words
   *  are resolved from the bank or the part on read. */
  came_back?: CameBack[];
  finished_at: string | null;
}

export interface CameBack {
  id: string;
  pool: "A" | "B";
  kind: "recall" | "choice";
  block: string;
  part?: string;
  note?: string;
  /** Why a lab's question is back: she guessed wrong, or a paste was sent back. */
  cause?: "missed" | "paste";
  answered?: {pass: boolean; text?: string; choice?: number; at: string};
}

export interface Plan {
  version: 1;
  current_session: number;
  current_attempt: Record<string, number>;
  next_checkpoint: number;
  pull_checkpoint_forward: boolean;
}

export type BarState = "none" | "borrowed" | "own";
export interface BoardFile {
  version: 1;
  [block: string]: 1 | Record<string, {state: BarState; at_session: number | null}>;
}

export interface RecallFile {
  version: 1;
  items: Record<string, {block: string; kind: string; times_seen: number; last_seen_session: number; last_result: "pass" | "fail"}>;
}

export class StudyError extends Error {
  constructor(public status: number, public code: string, message?: string) {
    super(message ?? code);
  }
}
