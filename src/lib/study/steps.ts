import { Part, Step } from "./types";

// §17: one state machine, four kinds, and only the `attempt` step differs. The
// step *list* differs too, because three kinds skip a step the lab runs:
// `interview` has no prediction and no comparison, `teardown` and `interview`
// skip `record`, and an exposure teardown is a read with nothing to predict
// against (DECISIONS.md 2026-11-09, fork 1).
export function stepsFor(part: Part, hasResurface = false): Step[] {
  const steps: Step[] = [];
  if (part.kind === "lab" || (part.kind === "teardown" && part.scored)) steps.push("predict");
  steps.push("attempt");
  if (part.kind !== "interview" && !(part.kind === "teardown" && !part.scored)) steps.push("compare");
  if (part.kind === "lab" || part.kind === "withdraw") steps.push("record");
  // `resurface` closes a part in which she answered something. An interview is
  // a transcript and an exposure teardown is a guided read with nothing of hers
  // in it, so neither carries one.
  const answers = part.kind === "lab" || part.kind === "withdraw" || (part.kind === "teardown" && part.scored === true);
  if (hasResurface && answers) steps.push("resurface");
  steps.push("done");
  return steps;
}

// The rail prints these, so they are learner-facing (§4.1): her own words, no
// coined noun, and the lab's four come from the demo verbatim.
const LABELS: Record<string, string> = {
  predict: "Guess",
  "lab:attempt": "Write it",
  "teardown:attempt": "Name them",
  "teardown:attempt:read": "Read it",
  "withdraw:attempt": "Answer them",
  "interview:attempt": "Talk it through",
  compare: "Compare",
  "withdraw:compare": "Compare",
  record: "Log the miss",
  resurface: "From before",
};

// The resume line on Today: "Step 2 of 4 — <this>".
const NAMES: Record<string, string> = {
  predict: "the question",
  "lab:attempt": "the tasks",
  "teardown:attempt": "naming the parts",
  "teardown:attempt:read": "the read",
  "withdraw:attempt": "the questions",
  "interview:attempt": "the three questions",
  compare: "the answer",
  record: "the log",
  resurface: "what came back",
};

function key(part: Part, step: Step) {
  if (step !== "attempt") return [`${part.kind}:${step}`, step];
  if (part.kind === "teardown" && !part.scored) return ["teardown:attempt:read"];
  return [`${part.kind}:attempt`];
}

function lookup(table: Record<string, string>, part: Part, step: Step) {
  for (const candidate of key(part, step)) if (table[candidate]) return table[candidate];
  return step;
}

export function stepLabels(part: Part, steps: Step[]) {
  return steps.filter(step => step !== "done").map(step => lookup(LABELS, part, step));
}

export function stepNames(part: Part, steps: Step[]) {
  return steps.filter(step => step !== "done").map(step => lookup(NAMES, part, step));
}

/** The standing line Today shows per kind, in the words §4.1 fixes. */
export const KIND_LABEL: Record<string, string> = {
  lab: "the lab",
  teardown: "take something apart",
  withdraw: "no-help check",
  interview: "interview",
};
