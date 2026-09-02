# Product Development

Use this reference when shaping work, prioritizing, writing PRDs/stories, or
deciding whether an owner request should become code now.

## Product Posture

For Three is not trying to maximize generic engagement. It teaches enough
practical CS and engineering literacy for a non-engineer to work better with AI
coding agents and judge whether technical output is trustworthy.

The owner is the first learner. Treat her feedback as discovery data, product
direction, and usability evidence at once. Do not hide tradeoffs behind
engineering terms.

## Shape Before Building

Use a small Shape Up style pass:

- **Problem:** what learner friction, risk, or information asymmetry are we
  reducing?
- **Appetite:** how much time/scope is this worth right now?
- **Boundary:** what are we explicitly not doing in this pass?
- **Rabbit holes:** what could make this sprawl?
- **Acceptance:** what concrete behavior proves it works?

If appetite is unclear, choose the smallest vertical slice that can be judged
by the owner inside the current phase.

## Discovery Loop

Use continuous discovery at tiny scale:

1. Capture a specific learning incident or owner reaction.
2. Translate it into a learner job: "When X happens, I need to Y, so I can Z."
3. Identify the assumption: content, interaction, motivation, trust, or code.
4. Pick the cheapest evidence: observe owner use, inspect attempts, run a
   friend beta question, or compare screenshots.
5. Update `docs/DECISIONS.md` only when the fork should survive the chat.

Good questions:

- What can the learner now refuse, pause, or challenge?
- What evidence would make us stop building this?
- Is this a capability gain or just nicer packaging?
- Does this help judge AI output, or only explain a term?

## Prioritization

Default order for Phase 1:

1. Current acceptance blocker.
2. M1 vertical slice completeness.
3. Deterministic learning loop: answer, verdict, feedback, progress.
4. Mobile usability for the same flow.
5. LLM enhancement only after the non-LLM flow is good.

Use a lightweight value/effort or ICE decision before heavier scoring. RICE is
usually too data-hungry for the current owner-first phase.

## PRD Lite

Use this instead of a long PRD for most repo tasks:

```md
## PRD Lite
- Problem:
- Learner/user:
- Triggering moment:
- Proposed behavior:
- Non-goals:
- Deterministic rules:
- Bilingual copy surfaces:
- Data/progress impact:
- Risks:
- Acceptance checks:
```

## Story Splitting

Prefer slices that cross the full learning flow over horizontal layers.

Good slices:

- One lesson from content file to player to progress save.
- One code exercise from skeleton to Pyodide tests to feedback state.
- One onboarding question from copy to storage to course-map personalization.

Weak slices:

- Build all schema first with no learner-visible behavior.
- Restyle the entire app before proving the target surface.
- Add an LLM endpoint before static fallback and deterministic grading work.

## Definition Of Done

A meaningful product/design change is done only when:

- It fits the current phase and AGENTS ordering.
- The learner-facing copy has `_en` and `_zh` where required.
- Mobile and desktop layouts are checked.
- Deterministic validations pass, or failures are named.
- The relevant reviewer cards are used when required.
- New durable decisions or maintenance tasks are recorded.

## Installed PM Skills

Use these local skills for deeper work after restarting Codex:

- `$problem-framing-canvas`
- `$discovery-interview-prep`
- `$opportunity-solution-tree`
- `$prioritization-advisor`
- `$prd-development`
- `$user-story`
- `$user-story-splitting`
