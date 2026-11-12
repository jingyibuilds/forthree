import { assertAssistantAllowed, assertLocalRequest } from "@/lib/study/service";
import { StudyError } from "@/lib/study/types";

// The provider rewrite is HANDOVER task 8 and is not built. This stub still
// obeys both locks (`assistantRule`) and never writes a grade or the board.
export async function POST(request: Request) {
  try {
    assertLocalRequest(request);
    await assertAssistantAllowed(await request.json().catch(() => null));
  } catch (error) {
    if (error instanceof StudyError) return Response.json({error: error.code, message: error.message}, {status: error.status});
    return Response.json({error: "store_error", message: "Your study record could not be read."}, {status: 500});
  }
  return Response.json({
    text: "Ask is not switched on yet, so it cannot answer. Nothing else in the session is affected.",
    degraded: true,
    reason: "not_configured",
  }, {headers: {"Cache-Control": "no-store"}});
}
