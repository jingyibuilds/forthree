import { dispatch, failure, readBody } from "@/lib/study/http";
import { enterRecord, recordFrom, recordTo } from "@/lib/study/store-memory";
import { assertLocalRequest } from "@/lib/study/service";
import { StudyError } from "@/lib/study/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The public web trial's one door (PUBLISH.md §6). The visitor's record comes
// in with the call, the same table answers it, and the new record goes back in
// the response for the browser to keep. The server writes nothing and
// remembers nothing between requests.
//
// It does not exist in the local app: there the record is on her disk and the
// addresses under /api/part and /api/study answer directly.
const headers = {"Cache-Control": "no-store"};

// Nothing caps how many attempts a visitor makes, and each one can carry up
// to 100 KB of pasted terminal output, so the record grows without a bound.
// Two ceilings sit above it and both fail silently: the host rejects a body
// over 4.5 MB before this function runs, and localStorage throws somewhere
// around 5 MB. Either one brick the trial — every later call fails the same
// way — so the refusal happens here, below both, while there is still a
// server to say what to do about it.
const CEILING = 2_000_000;

export async function POST(request: Request): Promise<Response> {
  if (process.env.FORTHREE_MODE !== "web") return new Response("Not found", {status: 404});
  // Only what was read from this call's own body. A refusal before that point
  // has no record to hand back, and must not hand back an empty one: the
  // browser would write it over everything the visitor had done.
  let record: Record<string, string> | null = null;
  try {
    assertLocalRequest(request, true);
    const body = await readBody(request) as {path?: unknown; method?: unknown; body?: unknown; record?: unknown};
    if (typeof body?.path !== "string" || !body.path.startsWith("/api/")) throw new StudyError(422, "invalid_body");
    const method = body.method === "POST" ? "POST" : "GET";
    const size = JSON.stringify(body.record ?? {}).length;
    if (size > CEILING) {
      throw new StudyError(413, "record_too_large",
        "This browser is holding more of the trial than it can send. Save your record to a file from the first page, then start over — or install the course on your own machine, where there is no limit.");
    }
    const files = recordFrom(body.record);
    record = recordTo(files);
    const data = await enterRecord(files, () => dispatch(method, body.path as string, body.body));
    return Response.json({data, record: recordTo(files)}, {headers});
  } catch (error) {
    // The record goes back untouched when there is one: a refused call never
    // costs a visitor the work they had done.
    const response = failure(error);
    const said = await response.json();
    return Response.json(record === null ? said : {...said, record}, {status: response.status, headers});
  }
}
