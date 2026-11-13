import { serveStudy } from "@/lib/study/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The eight lines of the board, prepared. The rules are in @/lib/study/http.
export const GET = serveStudy;
