// Every sentence Ask shows about itself, in one table (LESSONS L-ASK-01). The
// server decides the state with one rule (`assistantRule` in
// src/lib/study/service.ts); every screen turns that state into words here, so
// two screens cannot give two reasons for the same state.

export type AskState = {open: boolean; reason: string; session?: number};

// Any written session can be opened, so this names the session the check is
// in: "finish it" is no help if she cannot tell where it is.
export const checkOpenReason = (session?: number) =>
  `You have a check open${session ? ` in session ${session}` : ""} that does not allow help. Ask is quiet until you finish it.`;

const SENTENCES: Record<string, string> = {
  not_sealed: "Off until your answer is locked. It would hand you the thing you are about to guess.",
  resurface: "Off while you answer the questions from before.",
  receipt_not_accepted: "Off until what you pasted is accepted.",
  ai_not_allowed: "Ask is off for this part.",
};

/** Why Ask is off, for a state the server reported or a code `/api/llm` returned. */
export const askReason = (state: {reason?: string; session?: number}) =>
  state.reason === "check_open"
    ? checkOpenReason(state.session)
    : SENTENCES[state.reason ?? ""] ?? SENTENCES.ai_not_allowed;

// `/api/llm` is not connected to a model yet (HANDOVER §8, task 8). The panel
// says so before she types, not after. Task 8 replaces both lines.
// Three true sentences, because the second half differs by where she is: with
// this part's words listed below it; inside a part that lists none; and on a
// screen that is not a part at all.
export const ASK_NOT_ON = "Ask is not switched on yet, so it cannot answer questions.";
export const askResting = (inPart: boolean, words: number) =>
  words > 0 ? `${ASK_NOT_ON} The words this part uses are below.`
    : inPart ? ASK_NOT_ON
      : `${ASK_NOT_ON} Inside a part, the words it uses are listed here once your answer is locked.`;
export const ASK_FAILED = "Ask could not answer that one. Nothing else in the session is affected.";
