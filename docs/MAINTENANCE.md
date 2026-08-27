# Maintenance Runbook

Written for a non-engineer maintainer working through an AI coding agent
(Claude Code / Codex). Each task is a copy-pasteable agent prompt. This file
grows with each build phase.

## Daily reality

Edit → `git push` → Vercel auto-deploys. The entire operational surface is
four dashboards: GitHub, Vercel, Supabase, plus your LLM provider console
(Anthropic or OpenAI).

## Phase 0 tasks

### Set up a fresh clone

```
Read AGENTS.md. Run scripts/setup.sh, then fill .env.local with values from
the Supabase dashboard (Settings → API) and npm install && npm run dev.
```

### Rotate a leaked or aging key

```
I need to rotate [which key]. Walk me through: revoking it in the provider
dashboard, generating a new one, updating .env.local and the Vercel env vars,
and redeploying. Do not print the key value anywhere.
```

### Recover from a bad deploy

```
The live site is broken after a deploy. Use the Vercel dashboard's
"Instant Rollback" to the last working deployment, then help me diagnose the
failing commit locally before re-deploying.
```

## Later phases

- Adding a lesson — Phase 1
- Changing LLM models/providers — Phase 1 (`LLM_PROVIDER`, `LLM_MODEL_*` env vars)
- Reading the cost dashboard — Phase 3
- Quarterly Module 12 currency review — Phase 4
