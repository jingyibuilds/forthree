import AskBubble from "@/components/ask-bubble";
import { checkOpenReason } from "@/components/ask-reason";
import BoardView from "@/components/board-view";
import BoardWeb from "@/components/board-web";
import RecordError from "@/components/record-error";
import Shell from "@/components/shell";
import { boardData } from "@/lib/study/board";
import { StudyError } from "@/lib/study/types";
import { assistantState } from "@/lib/study/service";
import { WEB } from "@/lib/mode";

export const dynamic = "force-dynamic";

export default async function Board() {
  // On the web trial the record is in the visitor's browser, so the board is
  // drawn there: a server-rendered one would show eight lines of "not
  // started" to someone who had done the work (PUBLISH.md §6).
  if (WEB) {
    return (
      <Shell active="/board" bubble={<AskBubble mode="live" reason={checkOpenReason(undefined)} />}>
        <BoardWeb />
      </Shell>
    );
  }
  let loaded;
  try {
    loaded = await boardData();
  } catch (error) {
    return <RecordError active="/board" message={error instanceof StudyError ? error.message : "Your study record could not be read."} />;
  }
  // These screens hold no prediction open, so the only thing that quiets the
  // assistant here is a no-help check open elsewhere in the session.
  const ask = await assistantState().catch(() => ({reason: "", session: undefined}));
  const quiet = ask.reason === "check_open";

  return (
    <Shell active="/board" bubble={<AskBubble mode={quiet ? "disabled" : "live"} reason={checkOpenReason(ask.session)} />}>
      <BoardView data={loaded.data} />
    </Shell>
  );
}
