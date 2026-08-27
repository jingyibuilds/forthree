# forthree · 举一反三

A personal, LLM-powered, Duolingo-style web app for learning **practical
CS/engineering literacy** — built by a data scientist who works daily with AI
coding agents and wants to *judge* their output, not just accept it.

举一反三: shown one corner, return with three. The graduation bar is
transfer — read unfamiliar code in any mainstream language and know what it
does; look at a real AI-agent transcript and immediately understand what is
happening and why.

**Status: Phase 0** (scaffold, auth, security rails). See
[docs/DESIGN.md](docs/DESIGN.md) for the full design and
[docs/DECISIONS.md](docs/DECISIONS.md) for every amendment since.

## What makes it interesting

- **Deterministic-first grading** — instant verdicts from pre-authored specs;
  LLM explanations stream in after, never blocking. Bounded cost by design.
- **Three-tier adaptation harness** — static content spine, cheap in-session
  micro-adaptation, checkpoint replanning with schema-constrained plan diffs.
- **Provider-agnostic LLM adapter** — Anthropic/OpenAI switchable via one env
  var; both first-class.
- **Bilingual (中文/English)** everywhere, toggleable; technical terms keep
  their English originals.
- **Built by AI agents, maintained by a non-engineer** — the repo itself is
  Module 11's teaching material, and every decision is committed to
  [docs/DECISIONS.md](docs/DECISIONS.md).

## Stack

Next.js (App Router, TS) · Vercel · Supabase (magic-link auth + Postgres +
RLS) · Pyodide (in-browser Python) · Tailwind. No servers to maintain.

## Self-hosting

1. Clone; run `scripts/setup.sh` (installs the gitleaks pre-commit hook,
   creates `.env.local`).
2. Create a free Supabase project — follow [supabase/README.md](supabase/README.md).
3. Fill `.env.local` (see `.env.example`), `npm install && npm run dev`.
4. Deploy: import the repo in Vercel, set the same env vars.

Security model: public code, private data — see [SECURITY.md](SECURITY.md).

## License

MIT — see [LICENSE](LICENSE). Borrowed content, where any, keeps its own
license in clearly marked directories.
