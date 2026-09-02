# Maintenance Runbook

Written for a non-engineer maintainer working through an AI coding agent
(Claude Code / Codex). Each task is a copy-pasteable agent prompt. This file
grows with each build phase.

## Daily reality

Edit → `git push` → Vercel auto-deploys. The entire operational surface is
four dashboards: GitHub, Vercel, Supabase, plus your LLM provider console
(Anthropic or OpenAI).

## Required handoff check

Before final submission of any meaningful code change, obtain approval from the
standing [Architecture Reviewer](./reviewers/architecture-reviewer.md). This is
part of the broader [Review Board](./REVIEW_BOARD.md) and is separate from
learner-facing review. It checks code consistency, extensibility, simplicity,
global/local scope calibration, and security. When multi-agent tooling is
unavailable, stop and say the approval gate cannot be completed rather than
simulating it.

Before an agent says a learner-facing change is done, run a multi-perspective
review loop using the relevant reviewer cards in `docs/reviewers/`. Use
separate agents when the environment allows. If tool limits, budget, or local
environment constraints prevent a separate reviewer, name the skipped reviewer
and the reason in the handoff. A simulated self-review can be included as a
fallback note, but it is not equivalent to independent approval.

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

If the change includes screenshots, diagrams, generated illustrations, or other
visual teaching aids, reviewers must inspect the actual rendered visual (or a
fresh screenshot of it), not just the JSON/prose. Ask them specifically:

- Can a first-time learner tell what each visual part means?
- Does the image answer a concrete confusion, or is it decorative?
- Could any label, prompt marker, cursor, color, or layout create a new false
  belief?
- Is it readable on both laptop and phone?

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
- Check important learner flows separately on phone and desktop. Do not rely on
  one responsive layout inspection when the lesson includes visuals,
  side-by-side comparisons, sticky controls, dialogs, or external links.

## External resource gate

Do not add external course links just because a source is authoritative. Treat
each link as a small curriculum decision.

Before a lesson-level resource ships:

1. Read or watch the exact linked page/video.
2. Record the source in the course resource index: topic, useful pages, license
   note, and where it might fit.
3. Decide whether the link supports this exact lesson at this exact moment in
   the learner's thinking. If it is merely "also good," do not place it.
4. Choose `optional` by default. `required` needs a separate design for return
   path, completion tracking, and what happens if the external page changes.
5. In content JSON, include `reviewed_on`, `fit_en/zh`, `est_minutes`, and a
   very short learner-facing note.
6. Browser-check the flow on desktop and phone: opens in a new tab/window, the
   original lesson tab keeps its step and answers, returning is obvious, and the
   link does not visually dominate the lesson.

Course-level links on the course homepage are provenance: "these traditions
influenced the design." Lesson-level links are interventions inside a learning
flow. The second bar is much higher.

When studying a public course, follow its public source trail as far as it is
useful and lawful: syllabus → readings → instructor notes → code examples →
problem style → linked textbooks or companion repositories. Record those
materials in `docs/COURSE_RESOURCE_INDEX.md`. Learning from structure,
sequencing, density, and interaction design is encouraged; copying prose,
exercises, screenshots, or long excerpts is not.

## Long-context safety

Codex has a user-level `PreCompact` hook in `~/.codex/hooks.json`, but it does
not have Claude Code's `/wrapup` command or the same skill workflow. Treat the
hook as a reminder only.

When a task becomes long, touches many files, or involves curriculum/product
decisions, create a manual wrap before continuing:

1. Latest user request.
2. Current objective.
3. Files changed.
4. Decisions made and rejected paths.
5. Validation already run.
6. Unresolved risks.
7. Next concrete step.

After context compaction, resume from the newest user request and the saved
state summary. Do not restart from scratch or follow an older task that no
longer matches the latest instruction.

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
- Inviting private testers — Phase 1:
  share the site URL and invite code. No per-learner email setup is required.
  Production also needs `AUTH_INVITE_COOKIE_SECRET`, a private server secret
  not shared with testers.
- Applying assistant history migration — Phase 1:
  open Supabase SQL Editor, paste `supabase/migrations/0003_lesson_assistant_history.sql`,
  run it, then ask the agent to verify private assistant history writes.
- Checking Supabase schema after migrations — Phase 1:
  ask the agent to run `npm run check:supabase`. This reads `.env.local`,
  checks the expected Data API tables/columns, and verifies signed-out anon
  access is blocked. It does not insert, update, delete, or print secrets.
- Testing onboarding as a fresh learner — Phase 1:
  use an email or email alias you control. Set it in `TEST_ACCOUNT_EMAILS` in
  `.env.local` and Vercel. In
  production, also set `TEST_ACCOUNT_RESET_ENABLED=true`. Sign in once with
  the invite code, then use `重置测试进度` / `Reset test progress`. This clears
  only learner-owned rows for that test user, redirects to onboarding, and
  does not delete the Supabase auth account. Test accounts can still open the
  course map directly to inspect any lesson after reset.
- Editing a learner profile — Phase 1:
  ask the learner to visit `/onboarding?edit=1`. This updates
  `learner_profiles` and the language cookie without touching attempts or XP.
- Hardening invite-only signup — Phase 1 / P1:
  invite redemption is enforced before onboarding profile creation and before
  learner API writes. Apply `supabase/migrations/0005_server_owned_learner_profiles.sql`
  before inviting testers so authenticated users cannot directly create
  onboarding profiles through the Data API. Before a broader beta, also verify
  hosted Auth signup settings or add an Auth Hook so stray auth users are not
  created outside the app flow.
- Reading the cost dashboard — Phase 3
- Quarterly Module 12 currency review — Phase 4
