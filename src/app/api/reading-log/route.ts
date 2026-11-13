import { serveStudy } from "@/lib/study/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Every session's reading ticks and note, for the log page.
export const GET = serveStudy;
