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
- **Secrets:** only in `.env.local` / Vercel dashboard. gitleaks pre-commit +
  CI enforce this; never weaken them.
- **Bilingual:** all learner-facing content has `_en` and `_zh` fields;
  technical terms keep English originals.
- **Determinism first:** grading is deterministic (< 100 ms verdicts); LLM
  output streams after, never blocking. All LLM calls go through `/api/llm`.

## Commands

- `npm run dev` / `npm run build` / `npm run lint`
- `scripts/setup.sh` — one-time clone setup (hooks, .env.local)
- Schema changes: new file in `supabase/migrations/`, applied via dashboard
  SQL editor (see `supabase/README.md`)

## Current status

**Phase 0** — scaffold, Supabase schema + RLS, magic-link auth with invite
gate, gitleaks rails, docs. Next up: content-source scouting results →
Phase 1 (Module 1 vertical slice only — see DECISIONS.md).
