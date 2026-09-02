<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# forthree — agent brief

举一反三. A personal, LLM-powered app teaching practical CS/engineering
literacy. You (Claude Code, Codex, or any coding agent) are the build and
maintenance crew; the owner is a data scientist, not a software engineer.

## Read first, in order

1. `docs/DESIGN.md` — full design doc (baseline, v1.1)
2. `docs/DECISIONS.md` — every amendment since; **the design doc is wrong
   wherever this file overrides it**
3. `SECURITY.md` — what never enters this repo

## Ground rules

- **Agent portability:** nothing load-bearing lives in chat history. Every
  decision fork goes into `docs/DECISIONS.md`; every runbook task into
  `docs/MAINTENANCE.md`. Any agent must be able to pick this repo up cold.
- **Phases:** work phase by phase (`docs/DESIGN.md` §7, as amended). Do not
  start phase N+1 before phase N acceptance passes.
- **Commits:** granular, descriptive; history is part of the deliverable.
- **Review board:** before final submission of meaningful code changes, obtain
  approval from the standing Architecture Reviewer
  (`docs/reviewers/architecture-reviewer.md`). For learner-facing work, run the
  relevant reviewers in `docs/REVIEW_BOARD.md`. Do not simulate a separate
  reviewer if a separate agent is available.
- **Secrets:** only in `.env.local` / Vercel dashboard. gitleaks pre-commit +
  CI enforce this; never weaken them.
- **Bilingual:** all learner-facing content has `_en` and `_zh` fields;
  technical terms keep English originals.
- **Language standard:** learner-facing language must be rigorous, vivid,
  concise, and clear. Cut repetition before adding explanation.
- **Determinism first:** grading is deterministic (< 100 ms verdicts); LLM
  output streams after, never blocking. All LLM calls go through `/api/llm`.

## Commands

- `npm run dev` / `npm run build` / `npm run lint`
- `scripts/setup.sh` — one-time clone setup (hooks, .env.local)
- Schema changes: new file in `supabase/migrations/`, applied via dashboard
  SQL editor (see `supabase/README.md`)

## Content standards (read before authoring any lesson)

`content/schema.md` is binding. The two rules most often gotten wrong:

- **中文版交付标准** — the Chinese version targets a CET-4/6 reader who does
  NOT know English technical nouns. Chinese must carry the meaning alone;
  gloss every English term on first appearance. `content/stage-1/module-01/`
  L1–L2 are the reference implementation.
- **语言密度** — every sentence must earn its place: precise enough to be
  trusted, lively enough to be remembered, short enough to keep momentum.
  Do not repeat the same promise in adjacent blocks.
- **Anchor is mandatory** on every `concept` block: an analogy or a contrast
  to something the learner already knows. Break-point notes are conditional,
  not required (see DECISIONS.md).

## Current status (2026-08-27)

**Phase 0: accepted and closed.** Live at https://forthree.vercel.app —
laptop + phone login verified, migration 0001 and 0002 both applied to the
owner's Supabase project, gitleaks pre-commit + CI green, secret scanning on.

**Phase 1: in progress** (Module 1 vertical slice — M1 only, then owner
sign-off before batch-authoring M2–M4).

Done: content schema + validator wired into `npm run build`; M1 lessons 1–2
(bilingual, analogy-anchored, zh revised to the CET-4/6 standard); lesson
player (MCQ + fill-in, deterministic instant grading, back navigation,
in-lesson locale toggle, term-drill badges); `/api/progress` (attempts + XP);
`/learn` path page with course map and stage milestones; 「朱批」 design
system in `src/app/globals.css`; seal logo (`src/components/seal.tsx`).

### Next tasks, in order

1. **M1 lessons 3–5** — terminal basics, pseudocode, first Python run in
   Pyodide. Follow `content/schema.md` exactly; register new files in
   `src/lib/content.ts`; `npm run build` fails if content is invalid.
2. **Pyodide code exercises** — `answer_spec.tests`, lazy-loaded only on
   code lessons, skeleton + tip cards during the ~5–10s WASM cold load.
3. **LLM gateway `/api/llm`** — provider-agnostic adapter (anthropic.ts +
   openai.ts, symmetric, env-switched via `LLM_PROVIDER`), `llm_usage`
   logging, env-configured daily/monthly USD caps, graceful degradation to
   static feedback when capped or unkeyed. **BLOCKED**: the owner has not
   set up an API key yet. Do not scaffold it as if a key exists; the app
   must work fully without one.

### Owner working agreements

- Owner is the first learner, not an engineer. Explain in plain language;
  never hand them a terminal command without saying what it does.
- Owner iterates aggressively and will overrule earlier decisions — check
  `docs/DECISIONS.md` (newest first) before treating DESIGN.md as current.
- Ask before destructive or irreversible actions. Never commit secrets;
  `.env.local` is gitignored and must stay that way.
