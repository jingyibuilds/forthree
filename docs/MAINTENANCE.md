# Maintenance Runbook

Written for a non-engineer maintainer working through an AI coding agent
(Claude Code / Codex). Each task is a copy-pasteable agent prompt. This file
grows with each build phase.

## Daily reality

Edit → `git push` → Vercel auto-deploys. The entire operational surface is
four dashboards: GitHub, Vercel, Supabase, plus your LLM provider console
(Anthropic or OpenAI).

## Required handoff check

Before an agent says a learner-facing change is done, run a multi-perspective
review loop. Use separate agents when budget allows; otherwise simulate the
roles explicitly and say that it was simulated.

```
Review this learner-facing change from four perspectives:

1. Education / learning science: Does the sequence build durable skill, not
   just fun-to-know awareness? Are retrieval, transfer, and checkpoint tasks
   present?
2. AI-era senior engineer: Does this teach the judgment a human needs when
   working with coding agents? Are old-school syntax details kept proportional?
3. UI/UX designer: Does the interface make the path, current position,
   curiosity, progress, and next action obvious?
4. Strong zero-code learner: As a smart learner with no programming background,
   what feels confusing, passive, thin, or patronizing?

Run at least two passes when the first pass finds material issues:
review -> revise -> re-review. Stop when comments converge to minor wording or
future polish, or when token/time budget is near the limit. If stopping early,
record the remaining risks in the handoff.
```

For course content, also check:

- Micro-lessons may be short, but a module must still feel like skill training:
  enough nodes, enough practice, and a module-level checkpoint.
- Each module needs a concrete capability claim: what can the learner now do?
- Mark profile-dependent examples and "recognize only" terms so future
  personalization can rewrite those parts without rewriting the whole course.

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
- Changing LLM models/providers — Phase 1 (`LLM_PROVIDER=openrouter`, `OPENROUTER_API_KEY`, `LLM_MODEL_*` env vars)
- Reading the cost dashboard — Phase 3
- Quarterly Module 12 currency review — Phase 4
