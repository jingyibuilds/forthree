import Intro from "@/components/intro";
import SessionCard from "@/components/session-card";
import { WEB } from "@/lib/mode";

export const dynamic = "force-dynamic";

// Her copy opens on the session Today is on. The public web trial opens on a
// page that says what the course is first (PUBLISH.md §6).
export default function Today() {
  return WEB ? <Intro /> : <SessionCard />;
}
