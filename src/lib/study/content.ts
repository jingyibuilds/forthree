import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { stepLabels, stepNames, stepsFor } from "./steps";
import { AttemptRecord, Block, CurriculumSession, Part, PublicPart, Step, StudyError } from "./types";

// Only server modules may import this loader. Curriculum JSON, including every
// grading key, is read from disk and is never a client import or a page prop.

const AUTHORED_BLOCKS = ["a1.json"];
const root = () => process.cwd();

export async function loadBlocks(): Promise<Block[]> {
  const blocks: Block[] = [];
  for (const file of AUTHORED_BLOCKS) {
    blocks.push(JSON.parse(await fs.readFile(path.join(root(), "curriculum", file), "utf8")) as Block);
  }
  return blocks;
}

export async function loadCurriculum() {
  const [block] = await loadBlocks();
  return block;
}

export interface Located { part: Part; session: CurriculumSession; block: string; bars: Block["bars"] }

export async function findPart(id: string): Promise<Located> {
  if (!/^s\d{2}-[a-z]+-[a-z]$/.test(id)) throw new StudyError(404, "not_found");
  for (const block of await loadBlocks()) {
    for (const session of block.sessions) {
      const part = session.parts.find(candidate => candidate.id === id);
      if (part) return {part, session, block: block.block, bars: block.bars};
    }
  }
  throw new StudyError(404, "not_found");
}

export async function findSession(n: number) {
  for (const block of await loadBlocks()) {
    const session = block.sessions.find(candidate => candidate.session === n);
    if (session) return {session, block: block.block, name: block.name, bars: block.bars};
  }
  return null;
}

export async function lastAuthoredSession() {
  const blocks = await loadBlocks();
  return Math.max(...blocks.flatMap(block => block.sessions.map(session => session.session)));
}

interface AnatomyEntry {
  example: string;
  what_it_is: string;
  parts: {part: string; does: string}[];
  flow?: string;
  tricky?: {what: string; why: string}[];
}

export async function anatomyEntry(example: string): Promise<AnatomyEntry> {
  const file = JSON.parse(await fs.readFile(path.join(root(), "content/anatomy.json"), "utf8")) as {
    kinds: {name: string; sizes: Record<string, AnatomyEntry>}[];
  };
  for (const kind of file.kinds) {
    for (const entry of Object.values(kind.sizes)) if (entry.example === example) return entry;
  }
  throw new StudyError(500, "missing_product", `No entry named ${example} in the pinned anatomy file.`);
}

/** Has this session's lab sealed its prediction yet? */
export async function labSealed(located: Located) {
  const lab = located.session.parts.find(part => part.kind === "lab");
  if (!lab) return true;
  const {readJson} = await import("./store");
  const plan = await readJson<{version: 1; current_attempt: Record<string, number>}>("plan.json");
  // Any attempt, not the current one: starting a new try of the lab is
  // unsealed by construction and must not take the program away again.
  for (let n = plan?.current_attempt?.[lab.id] ?? 0; n >= 1; n -= 1) {
    const record = await readJson<AttemptRecord>(`sessions/${lab.id}-${n}.json`);
    if (record?.prediction?.sealed_at) return true;
  }
  return false;
}

async function targetText(part: Part) {
  if (!part.target) return undefined;
  const file = path.resolve(root(), part.target.path);
  if (!file.startsWith(path.resolve(root()) + path.sep)) throw new StudyError(500, "invalid_target", "An interview target must live in this repository.");
  return fs.readFile(file, "utf8");
}

/** §1.1: the app reads the environment and never writes to it. A lab that
 *  needs the installed Python must not print an activate line for a folder
 *  that does not exist — that was the first command on session 3's screen. */
export async function environmentReady(projectRoot = root()) {
  try { await fs.access(path.join(projectRoot, ".venv/bin/activate")); return true; }
  catch { return false; }
}

export interface EnvironmentRow {
  id: string; label: string; ok: boolean; detail: string;
  command: string | null; explanation: string | null;
}

/**
 * §1.1's check, in full: one row per fact, each failing row carrying the exact
 * command and one sentence saying what that command does. `scripts/doctor.py`
 * is ours, is read-only, and already prints exactly this; nothing of hers is
 * imported or run. It is shown, never enforced — a failing row does not stop
 * a session, because session 1's subject *is* a broken environment.
 */
export async function environmentReport(projectRoot = root()): Promise<{ok: boolean; rows: EnvironmentRow[]} | null> {
  try {
    const {execFile} = await import("node:child_process");
    const {promisify} = await import("node:util");
    // Under Rosetta a translated process sees `uname -m` as x86_64, so the
    // report must be produced by a native interpreter or its first row — the
    // learner's own machine — is wrong. doctor.py is stdlib only, so the
    // system 3.9 can run it when the course environment is not there yet.
    let interpreter = "";
    for (const candidate of [path.join(projectRoot, ".venv/bin/python3"), "/usr/bin/python3"]) {
      try { await fs.access(candidate); interpreter = candidate; break; } catch { /* try the next */ }
    }
    // Rather than measure wrongly: with no interpreter known to be native,
    // say the check could not run.
    if (!interpreter) return null;
    const {stdout} = await promisify(execFile)(interpreter, [path.join(projectRoot, "scripts/doctor.py"), "--json"],
      {timeout: 5000, cwd: projectRoot, maxBuffer: 1 << 20});
    const parsed = JSON.parse(stdout) as {ok: boolean; rows: EnvironmentRow[]};
    if (!Array.isArray(parsed.rows)) return null;
    // Two of doctor.py's rows describe the shell that started the dev server,
    // not her machine and not the terminal she runs the lab in — so following
    // their instruction could never turn them green. The app reports only
    // what it can truthfully own, and points at the doctor for the rest.
    const SHELL_DEPENDENT = new Set(["path", "active", "node"]);
    const rows = parsed.rows.filter(row => !SHELL_DEPENDENT.has(row.id));
    rows.push({
      id: "your-terminal",
      label: "What your own terminal is using",
      // Never `ok`: the app cannot see her shell, and saying otherwise is the
      // claim this row exists to refuse.
      ok: false,
      detail: "This app cannot see it. Run this where you run the lab.",
      command: "python3 '" + path.join(projectRoot, "scripts/doctor.py").replace(/'/g, "'\"'\"'") + "'",
      explanation: "Prints these same rows for the terminal you type in, including which python3 answers there.",
    });
    // `ok` is about what the app can own; the terminal row is always open.
    return {ok: rows.every(row => row.ok || row.id === "your-terminal"), rows};
  } catch {
    // No report is better than a wrong one, and it must never block Today.
    return null;
  }
}

// Commands are plain text for React's escaped <code> children, never HTML.
// Single quotes also protect spaces, $, backticks and quotes in checkout paths.
export function environmentCommands(projectRoot = root()) {
  const quote = (value: string) => "'" + value.replace(/'/g, "'\"'\"'") + "'";
  return {
    setup_command: "bash " + quote(path.join(projectRoot, "scripts/setup-python.sh")),
    activate_command: "source " + quote(path.join(projectRoot, ".venv/bin/activate")),
  };
}

function teardownFields(part: Part): ("parts" | "flow" | "tricky")[] {
  // All ten `simple` entries omit `flow` and `tricky` entirely (CURRICULUM §10
  // rule 1), so a three-field screen there would render two empty boxes.
  return part.size === "simple" ? ["parts"] : ["parts", "flow", "tricky"];
}

/** Everything the client may hold before this attempt's gate opens (§17.1). */
export async function publicPart(located: Located, record: AttemptRecord | null, hasResurface = false): Promise<PublicPart> {
  const {part, session, block} = located;
  const steps = stepsFor(part, hasResurface);
  const safe: PublicPart = {
    id: part.id,
    kind: part.kind,
    session: session.session,
    block,
    ai_allowed: part.ai_allowed,
    steps,
    step_labels: stepLabels(part, steps),
    step_names: stepNames(part, steps),
    why: part.why,
    setup: part.setup,
    before_you_start: part.before_you_start,
    reading: part.reading,
    tasks: part.tasks?.map(task => ({name: task.name, brief: task.brief, guess: task.guess === true})),
    rules: part.rules,
    reference_card: [],
    receipt_prompt: part.receipt_prompt,
    // `measured` names the machine and its architecture, which for session 1
    // is the prediction's own answer. It belongs to the gated half.
    provenance: part.provenance && {level: part.provenance.level, courses: part.provenance.courses},
    product: part.product ?? part.anatomy_example,
    size: part.size,
    scored: part.scored,
    needs_environment: part.needs_environment,
  };
  if (part.predict) {
    const {correct, ...rest} = part.predict;
    void correct;
    safe.predict = rest;
  }
  if (part.kind === "interview") {
    safe.brief = part.brief;
    safe.questions = part.questions;
    // Only once her own three answers are in — each long enough to be an
    // answer — and only once the program is open to her: these lines describe
    // the program, so they may not arrive before it does.
    const answered = ["q1", "q2", "q3"].every(key => String(record?.answers?.[key] ?? "").trim().length >= 20);
    safe.target_kind = part.target?.kind;
    // The program is someone else's code, and in session 2 it contains the
    // lab's prediction answer verbatim. Questions 1 and 2 are answered before
    // reading it anyway, so it waits for that lab's seal.
    // Latches on any sealed attempt of the lab, so running the lab again never
    // takes the program back. There is no exemption for a finished interview:
    // one could be finished with the program still locked, and finishing it
    // then opened the program — the lab's answer — with the guess still open.
    // An interview cannot be finished while its program is locked (service.ts).
    safe.target_locked = !(await labSealed(located));
    if (!safe.target_locked) safe.target_text = await targetText(part);
    if (answered && !safe.target_locked) safe.looks_for = part.looks_for;
  }
  if (part.kind === "teardown") {
    safe.teardown_fields = teardownFields(part);
    // An exposure teardown is a guided read: there is no prediction to gate,
    // so the source is the content rather than the reveal (fork 1).
    if (!part.scored && part.anatomy_example) safe.teardown_reveal = await anatomyEntry(part.anatomy_example);
  }
  if (part.kind === "withdraw") safe.item_count = record?.drawn?.length ?? 3;
  return safe;
}

/** The gated half: explanation, measured truth, checks, card, labels, gloss. */
export async function gatedPart(located: Located, record: AttemptRecord, hasResurface = false): Promise<PublicPart> {
  const {part} = located;
  if (!isSealed(part, record)) throw new StudyError(409, "not_sealed");
  const safe = await publicPart(located, record, hasResurface);
  const tasks = part.tasks?.map((task, index) => ({
    ...safe.tasks![index],
    ...(task.guess !== true || record.task_predictions[index]?.will_pass !== undefined ? {passes_when: task.passes_when} : {}),
  }));
  const open: PublicPart = {
    ...safe,
    tasks,
    reference_card: part.reference_card ?? [],
    receipt_hint: part.receipt_hint,
    // A second gate on the measured truth. `compare` carries the literals a
    // lab's own acceptance checks need — session 1's `mine` pane is a complete
    // passing receipt — and §9 already forbids that in `receipt_hint`. The
    // runner only draws `compare` at the `compare` step, which a lab cannot
    // reach before `passed_at`, so this costs nothing and closes the leak.
    compare: part.kind === "lab" && !record.passed_at ? undefined : part.compare,
    labels: part.labels,
    // Every anchor states its own part's prediction answer, which is what
    // `sealed_at` protects — and `sealed_at` is this function's own gate. A
    // later gate was tried and withdrawn: it left the `attempt` step with no
    // explanation channel at all while `/api/llm` is a stub, which is the
    // half-hour she is most likely to be stuck in.
    concepts: part.concepts,
    provenance: part.provenance,
  };
  if (part.kind === "teardown" && part.scored && part.anatomy_example) {
    open.teardown_reveal = await anatomyEntry(part.anatomy_example);
  }
  if (part.id === "s01-lab-a" || part.needs_environment) {
    Object.assign(open, environmentCommands());
    open.environment_ready = await environmentReady();
  }
  return open;
}

/** §17.1: what "sealed" means is per kind, and a withdraw has no prediction. */
export function isSealed(part: Part, record: AttemptRecord) {
  if (part.kind === "withdraw") {
    const drawn = record.drawn ?? [];
    return drawn.length > 0 && drawn.every(id => record.items?.some(item => item.item_id === id));
  }
  if (part.kind === "interview") return true;
  if (part.kind === "teardown" && !part.scored) return true;
  return !!record.prediction?.sealed_at;
}

export function stepIndex(steps: Step[], step: Step) {
  return steps.indexOf(step);
}
