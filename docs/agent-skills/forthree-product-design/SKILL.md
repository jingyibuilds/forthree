---
name: forthree-product-design
description: Product and visual design workflow for For Three. Use before designing or changing learner-facing UI, lesson flow, onboarding, course maps, code exercises, AI feedback, prioritization, PRDs, user stories, or roadmap decisions in this repo.
---

# For Three Product Design

Use this skill as a lightweight product/design hook before meaningful work on
For Three. It turns external design and product-management skills into project
specific checks: learner job first, calm density, rigorous bilingual copy,
deterministic grading, and small vertical slices.

## Quick Start

Read the current project truth before making recommendations:

1. `AGENTS.md`
2. `docs/DECISIONS.md` newest entries first
3. `docs/DESIGN.md` only where not overridden
4. The files or content area being changed

Then produce a brief working note with:

```md
## Feature Brief
- Learner job:
- Current friction or risk:
- Smallest useful change:
- Appetite:
- Primary action on screen:
- Deterministic evidence of success:
- Reviewers to run:
```

Keep the brief shorter than the implementation. If it grows, the feature is
probably under-shaped.

## Choose The Lens

- For UI, visual hierarchy, mobile ergonomics, page structure, empty/loading
  states, or "make this feel better", read `references/visual-quality.md`.
- For feature shaping, prioritization, roadmap, PRD, user stories, or owner
  requests that may be too broad, read `references/product-development.md`.
- For LLM feedback, context windows, retrieval, memory, agent workflows, or
  `/api/llm`, read `references/ai-context.md`.

Use installed external skills when deeper guidance is needed:

- `$refactoring-ui` for detailed visual diagnosis and design-token decisions.
- `$problem-framing-canvas` before solutioning messy learner problems.
- `$discovery-interview-prep` to turn owner/friend feedback into interviews.
- `$opportunity-solution-tree` to compare possible interventions.
- `$prioritization-advisor` when work competes for a phase or sprint.
- `$prd-development`, `$user-story`, and `$user-story-splitting` to turn a
  selected change into implementation-ready scope.
- `$context-engineering-advisor` for LLM workflow and context-boundary design.

## For Three Gates

Before implementation, check:

1. Does the learner-facing entry point name a lived incident or job, not a
   syllabus abstraction?
2. Is there exactly one obvious next action per learner state?
3. Does the change fit the current phase and avoid starting phase N+1 early?
4. Is core learning preserved, with skips creating honest debt rather than
   silent deletion?
5. Are Chinese and English both native-quality, concise, and capable of
   standing alone?
6. Are deterministic checks still first, with LLM output supplemental and
   non-blocking?
7. Can the owner understand the result without being handed unexplained
   terminal work?

Before final submission, check:

1. Run the relevant validation command for the touched surface.
2. Run the standing Architecture Reviewer for meaningful code changes when a
   separate agent is available.
3. Run learner-facing reviewers from `docs/REVIEW_BOARD.md` when applicable.
4. Add durable forks to `docs/DECISIONS.md`; add repeatable runbook work to
   `docs/MAINTENANCE.md`.

## Source Notes

This skill adapts ideas from:

- Refactoring UI style system guidance: https://github.com/s0xDk/refactoring-ui-skill
- Product Manager Skills: https://github.com/deanpeters/Product-Manager-Skills
- Shape Up: https://basecamp.com/shapeup
- Continuous Discovery Habits: https://www.producttalk.org
- Baymard mobile UX research: https://baymard.com/blog/mobile-app-ux-trends

The external PM skills installed in `~/.codex/skills` are licensed by their
authors. Keep attribution when copying or adapting substantial text.
