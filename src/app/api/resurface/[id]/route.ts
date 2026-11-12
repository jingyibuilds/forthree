import { assertLocalRequest, postResurface } from "@/lib/study/service";
import { StudyError } from "@/lib/study/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = {"Cache-Control": "no-store"};

export async function POST(request: Request, context: {params: Promise<{id: string}>}) {
  try {
    assertLocalRequest(request);
    const {id} = await context.params;
    let body: unknown;
    try { body = await request.json(); } catch { throw new StudyError(422, "invalid_body"); }
    return Response.json(await postResurface(id, body), {headers});
  } catch (error) {
    if (error instanceof StudyError) return Response.json({error: error.code, message: error.message}, {status: error.status, headers});
    console.error("Resurface request failed", error instanceof Error ? error.message : "Unknown error");
    return Response.json({error: "store_error", message: "Your study record could not be saved or read."}, {status: 500, headers});
  }
}
