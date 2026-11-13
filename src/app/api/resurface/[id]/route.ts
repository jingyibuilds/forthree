import { serveStudy } from "@/lib/study/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A resurfaced item, answered and graded on the attempt it appeared in.
export const POST = serveStudy;
