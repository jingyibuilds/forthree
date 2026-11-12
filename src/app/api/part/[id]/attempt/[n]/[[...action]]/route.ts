import { assertLocalRequest, getAttempt, getBeyondPrediction, getItem, mutateAttempt } from "@/lib/study/service";
import { StudyError } from "@/lib/study/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {params: Promise<{id: string; n: string; action?: string[]}>};
const headers = {"Cache-Control": "no-store"};

function failure(error: unknown) {
  if (error instanceof StudyError) return Response.json({error: error.code, message: error.message}, {status: error.status, headers});
  console.error("Study request failed", error instanceof Error ? error.message : "Unknown error");
  return Response.json({error: "store_error", message: "Your study record could not be saved or read. No automatic repair was attempted."}, {status: 500, headers});
}

export async function GET(request: Request, context: Context) {
  try {
    assertLocalRequest(request, false);
    const {id, n, action = []} = await context.params;
    if (!/^[1-9]\d*$/.test(n)) throw new StudyError(404, "not_found");
    if (!action.length) return Response.json(await getAttempt(id, Number(n)), {headers});
    if (action.join("/") === "beyond-predict") return Response.json(await getBeyondPrediction(id, Number(n)), {headers});
    if (action.length === 2 && action[0] === "item" && /^\d+$/.test(action[1])) {
      return Response.json(await getItem(id, Number(n), Number(action[1])), {headers});
    }
    throw new StudyError(404, "not_found");
  } catch (error) { return failure(error); }
}

export async function POST(request: Request, context: Context) {
  try {
    assertLocalRequest(request);
    const {id, n, action = []} = await context.params;
    if (!/^[1-9]\d*$/.test(n)) throw new StudyError(404, "not_found");
    let body: unknown;
    try { body = await request.json(); } catch { throw new StudyError(422, "invalid_body"); }
    return Response.json(await mutateAttempt(id, Number(n), action, body), {headers});
  } catch (error) { return failure(error); }
}
