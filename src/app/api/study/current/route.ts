import { serveStudy } from "@/lib/study/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Where Today is, for a screen that needs it without a part.
export const GET = serveStudy;
