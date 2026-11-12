import { notFound } from "next/navigation";
import SessionCard from "@/components/session-card";
import { findSession } from "@/lib/study/content";

export const dynamic = "force-dynamic";

// Any written session, opened from the map. A number that is not a written
// session is a 404, not a damaged record.
export default async function OpenSession({params}: {params: Promise<{n: string}>}) {
  const raw = (await params).n;
  const n = /^[1-9]\d?$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isInteger(n) || !(await findSession(n).catch(() => null))) notFound();
  return <SessionCard viewing={n} />;
}
