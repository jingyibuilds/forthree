import { createHash } from "node:crypto";
import { Check, CheckResult, Normalise, Part, Verdicts } from "./types";

// Every check in DESIGN.md §18 is a pure function of stored fields, and no
// model is involved in any of them. Only the types this slice grades are here;
// the validator refuses an authored type that is not in this table, so a check
// can never fall through to "no check defined".

export function normalise(raw: string, how: Normalise): string {
  const trimmed = raw.trim();
  if (how === "trim") return trimmed;
  const collapsed = trimmed.replace(/\s+/g, " ");
  if (how === "collapse") return collapsed;
  if (how === "lower") return collapsed.toLowerCase();
  const lines = trimmed.split(/\r?\n/).map(line => line.trim().replace(/\s+/g, " ")).filter(Boolean);
  return (how === "sorted_lines" ? [...lines].sort() : lines).join("\n");
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function field(fields: Record<string, string>, name = "stdout") {
  return fields[name] ?? "";
}

function pairedBindings(raw: string, pairs: {name: string; cue: string; value: string}[]) {
  const bound: Record<string, string> = {};
  let armed: (typeof pairs)[number] | undefined;
  for (const original of raw.split(/\r?\n/)) {
    const line = original.trim();
    if (!line) continue;
    const cue = pairs.find(pair => new RegExp(pair.cue).test(line));
    if (cue) { armed = cue; continue; }
    if (armed) {
      const match = line.match(new RegExp(armed.value));
      if (match) { bound[armed.name] = match[1] ?? match[0]; armed = undefined; }
    }
  }
  return bound;
}

/** The one place an answer is matched against an accept list. Three callers
 *  used to decide `contains` differently, so an item authored that way would
 *  pass its check and fail its own re-ask. */
export function matchesAccept(
  value: string,
  accept: {accept_sha256: string[]; normalise: Normalise; mode?: "equals" | "contains"},
) {
  // The product's own placeholders and reference cards model a command with
  // its prompt — `$ python3 -m venv .venv` — so an answer typed that way is
  // the right answer. The prompt is stripped before matching; without this the
  // same command was marked wrong directly above the line that explains it.
  const normalised = normalise(value.replace(/^\s*[$%]\s+/, ""), accept.normalise);
  if (accept.mode !== "contains") return accept.accept_sha256.includes(sha256(normalised));
  // A multi-word accept phrase hashes as a phrase, so matching single tokens
  // alone would fail it silently. Try every contiguous run of words.
  const words = normalised.split(/\s+/);
  for (let start = 0; start < words.length; start += 1) {
    for (let end = start + 1; end <= words.length; end += 1) {
      if (accept.accept_sha256.includes(sha256(words.slice(start, end).join(" ")))) return true;
    }
  }
  return false;
}

export function gradeCheck(check: Check, fields: Record<string, string>, verdicts: Verdicts = {}): CheckResult {
  const words = verdicts[check.id];
  const say = (pass: boolean, fallback: string, missing?: string) => ({
    id: check.id,
    pass,
    message: pass
      ? words?.pass ?? fallback
      : (missing !== undefined && words?.missing?.[missing]) || (missing !== undefined && words?.partial) || words?.fail || fallback,
  });

  if (check.type === "paired") {
    const bound = pairedBindings(field(fields, check.field), check.pairs);
    const absent = Object.keys(check.expect).filter(name => bound[name] === undefined);
    if (absent.length) {
      // Three outcomes, not two: nothing found, one side found, or both found
      // under each other's cues. Only the last is a wrong answer.
      return say(false, `Paste each command and the line that came back under it. Missing: ${absent.join(", ")}.`,
        absent.length === 1 ? absent[0] : "");
    }
    const pass = Object.entries(check.expect).every(([name, pattern]) => new RegExp(pattern).test(bound[name]));
    // One side wrong, and the content says what that means: say that one,
    // not "at least one of the two" (walkthrough 2).
    const wrong = Object.entries(check.expect).filter(([name, pattern]) => !new RegExp(pattern).test(bound[name])).map(([name]) => name);
    if (!pass && wrong.length === 1 && words?.wrong?.[wrong[0]]) return {id: check.id, pass: false, message: words.wrong[wrong[0]]};
    return say(pass, pass
      ? "Each answer is under the command that produced it."
      : "Those answers are under the wrong commands. Look again at which command asked what.");
  }

  if (check.type === "contains_all" || check.type === "contains_any") {
    const sensitive = check.case === true;
    const haystack = sensitive ? field(fields, check.field) : field(fields, check.field).toLowerCase();
    const found = check.need.filter(need => haystack.includes(sensitive ? need : need.toLowerCase()));
    const pass = check.type === "contains_all" ? found.length === check.need.length : found.length > 0;
    const absent = check.need.filter(need => !found.includes(need));
    // One thing missing, and the content has a sentence for it: say that one,
    // never a message that names something she did paste (walkthrough, N7).
    if (!pass && check.type === "contains_all" && absent.length === 1 && words?.missing?.[absent[0]]) {
      return {id: check.id, pass: false, message: words.missing[absent[0]]};
    }
    return say(pass, pass
      ? "That is what these produce."
      : check.type === "contains_all"
        ? `Not all of it is there yet — ${absent.length} of ${check.need.length} still missing.`
        : "I cannot see the shape this asks for.");
  }

  if (check.type === "equal_to") {
    const pass = normalise(field(fields, check.field), "collapse") === normalise(check.value, "collapse");
    return say(pass, pass ? "That is the value." : "That is not what this one prints. Run it again and paste exactly what came back.");
  }

  if (check.type === "accept_any") {
    const pass = matchesAccept(field(fields, check.field), check);
    return say(pass, pass ? "That is it." : "Not that one.");
  }

  // Unreachable: the validator rejects any type this switch does not carry.
  return {id: (check as Check).id, pass: false, message: "This check cannot be graded here."};
}

export function gradeAll(part: Part, fields: Record<string, string>): CheckResult[] {
  return (part.acceptance_checks ?? []).map(check => gradeCheck(check, fields, part.verdicts ?? {}));
}
