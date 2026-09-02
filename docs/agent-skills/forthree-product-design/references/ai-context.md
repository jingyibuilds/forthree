# AI Context

Use this reference for LLM feedback, agent workflows, context windows, memory,
retrieval, `/api/llm`, and any feature that uses generated text.

## For Three AI Principle

AI should not become the product surface. It should deepen the learning loop:
instant deterministic verdict first, then optional explanation, hint,
reflection, or plan adjustment.

## Context Boundaries

Do not stuff whole project history into LLM calls. For each context item, answer:

- What decision or feedback does this support?
- What fails if this is excluded?
- Is this always-needed context or retrieved-on-demand context?
- Who owns keeping this boundary small?

Persist only stable rules: learner profile, current lesson state, attempt
summary, relevant concept, deterministic verdict, and hard product constraints.
Retrieve or summarize episodic context: old attempts, prior lessons, owner
notes, and source docs.

## Research, Plan, Reset, Implement

For complex AI/product work:

1. Research broadly and tolerate messy context.
2. Compress findings into a short source-of-truth plan.
3. Reset context before implementation when possible.
4. Implement from the plan, not from the research sprawl.

Inside one Codex thread, emulate the reset by writing a dense plan file or
decision note, then rereading only the needed repo truth and the plan.

## LLM Gateway Rules

- All LLM calls go through `/api/llm`.
- No keys or provider calls exist client-side.
- Provider adapters must be symmetric: OpenAI and Anthropic implement the same
  interface.
- Env selects provider and tier models.
- Log usage to `llm_usage`.
- Enforce daily and monthly USD caps.
- App must work fully when unkeyed or capped, degrading to static feedback.
- LLM output streams after deterministic results and never blocks grading.

## Feedback Design

AI feedback should:

- Name the mistaken mental model.
- Connect the concept to the learner's current task or AI-agent judgment.
- Offer one next action.
- Stay short enough to read inside the lesson momentum.
- Avoid pretending certainty where the deterministic verdict does not support
  it.

Avoid:

- Chatbot panels that pull the learner away from the exercise.
- Long generic explanations after every answer.
- Generated curriculum at runtime.
- LLM grading for MCQ, fill-in, ordering, or code tests that can be checked
  deterministically.
