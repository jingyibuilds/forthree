import { serveStudy } from "@/lib/study/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The attempt, its gated extras, one drawn item, and every mutation. The
// rules are in @/lib/study/http; this file is the address.
export const GET = serveStudy;
export const POST = serveStudy;
