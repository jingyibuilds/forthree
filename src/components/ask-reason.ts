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

// What Ask is for, before she types (L-ASK-03), now that it answers (REBUILD.md
// R4). The second half differs by where she is: with this part's words listed
// below; inside a part that lists none; on a screen that is not a part.
export const ASK_ON = "Ask about a word, a command or an error message. It explains; it will not write the answer for you.";
export const askResting = (inPart: boolean, words: number) =>
  words > 0 ? `${ASK_ON} The words this part uses are below.`
    : inPart ? ASK_ON
      : `${ASK_ON} Inside a part, it knows which part you are on.`;
// When it cannot answer, the reason in her words, never a code (§4.1).
export const ASK_DEGRADED: Record<string, string> = {
  not_configured: "Ask needs the course’s AI key, and none is set on this machine. Everything else in the session works without it.",
  over_cap: "Ask has used today’s budget, and answers again tomorrow. Everything else in the session works without it.",
};
export const ASK_FAILED = "Ask could not answer that one. Nothing else in the session is affected.";
