import "server-only";
import { findSession, Located } from "./content";
import { appendJsonl, readJson, readJsonl, writeJson } from "./store";
import { AttemptRecord, StudyError } from "./types";

// The teacher (DECISIONS: the gate checks she did the work; a teacher explains
// what she found; REBUILD.md R3/R4). It never decides a pass, never moves a
// skill and never blocks a step: every caller already has its deterministic
// answer on screen, and with no key, over the cap or on any error the screen
// simply shows that answer alone.

// Pinned, never an alias: price and behaviour may not change with no change
// to this repository (HANDOVER §8.4).
export const MODEL = "anthropic/claude-sonnet-5.5";
const PRICE_PER_TOKEN = {input: 0.000002, output: 0.00001};
const FEATURES = {
  // The ceiling covers the model's own reasoning as well as the answer:
  // measured, at 400 the reasoning used every token and the answer was empty.
  annotate: {maxTokens: 1500},
  followup: {maxTokens: 1500},
} as const;
type Feature = keyof typeof FEATURES;

const LEDGER = "llm_usage.jsonl";
const notePath = (part: string, attempt: number) => `llm_notes/${part}-${attempt}.json`;

type Reply = {text: string | null; degraded?: boolean; reason?: string};

async function spentSince(since: Date) {
  const rows = await readJsonl(LEDGER);
  return rows.filter(row => Date.parse(String(row.ts)) >= since.getTime())
    .reduce((sum, row) => sum + (Number(row.cost_usd) || 0), 0);
}

async function overCap() {
  const now = new Date();
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  const dailyCap = Number(process.env.LLM_DAILY_CAP_USD ?? 1);
  const monthlyCap = Number(process.env.LLM_MONTHLY_CAP_USD ?? 25);
  return (await spentSince(day)) >= dailyCap || (await spentSince(month)) >= monthlyCap;
}

/** One call, its cost written whatever happens; null text on any failure. */
async function complete(feature: Feature, system: string, user: string): Promise<Reply> {
  const fake = process.env.FORTHREE_LLM_FAKE === "1";
  const key = process.env.OPENROUTER_API_KEY;
  // The public web trial never calls a provider, and this is why it cannot:
  // the daily and monthly caps are computed from `llm_usage.jsonl`, which in
  // web mode is part of the record the *caller* sent. A visitor posting an
  // empty record would see $0 spent on every call, so the cap could never
  // trip and /api/llm would be an open, unmetered door. Leaving the key unset
  // on the deployment is a promise; this is the property (PUBLISH.md §6).
  // The day this line is removed, check the Ask lock too: on the trial the
  // four screens outside the runner draw the bubble `live` unconditionally
  // (there is no record on the server to read `check_open` from), so the
  // no-help quiet is enforced only inside the runner. Harmless while nothing
  // is called; a real leak the moment something is.
  if (process.env.FORTHREE_MODE === "web") return {text: null, degraded: true, reason: "not_configured"};
  if (!fake && !key) return {text: null, degraded: true, reason: "not_configured"};
  if (await overCap()) return {text: null, degraded: true, reason: "over_cap"};
  const maxTokens = FEATURES[feature].maxTokens;
  // Written when the call ends, and on failure at the most it could have
  // cost: a missing usage figure is never logged as zero (HANDOVER §8.4).
  const worst = (system.length + user.length) / 4 * PRICE_PER_TOKEN.input + maxTokens * PRICE_PER_TOKEN.output;
  const log = (cost: number, ok: boolean, tokens?: {prompt_tokens?: number; completion_tokens?: number}) =>
    appendJsonl(LEDGER, {ts: new Date().toISOString(), feature, model: fake ? "fake" : MODEL, cost_usd: cost, ok,
      tokens_in: tokens?.prompt_tokens ?? null, tokens_out: tokens?.completion_tokens ?? null});
  if (fake) {
    await log(0.001, true, {prompt_tokens: 1, completion_tokens: 1});
    return {text: `(test) ${feature}: ${user.split("\n")[0].slice(0, 80)}`};
  }
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {Authorization: `Bearer ${key}`, "Content-Type": "application/json"},
      body: JSON.stringify({
        // This model will not run without reasoning; low effort, and kept out
        // of the reply (measured 2026-11-11).
        model: MODEL, max_tokens: maxTokens, usage: {include: true}, reasoning: {effort: "low", exclude: true},
        messages: [{role: "system", content: system}, {role: "user", content: user}],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const data = await response.json() as {choices?: {message?: {content?: string}}[]; usage?: {cost?: number; prompt_tokens?: number; completion_tokens?: number}};
    const text = data.choices?.[0]?.message?.content?.trim() || null;
    const cost = typeof data.usage?.cost === "number" ? data.usage.cost
      : data.usage ? (data.usage.prompt_tokens ?? 0) * PRICE_PER_TOKEN.input + (data.usage.completion_tokens ?? 0) * PRICE_PER_TOKEN.output
      : worst;
    await log(cost, response.ok && !!text, data.usage);
    return response.ok && text ? {text} : {text: null, degraded: true, reason: "provider_error"};
  } catch {
    await log(worst, false);
    return {text: null, degraded: true, reason: "provider_error"};
  }
}

const RULES = (constructs: string[]) => `You teach one learner: a data scientist, fluent in SQL, new to Python and the terminal. Write plain English, short sentences, no headings. Her machine, folder names and Python version may differ from any example; that is normal and never a fault. Use only these Python words when you name code: ${constructs.join(", ") || "none yet"}, plus whatever is in her own paste. Never give a score, a pass or a fail.`;

async function taughtSoFar(session: number) {
  const words: string[] = [];
  for (let n = 1; n <= session; n += 1) words.push(...((await findSession(n))?.session.constructs ?? []));
  return [...new Set(words)];
}

const plain = (html: string | undefined) => String(html ?? "").replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

// Her whole paste, up to a size no session needs; past it, the start and
// the end, and the model is told what was left out. A 4,000-character cut
// once hid the last third of session 3's paste and the teacher contradicted
// the page (rebuild walkthrough, B3).
function pasted(raw: string) {
  const limit = 20000;
  if (raw.length <= limit) return raw;
  return `${raw.slice(0, 12000)}\n[… ${raw.length - 20000} characters of her paste left out here …]\n${raw.slice(-8000)}`;
}

/** What her own run shows, once it is accepted. Written once per attempt. */
export async function annotate(located: Located, record: AttemptRecord): Promise<Reply> {
  if (!record.passed_at) throw new StudyError(409, "receipt_not_accepted");
  // An attempt graded against checks this part no longer has was made on an
  // earlier version of it: its paste answers other tasks, so no note.
  const current = new Set((located.part.acceptance_checks ?? []).map(check => check.id));
  if (!(record.checks ?? []).every(check => current.has(check.id))) return {text: null, degraded: true, reason: "older_version"};
  const cached = await readJson<{version: 1; text: string}>(notePath(located.part.id, record.attempt));
  if (cached) return {text: cached.text};
  const {part, session} = located;
  const predict = part.predict;
  const picked = predict?.type === "choice" && record.prediction?.choice != null ? predict.options?.[record.prediction.choice] : String(record.prediction?.value ?? "");
  const answer = predict?.type === "choice" ? predict.options?.[predict.correct] : String(predict?.correct ?? "");
  const system = `${RULES(await taughtSoFar(session.session))} You are shown one part of a lesson after her run was accepted, and what the page already says to her. In at most 120 words, say what is particular to her own run: point at the specific lines of her paste that answer the tasks, and what they mean for the goal. If her paste shows a mistake she later fixed, name it in one sentence: that is where she learned something. If she wrote sentences of her own, say plainly whether each does what its task asks. Only if something is actually wrong or will cause trouble later, say so and give the one command that fixes it, with what it does. Never repeat what the page already says. Never ask her a question: she cannot reply.`;
  const user = [
    `Goal: ${part.goal}`,
    ...(part.tasks ?? []).map((task, index) => `Task ${index + 1}: ${plain(task.brief)}`),
    predict ? `Her guess before the tasks: ${plain(predict.ask)} She picked: ${plain(picked)}. The answer: ${plain(answer)}.` : "",
    `What the page already says to her: ${plain(predict?.because?.[record.prediction?.choice ?? -1] ?? "")} ${plain(part.compare?.note)} ${plain(part.compare?.after)}`,
    `What she pasted from her terminal:\n${pasted(String(record.receipt_raw ?? ""))}`,
  ].filter(Boolean).join("\n");
  const reply = await complete("annotate", system, user);
  if (reply.text) await writeJson(notePath(part.id, record.attempt), {version: 1, text: reply.text} as {version: 1});
  return reply;
}

/** Her question about this part; never the shape of a solution. */
export async function followup(located: Located | null, question: string): Promise<Reply> {
  const asked = question.trim().slice(0, 1000);
  if (!asked) throw new StudyError(422, "invalid_body");
  const session = located?.session.session ?? 1;
  const system = `${RULES(await taughtSoFar(session))} She is working through a lesson and asks one question. Answer it in at most 150 words: explain a concept, a command, or what an error message means. Never write the solution to a task in this lesson and never assemble its shape: no loop, condition or function written for her. If the answer is a command she was asked to find, explain what it does instead.`;
  const user = [
    located ? `Lesson goal: ${located.part.goal}` : "",
    ...(located?.part.tasks ?? []).map((task, index) => `Task ${index + 1}: ${plain(task.name)}`),
    `Her question: ${asked}`,
  ].filter(Boolean).join("\n");
  return complete("followup", system, user);
}
