import { serveStudy } from "@/lib/study/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One session's reading ticks and note: read, and changed one at a time.
export const GET = serveStudy;
export const POST = serveStudy;
