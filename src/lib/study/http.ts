import { annotate, assertAssistantAllowed, assertLocalRequest, followup, getAttempt, getBeyondPrediction, getItem, getStudyOverview, mutateAttempt, postResurface } from "./service";
import { getReadingLog, getSessionLog, postSessionLog } from "./reading-log";
import { boardData } from "./board";
import { StudyError } from "./types";

// One table for every call that reads or writes the record, so the local
// routes and the web trial's single endpoint (PUBLISH.md §6) cannot drift
// apart. The routes under src/app/api are addresses; the rules are here.
const headers = {"Cache-Control": "no-store"};

const ATTEMPT = /^\/api\/part\/([^/]+)\/attempt\/(\d+)(?:\/(.*))?$/;
const RESURFACE = /^\/api\/resurface\/([^/]+)$/;
const READING_LOG = /^\/api\/reading-log\/(\d{1,3})$/;

export async function dispatch(method: string, pathname: string, body?: unknown): Promise<unknown> {
  const attempt = ATTEMPT.exec(pathname);
  if (attempt) {
    const [, id, n, rest] = attempt;
    const action = rest ? rest.split("/").filter(Boolean) : [];
    if (!/^[1-9]\d*$/.test(n)) throw new StudyError(404, "not_found");
    if (method === "POST") return mutateAttempt(id, Number(n), action, body);
    if (!action.length) return getAttempt(id, Number(n));
    if (action.join("/") === "beyond-predict") return getBeyondPrediction(id, Number(n));
    if (action.length === 2 && action[0] === "item" && /^\d+$/.test(action[1])) {
      return getItem(id, Number(n), Number(action[1]));
    }
    throw new StudyError(404, "not_found");
  }
  if (pathname === "/api/study/current" && method === "GET") return getStudyOverview();
  if (pathname === "/api/llm" && method === "POST") return assistant(body);
  if (pathname === "/api/board" && method === "GET") return boardData();
  const resurface = RESURFACE.exec(pathname);
  if (resurface && method === "POST") return postResurface(resurface[1], body);
  // Her reading log: ticks and a note per session, and the page of all of them.
  if (pathname === "/api/reading-log" && method === "GET") return getReadingLog();
  const log = READING_LOG.exec(pathname);
  if (log) return method === "POST" ? postSessionLog(Number(log[1]), body) : getSessionLog(Number(log[1]));
  throw new StudyError(404, "not_found");
}

// HANDOVER §8, as rebuilt (REBUILD.md R3/R4): both locks through the one
// assistant rule, the prompt built on the server from her record, and a plain
// answer on any failure. It never writes a grade or the board.
async function assistant(body: unknown) {
  const {feature, located, record, question} = await assertAssistantAllowed(body);
  return feature === "annotate" && located && record ? annotate(located, record)
    : feature === "followup" ? followup(located, question)
    : {text: null, degraded: true, reason: "not_built"};
}

export function failure(error: unknown, what = "Your study record could not be saved or read. No automatic repair was attempted.") {
  // The code and its status travel: collapsing them left callers unable to
  // tell a busy store from a broken one.
  if (error instanceof StudyError) return Response.json({error: error.code, message: error.message}, {status: error.status, headers});
  console.error("Study request failed", error instanceof Error ? error.message : "Unknown error");
  return Response.json({error: "store_error", message: what}, {status: 500, headers});
}

export async function readBody(request: Request): Promise<unknown> {
  try { return await request.json(); }
  catch { throw new StudyError(422, "invalid_body"); }
}

// Every local route is this function. The guard first, the table second.
export async function serveStudy(request: Request): Promise<Response> {
  // On the web trial these addresses have no record to read: the visitor's
  // travels with the call, and /api/web is the only door (PUBLISH.md §6).
  // Answering here would be a 500 on every crawler that found one.
  if (process.env.FORTHREE_MODE === "web") return new Response("Not found", {status: 404});
  try {
    const mutation = request.method === "POST";
    assertLocalRequest(request, mutation);
    const {pathname} = new URL(request.url);
    const body = mutation ? await readBody(request) : undefined;
    return Response.json(await dispatch(request.method, pathname, body), {headers});
  } catch (error) { return failure(error); }
}
