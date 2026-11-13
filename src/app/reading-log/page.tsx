import AskBubble from "@/components/ask-bubble";
import { checkOpenReason } from "@/components/ask-reason";
import ReadingLog from "@/components/reading-log";
import Shell from "@/components/shell";
import { assistantState } from "@/lib/study/service";
import { WEB } from "@/lib/mode";

export const dynamic = "force-dynamic";

// Her reading log at a glance (owner, 2026-11-13): every session so far, the
// readings she ticked and her note. It is read here and changed on each
// session's own page, so there is one place to change a thing.
export default async function ReadingLogPage() {
  // The log is drawn in the browser, which holds the record on the web trial
  // too; only Ask's state is read here, and there is none to read on the web.
  const ask = WEB ? {reason: "", session: undefined} : await assistantState().catch(() => ({reason: "", session: undefined}));
  return (
    <Shell active="/reading-log" bubble={<AskBubble mode={ask.reason === "check_open" ? "disabled" : "live"} reason={checkOpenReason(ask.session)} />}>
      <h1>Reading log</h1>
      <p className="sub">What you have read, and your note for each session. Change either on the session’s own page.</p>
      <ReadingLog />
    </Shell>
  );
}
