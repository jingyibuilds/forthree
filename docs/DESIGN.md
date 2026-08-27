# CodeLingua — Design Doc & Execution Plan

> **Working name:** CodeLingua (placeholder — rename freely).
> **Audience of this document:** A coding agent (Claude Code / Codex) executing the build, and the project owner maintaining it afterward.
> **Status:** v1.1 — approved for build. (v1.1 incorporates a three-persona expert review: AI engineer, learning scientist, UX designer.)

---

## 1. Why This Exists

The owner is a data scientist (strong SQL, minimal Python, no software engineering background) who works daily with AI coding agents. The problem: when delegating technical work to LLMs, they cannot judge whether the output is directionally correct. Textbook courses produce knowledge that evaporates; LeetCode grinding produces skills that never touch real life.

This project is a **personal, LLM-powered, Duolingo-style web app for learning practical CS/engineering literacy** — built first for one user (the owner), architected so it could later serve others.

### Success criteria (the learner, upon graduation, can):
1. **Write** — independently produce a functional ~50–100 line Python script or clean pseudocode for a small real task, with minimal hints and no AI.
2. **Read** — look at unfamiliar code in *any* mainstream language (C, Java, Go, JS…) and correctly guess what it does, the way someone who knows Chinese can partially parse Japanese: structural instinct, not vocabulary memorization.
3. **Speak the taxonomy** — understand terms that appear when working with AI coding agents (RESTful API, database types, deployment, LLM infra concepts…) including *the scenarios where each concept typically shows up*.
4. **Meta-goal (the real graduation bar):** confidently make basic correct/incorrect and directional judgments about what an AI coding agent tells them. Knowledge must be durable and transfer to real work — not textbook amnesia, not question-bank grinding.

### Non-goals
- Not training a professional software engineer.
- Not a commercial product (yet). Multi-user support is future roadmap, but the schema should not preclude it.

---

## 2. Product Decisions (locked)

| Dimension | Decision |
|---|---|
| Primary user | Owner only (single-user MVP; schema is multi-user-ready) |
| Weekly time budget | 2–5 hrs → sessions must be **15–30 min, self-contained** |
| Course shape | Semester-like, **module-based progression (no calendar deadlines)**, finite and predictable, with staged graduation milestones |
| Main language taught | **Python**, with a late-stage multi-language contrast track for "reading instinct" |
| Content language | **Bilingual (中文/English), toggleable**; technical terms always keep English originals |
| Session formats | Multi-modal: Duolingo-style drills (MCQ / fill-in / drag-drop), Socratic LLM chat, in-browser code + run + LLM feedback, short readings + quiz, scenario tasks, curated LeetCode-easy-style problems, embedded public course video clips, occasional paper/doc excerpts + Q&A |
| Gamification | **Full**: XP, levels, achievements, streak, spaced repetition of missed items |
| Adaptation | **Three-tier deterministic harness** (see §5) — personalized feel, bounded cost and behavior |
| Deployment | **GitHub (public repo) + Vercel (hosting + serverless API) + Supabase (auth + Postgres)** |
| Default LLM | **OpenAI**, behind a provider-agnostic adapter; Anthropic as the proven second provider |
| Owner API budget | $10–30/mo hard ceiling; per-learner runtime cost target < $5/mo at near-daily use |
| License | MIT (repo doubles as a portfolio piece: "non-engineer learns CS by building the tool they learn with") |

### Two deliverables
1. **The web app** — live URL, usable from any device (responsive, mobile-first for drills; desktop preferred for code exercises).
2. **The GitHub repo** — clean, documented, public; commit history tells the building story. README must explain the concept, architecture, and how others could self-host with their own keys.

---

## 3. Curriculum Blueprint

Grounded in public curricula — primarily **CS50P** (pure Python intro), **CS50x** (broader CS: algorithms, memory, SQL, web, security), plus MIT 6.100L-style computational thinking. We do **not** copy their content. We: (a) borrow the *sequencing logic*, (b) link/embed their public lecture videos where a clip genuinely teaches better than text (YouTube embeds only — never re-hosted), (c) generate **original** exercises and explanations.

**Structure: 4 stages, ~14 modules, ~5–8 sessions each (15–30 min/session).** At 2–5 hrs/week this is roughly a 5–7 month "semester," but progression is purely module-based — a fast learner finishes sooner.

### Stage 1 — Computational Thinking & Python Foundations (Modules 1–4)
- M1 What is a program? Source → execution; interpreter vs compiler; terminal basics; pseudocode as a first-class skill
- M2 Variables, types, operators, I/O (contrast anchors to SQL the learner already knows: `SELECT` vs assignment, `WHERE` vs `if`)
- M3 Conditionals & loops (`if/elif/else`, `for`, `while`, `break/continue`)
- M4 Functions: arguments, return values, scope; decomposing a problem into functions
- **Stage assessment:** timed, no-hint drill set + write pseudocode for a described task
- 🎓 *Milestone certificate: "Can read and trace basic Python"*

### Stage 2 — Writing Real Small Programs (Modules 5–8)
- M5 Data structures in practice: list, dict, tuple, set — when each shows up in real code
- M6 Errors & exceptions: reading a traceback (critical for judging AI output), try/except
- M7 File I/O + libraries: import, pip, reading CSV/JSON — bridges to the learner's DS work
- M8 Putting it together: 3 guided mini-builds (e.g., expense parser, text-file quiz game, small data cleaner), decreasing hint levels
- **Stage assessment:** independently write a working 50–100 line script from a spec, no AI, limited hints
- 🎓 *Milestone certificate: "Can write small functional programs"* ← success criterion #1 achieved here

### Stage 3 — How Software Systems Work (Modules 9–12) — the taxonomy stage
- M9 The web: client/server, HTTP, request/response, **RESTful API** (hands-on: call a real public API from the in-browser editor)
- M10 Databases & where code meets data: SQL vs NoSQL, ORM concept, migrations, indexes — leveraging existing SQL strength
- M11 The engineering toolchain: Git/GitHub, versioning, environments, deployment, CI concept, env vars & secrets (taught **using this very app's own repo as the living example**)
- M12 LLM-era infrastructure: tokens, context windows, embeddings, RAG, agents/tools/MCP, prompt vs fine-tune — each term taught with "the scenario you'll meet it in when using Claude Code/Codex"
- **Stage assessment:** scenario judgments — shown realistic AI-agent transcripts, learner identifies what's right/wrong/risky
- 🎓 *Milestone certificate: "Can navigate engineering conversations"* ← success criterion #3

### Stage 4 — Reading Instinct Across Languages + Capstone (Modules 13–14)
- M13 Multi-language contrast: the same 5 small programs in Python / JS / C / Go / Java side-by-side. Learn the invariants (variables, loops, functions, calls exist everywhere) and the surface differences (braces, types, semicolons). Drills: "guess what this unfamiliar snippet does."
- M14 **Capstone:** learner writes a real small tool for their actual life/work (owner examples: a Hermin inventory checker, an Obsidian note utility), using AI as reviewer-only. Deliverable committed to a personal repo.
- **Final assessment:** capstone + comprehensive no-hint exam covering all three abilities
- 🎓 *Graduation certificate + auto-generated "evidence portfolio"* (see §4)

**Content sourcing rules for the build agent:** every module spec in `/content` may include `references: []` pointing to specific public lectures (CS50 links, docs pages). Original prose/exercises only; excerpt-based exercises (papers/docs) quote ≤ short-phrase level and link out.

**Video rule (hard requirement):** external video appears **only** as embedded, timestamped micro-clips of **≤ 5 minutes** (YouTube embed with start/end params), immediately followed by 2–3 retrieval questions about the clip (active viewing, never passive). Clips are **never on the critical path** — every lesson is completable without watching, and skipping a clip never blocks progression or costs XP. A lesson may contain at most one clip. Full-length lectures may be linked in an optional "go deeper" footer only. Rationale: passive long-form video is the lowest-retention format and directly conflicts with the 15–30 min session budget.

**Module 12 is a "living module":** LLM-infra terminology dates quickly. Tag its content files with a `review_by` date; `docs/MAINTENANCE.md` includes a quarterly refresh task (a copy-pasteable Claude Code prompt that re-checks each term's currency).

---

## 4. Learning Experience Design

### Session anatomy (15–30 min)
1. **Warm-up (2 min):** 3–5 spaced-repetition items resurfaced from past mistakes
2. **Core (10–20 min):** new content in one of the modal formats defined by the lesson spec
3. **Check (3–5 min):** graded exercise → XP awarded
4. **Reflect (1 min, optional):** one Socratic question from the LLM tying the concept to the learner's real work — this is the "durable memory" mechanism, connecting abstractions to lived context

**Time budget is a build-time constraint, not a suggestion:** every lesson spec declares `est_minutes` per component; the content validator **fails the build** if a session's total exceeds 30 minutes. Assessment cadence: warm-up + check already give every session high-frequency, low-stakes retrieval practice (the learning-science optimum); additionally, each module gets **one checkpoint mini-quiz at its midpoint** (5–8 items, no new content) so weak spots surface before the stage assessment.

### Core vs. elective content, and the "force vs. drop" policy
Learning science distinguishes **productive struggle** (effortful practice — a necessary ingredient, not a defect) from **irrelevance** (a real reason adult learners disengage). The policy:
- Every lesson is tagged **`core`** (load-bearing for the three graduation abilities) or **`elective`** (enrichment).
- **Core content is never silently removed** by adaptation. If the learner signals boredom/irrelevance on core material, the system responds by (a) re-justifying it — one concrete sentence on why this matters for judging AI output or for their stated goals — and (b) switching modality/framing (e.g., from drills to a scenario drawn from the learner's real work). Difficulty may feel effortful; that is by design and the UI says so.
- The learner **may still explicitly skip** core content, which creates a visible **debt marker**: skipped items must be cleared (a short remedial set) before the stage assessment unlocks. Autonomy preserved, consequences honest.
- **Elective content** can be freely skipped or pruned by Tier-2 replanning with no debt.

### Early disengagement detection (don't wait for churn)
The app continuously derives an **engagement score** from deterministic signals: accuracy trend, skip rate, mid-session abandonment, answer-time anomalies (rushing or stalling), streak breaks. When thresholds trip, the app shows a **1-tap pulse check** (too easy / too hard / not interesting / useful — one tap, dismissible, max once per week). Pulse results + engagement score feed Tier-2 replanning as first-class inputs. This is the "capture the signal early and adjust" channel — cheap, deterministic, and respectful of attention.

### Gamification spec
- **XP:** per exercise, scaled by difficulty and hint usage (fewer hints → more XP). No XP for re-doing completed content (prevents grinding).
- **Levels:** XP thresholds on a gentle exponential curve; level titles themed as engineering ranks (e.g., "Terminal Novice" → "Pseudocode Poet" → "API Whisperer" → "Systems Thinker").
- **Streak:** daily flame, with 2 "streak freezes" earned per completed module (forgiveness by design — a missed busy week must not feel like ruin).
- **Achievements (seed ~20):** e.g., First Bug Fixed, Read a Traceback Cold, 7-Day Streak, Wrote 50 Lines Unaided, Polyglot Reader (correctly parsed 3 languages), Capstone Shipped.
- **Spaced repetition:** simplified SM-2. Missed items enter an SRS queue; resurfaced at expanding intervals in warm-ups until mastered.

### Graduation & "real positive feedback"
- Milestone certificates at each stage boundary (shareable HTML/image).
- **Evidence portfolio:** auto-generated page listing concrete demonstrated abilities with proof links ("wrote X unaided on date Y," "judged 8/10 agent transcripts correctly"). This is the anti-"textbook amnesia" artifact — proof of transfer, not completion.
- **Evolving success definition:** onboarding captures the learner's initial idea of success; at each stage checkpoint, the replan step asks the learner to refine what "I really get it" means for them, and the capstone spec is shaped by that evolving definition. (The learner co-defines the finish line as they become able to see it.)

### Onboarding questionnaire (first run)
Collects: background (languages/tools known), self-assessed level per topic, learning-style preference (read/listen/do), motivation & personal success definition, weekly time budget, content-language default. Output: a `learner_profile` record that seeds the initial plan. Include a short calibration quiz (10 items spanning stages) so placement is measured, not just self-reported — a strong scorer can test out of early modules.

---

## 5. Adaptation Harness (deterministic, three tiers)

The learner must *feel* personalization; the owner must get bounded cost and predictable behavior. Never replan the whole course from scratch on every interaction.

**Tier 0 — Static spine (zero runtime LLM cost).** All module/lesson/exercise content is pre-authored, versioned in the repo (`/content/*.json` or MDX). Generated once at build time (by the coding agent, offline), human-reviewable, deterministic.

**Tier 1 — In-session micro-adaptation (cheap model, e.g., gpt-4o-mini class).** **Deterministic-first grading is a hard rule:** MCQ/fill-in/drag-order graded by exact or regex match; code exercises graded by pre-authored assertion tests run in Pyodide (`answer_spec` contains the test cases). These return correct/incorrect in **< 100 ms** with zero LLM cost. The LLM is invoked only for what determinism can't do: grading genuinely open-ended responses, explaining *why* an answer is wrong, hints, and Socratic replies — and its output streams in *after* the instant verdict, never blocking progression. Rationale: a cheap model that mis-grades even occasionally destroys trust in the whole feedback system; determinism is both more reliable and cheaper. Bounded: small context, capped max_tokens, caching of identical inputs. Target: **< $0.01/session**.

**Tier 2 — Checkpoint replanning (strong model, e.g., gpt-4o class).** Triggered **only** at deterministic checkpoints: module completion, stage assessment, or explicit learner request (rate-limited to 1/week). Input: learner profile + aggregated performance stats + SRS state + engagement score + pulse-check results + learner feedback. The planner is schema-constrained: it may reorder, inject remedial content, adjust difficulty, and prune **elective** lessons, but it can never delete **core** lessons (it may only change their modality/framing) — the core/elective policy from §4 is enforced by the diff validator, not by prompt trust. Output: a **structured plan diff** (JSON): reorder upcoming sessions, inject remedial sessions from a pre-built remedial pool, adjust difficulty flags, skip mastered content, update the learner's success definition. The diff is applied to the plan; the LLM never free-generates curriculum at runtime. A "plan changelog" screen shows the learner what changed and why (transparency = trust = perceived personalization).

**Cost guardrails (hard requirements):**
- `llm_usage` table logs every call (provider, model, tokens, computed cost).
- Env-configurable daily and monthly USD caps; when exceeded, Tier 1 degrades gracefully to static feedback ("compare with reference answer") — the app never breaks, and the UI shows a friendly notice.
- Owner-facing usage dashboard page (current month spend, by tier).

**Provider adapter:**
```ts
interface LLMProvider {
  complete(req: {
    tier: "micro" | "planner";
    system: string;
    messages: Msg[];
    maxTokens: number;
    json?: boolean;          // request structured output
  }): Promise<{ text: string; usage: TokenUsage }>;
}
// implementations: openai.ts (default), anthropic.ts
// selection + tier→model mapping via env: LLM_PROVIDER, LLM_MODEL_MICRO, LLM_MODEL_PLANNER
```
All calls go through **one server-side route** (`/api/llm`). No LLM keys or calls ever exist client-side.

---

## 6. Technical Architecture

### Stack (chosen for lowest long-term maintenance burden by a non-engineer + AI agent)
- **Next.js 14+ (App Router, TypeScript)** — one framework for UI + API routes; largest ecosystem = best AI-agent support for future maintenance
- **Vercel** — hosting; `git push` → auto-deploy; env vars in dashboard; free tier
- **Supabase** — auth (email magic link) + Postgres + Row Level Security; free tier
- **Pyodide (WASM)** — Python runs *in the browser*: free, safe (sandboxed), no execution server to maintain; lazy-loaded only on code-exercise pages
- **Tailwind CSS + shadcn/ui**; **CodeMirror 6** for the editor; **next-intl** (or equivalent) for the zh/en toggle
- Total services the owner touches: **GitHub, Vercel, Supabase, OpenAI** — four accounts, no servers.

### Data model (Postgres, multi-user-ready)
```
users (Supabase auth)
learner_profiles   (user_id, background, preferences, success_definition, lang_pref, weekly_budget)
modules            (id, stage, order, title_en, title_zh, description, references)
lessons            (id, module_id, order, format, content_ref, est_minutes, tag)  -- tag: core | elective
exercises          (id, lesson_id, type, prompt_en, prompt_zh, answer_spec, difficulty, xp_value)
attempts           (user_id, exercise_id, response, correct, hints_used, ts)
plans              (user_id, version, plan_json, created_by_checkpoint)
plan_changelog     (plan_id, diff_json, rationale, ts)
xp_events          (user_id, amount, source, ts)
achievements       (id, name_en, name_zh, criteria_json, icon)
user_achievements  (user_id, achievement_id, ts)
srs_items          (user_id, exercise_id, ease, interval_days, due_at)
streaks            (user_id, current, longest, freezes_available, last_active_date)
llm_usage          (user_id, tier, provider, model, tokens_in, tokens_out, cost_usd, ts)
pulse_checks       (user_id, trigger_reason, response, ts)
skip_debts         (user_id, lesson_id, created_ts, cleared_ts)
```
RLS: every user-scoped table enforces `user_id = auth.uid()`.

### Repo structure
```
/app                # Next.js routes (learn, profile, dashboard, admin)
/app/api/llm        # single LLM gateway route (tiering, caps, logging)
/components
/lib/llm            # provider adapter + implementations
/lib/harness        # plan engine, SRS, XP/achievement logic (pure, unit-tested)
/content            # versioned curriculum: /stage-1/module-01/lesson-03.json ...
/content/schema.md  # content format spec (bilingual fields, exercise types)
/supabase           # SQL migrations, RLS policies, seed
/scripts            # content validation, seeding
/docs               # MAINTENANCE.md, ARCHITECTURE.md, COST.md
README.md           # concept, story, screenshots, self-hosting guide
```

### UX hard requirements
1. **Instant verdicts:** deterministic grading renders correct/incorrect in < 100 ms; LLM explanations stream in afterward and never block the Next button.
2. **Zero-friction start:** the home screen is a single prominent **Continue** button resuming the exact next step; no decisions required to start learning. Within-session progress indicator (item x of n) always visible.
3. **Mobile-honest exercise variants:** drag-drop is implemented as tap-to-order on touch devices. Code-*writing* exercises are flagged `desktop_preferred`; on mobile they auto-swap to an equivalent read-code/predict-output or fill-the-blank variant so a phone session is never a degraded chore. (Reading/tracing on phone, writing on desktop is the intended usage split.)
4. **Glossary everywhere:** any technical term in any content is tappable → tooltip with the English original, a one-line definition, and "where you'll meet this" scenario note. Terms come from a central glossary file in `/content`; this directly serves graduation ability #3.
5. **Pyodide load masking:** the WASM runtime (~5–10 s cold load) preloads behind a skeleton + rotating tip cards on code-lesson entry; never a blank spinner.
6. **Owner content preview:** a `preview` mode renders any module from a branch before it's published to the plan, so the owner reviews agent-authored content module-by-module (quality gate for Phase 4).

### Security & privacy (hard requirements — verify at every phase)
1. All secrets **only** in `.env.local` (gitignored) and Vercel env vars. Repo ships `.env.example` with placeholder names only.
2. **gitleaks** as pre-commit hook **and** GitHub Actions job; enable GitHub push protection + secret scanning on the repo.
3. No PII in repo: no real names, emails, or learning data. Learning data lives only in the owner's Supabase project.
4. Supabase RLS on all tables; server-side routes validate the session.
5. Auth = Supabase email magic link (no passwords to manage). MVP may additionally gate signup with an `INVITE_CODE` env var so the deployed app stays private to the owner even though the code is public.
6. `SECURITY.md` documents all of the above, including a "what never enters this repo" checklist.

---

## 7. Build Plan (phased; each phase ends with a verifiable checkpoint)

**Instructions to the build agent:** work phase by phase; do not start phase N+1 until phase N acceptance criteria pass. Commit granularly with descriptive messages — the history is part of the deliverable. Write `docs/MAINTENANCE.md` as you go, in plain language, assuming the maintainer is a non-engineer working through Claude Code.

### Phase 0 — Scaffold & Safety Rails
Next.js + TS + Tailwind scaffold; Supabase project + migrations + RLS; magic-link auth (+ invite code gate); gitleaks pre-commit + CI; `.env.example`; deploy "hello, authenticated world" to Vercel.
✅ *Accept:* owner logs in on phone and laptop at the live URL; a deliberately planted fake secret is blocked by the pre-commit hook.

### Phase 1 — Core Learning Loop (Stage 1 content only)
Content schema + validator; author Modules 1–4 (bilingual); lesson player for drill formats (MCQ, fill-in, drag-drop) + reading+quiz; Pyodide editor with run + basic checks; LLM gateway route with adapter, tiering, usage logging, cost caps; Tier-1 grading & hints; XP awarding.
✅ *Accept:* owner completes Module 1 end-to-end on the live site; `llm_usage` shows logged, capped calls; zh/en toggle works.

### Phase 2 — Gamification & Retention
Levels + curve; streaks + freezes; achievements engine + seed set; SRS queue + warm-up integration; progress dashboard (module map, XP, streak, next-up).
✅ *Accept:* wrong answers resurface in later warm-ups; achievements fire; dashboard reflects reality.

### Phase 3 — Adaptation Harness & Onboarding
Onboarding questionnaire + calibration quiz → `learner_profiles` + initial plan; plan engine (apply structured diffs, enforce core/elective rules); engagement score + pulse checks; skip-with-debt flow; Tier-2 checkpoint replanning with strict JSON output + validation; plan changelog UI; owner usage/cost dashboard.
✅ *Accept:* completing a module triggers exactly one planner call producing a valid, applied, explained diff; a diff attempting to delete a core lesson is rejected by the validator; malformed planner output is rejected safely; a simulated accuracy drop triggers exactly one pulse check.

### Phase 4 — Full Curriculum & Assessments
Author Modules 5–14 (incl. multi-language contrast content and curated video embeds); stage assessments (timed, no-hint mode); milestone certificates; evidence portfolio page; capstone flow (spec builder → submission → LLM rubric review).
✅ *Accept:* full course navigable start to finish; a stage assessment produces a certificate; portfolio page renders real evidence.

### Phase 5 — Polish & Public Release
Responsive/mobile pass; loading/error/empty states; README with screenshots + self-hosting guide; `ARCHITECTURE.md`, `COST.md`, finalize `MAINTENANCE.md` (runbook: adding a lesson, changing models, reading the cost dashboard, recovering from a bad deploy — each as a copy-pasteable Claude Code prompt); MIT license; final security sweep.
✅ *Accept:* a stranger can understand and self-host from the README; owner can perform each runbook task via Claude Code without editing code by hand.

**Suggested first message to the build agent:**
> "Read `codelingua-design-doc.md` in full. Execute Phase 0 only. Before writing code, list the accounts/keys you need from me and pause for them. After Phase 0 acceptance passes, stop and summarize."

---

## 8. Owner's Maintenance Model (post-build)

Daily reality: **edit → `git push` → Vercel auto-deploys.** No servers, no patching. The four dashboards (GitHub/Vercel/Supabase/OpenAI) are the entire operational surface. All iteration happens through Claude Code against this repo — and per the "混合" learning decision, **owner-led iterations are themselves curriculum**: Module 11 explicitly uses this repo as its teaching material, and the backlog of future features (below) doubles as post-graduation practice.

## 9. Future Roadmap (explicitly out of MVP scope)
- Multi-user signup, per-user BYO API keys or metered quotas
- Additional subjects (the content schema is subject-agnostic by design)
- Native mobile wrapper, offline mode
- Community content contributions via PR (schema validator already enables this)
