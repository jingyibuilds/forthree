import { serveStudy } from "@/lib/study/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The assistant. Its rules, its two locks and its fallback are in
// @/lib/study/http; this file is the address.
export const POST = serveStudy;
