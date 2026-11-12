import { assertLocalRequest, getStudyOverview } from "@/lib/study/service";
import { StudyError } from "@/lib/study/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = {"Cache-Control": "no-store"};

export async function GET(request: Request) {
  try {
    assertLocalRequest(request, false);
    return Response.json(await getStudyOverview(), {headers});
  } catch (error) {
    // The code and its status travel: collapsing 503 and 409 into 500 and
    // putting the message where the code goes left callers unable to tell a
    // busy store from a broken one.
    if (error instanceof StudyError) {
      return Response.json({error: error.code, message: error.message}, {status: error.status, headers});
    }
    console.error("Study overview failed", error instanceof Error ? error.message : "Unknown error");
    return Response.json({error: "store_error", message: "Your study record could not be read."}, {status: 500, headers});
  }
}
