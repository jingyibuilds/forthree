# Decision Log

Amendments to [DESIGN.md](./DESIGN.md) (v1.1). The design doc is the baseline;
this file records every fork taken since, newest first. Capture the fork, not
just the outcome: what was considered, what was rejected, why.

---

## 2026-08-27 — Curriculum amendment: system design as an explicit thread

Owner: "基础的编程知识是基石,最重要的是之后能够拥有 system design." Correct
and era-consistent — once AI writes the code, the human leverage point moves
up to system design, which is also the layer where agent proposals most need
judging. Gap confirmed: Stage 3 taught system *literacy* (parts and
vocabulary), not design *judgment* (composition, tradeoffs).

Amendment (weave, not bloat — no new module): (a) every Stage-3 module
(M9–M12) ends with a design-judgment exercise — given a scenario, judge an
agent-proposed architecture directionally; (b) the M14 capstone becomes
**design-doc-first**: a one-page mini design doc (components, data flow, one
key tradeoff) written and rubric-reviewed before any code; (c) Stage 3/4
milestones updated in content/stages.json accordingly. Teaching material:
forthree's own architecture decisions in this very file (extends the M11
repo-as-textbook approach). Rejected for now: a dedicated system-design
module — revisit as an elective if Stage 3 leaves appetite.

## 2026-08-27 — First-user playtest feedback round (owner played L1 live)

Four decisions from live feedback:

1. **English-in-Chinese-course policy.** A zh-mode fill-in demanding an
   English word felt like leakage. Resolution: it *is* deliberate
   (graduation ability #3 — agent transcripts are English), so make the
   intent visible: `term_drill: true` exercises get a badge (术语题 ·
   用英文回答). Non-term fill-ins must accept zh variants. Rejected: adding
   zh words to term-drill accept lists — it would defeat the drill's point.
2. **Back navigation added.** Its absence was MVP omission, not design;
   learners must be able to look back at a concept while answering.
   Answered exercises stay done when revisited.
3. **In-lesson language toggle** added to the player header.
4. **The 哑巴语 rule** (content/schema.md): every term exercised in both
   directions — produce *and* recognize in the wild. Named for Duolingo's
   ask-directions-but-can't-parse-the-answer failure, which the owner
   experienced directly.

Also from this round: big-picture context on the path page (course title +
promise + 卷一–卷四 stage map with per-stage "what you can do after"
milestones, from content/stages.json), per-lesson `why` rationale footnote,
and (future) lesson provenance footnotes (`source_refs`).

## 2026-08-27 — Visual identity: 「朱批」 design system

Owner rejected the black/white placeholder UI as depressing. Direction
chosen from the subject's own world — Chinese pedagogy — rather than
generic edtech: 月白 cool paper ground (deliberately not the AI-default
warm cream), 墨 ink text, 靛青 indigo as the interactive color (indigo-dye
cloth × terminal blue), 朱砂 vermilion reserved for exactly two things —
the 反三 seal (印章 brand mark) and the analogy-anchor cards, styled as a
teacher's vermilion margin notes (朱批), which is what anchors *are*.
松绿 for correct verdicts. Display type: Noto Serif SC; body stays Geist.
Tokens live in globals.css (light + dark). Signature element: the seal +
朱批 anchor card; boldness spent there, everything else quiet.

## 2026-08-27 — Onboarding questionnaire specced (docs/ONBOARDING.md)

Owner design input, distilled into a full spec (expands DESIGN.md §4's one
line). New beyond the original design: (a) career-stage/field questions so
examples can be tailored to the person, (b) an explicit **anti-goal
No-list** ("I do NOT need to write complex engineering code") as steering
signal, (c) explanation-style as a first-class asked preference (analogy
vs. definition vs. scenario vs. guess-first — the owner's own style is not
assumed to be everyone's), (d) a trial-vs-committed intent question that
changes early product behavior, (e) a scheduled **early re-anchor
checkpoint** at lesson 3 / day 3 collecting "was this useful, and if not
why" — distinct from threshold-triggered pulse checks. Rules: multi-selects
≤5 options, MECE. North-star feeling: fit, value, low cost. Implementation
stays in Phase 3; the spec exists now because it shapes learner_profiles
and Tier-1 prompts. Owner's own answers stay out of the public repo (PII).

## 2026-08-26 — Tagline v4 (final, owner's words): "Learning for real."

Owner vetoed the Analects line as front door: opaque to a stranger ("you
just said a sentence"), and its Chinese duplicated the app name on the same
screen. New rule extracted: a tagline must answer "what is this + why do I
care" at first glance; allusions are the name's story, not the pitch.
v3 ("Learning that becomes yours.") lasted minutes; the owner then wrote
the real one themselves: **"Learning for real." / 「学点真本事」** (zh picked
over 「学点能用的」 — 真本事 covers taste and judgment; 能用的 reads narrowly
utilitarian). Applied to UI dictionaries, app metadata, README, and repo
description.

## 2026-08-26 — Taste correction; tagline settled on the name itself

Owner reflection: the ladder overstated AI's limits — AI does allow
creation, even skipping judgment entirely. What it never builds is
**taste**: you can feel something is off but cannot say why or how, and
over time you slide into blindly delegating decisions you cannot parse.
WHY.md's ladder reframed from *access* to *ownership*. Tagline directive:
natural, humble, true, anchored on learning — not on AI. Settled on the
name itself: **"Shown one corner, return with three." / 举一反三** —
applied to UI, README, app metadata, and repo description. "AI sets your
floor…" demoted to essay prose.

## 2026-08-26 — Philosophy distilled: docs/WHY.md; tagline retracted again

Owner voice memo (ladder self-diagnosis, vacation story, Duolingo verdict,
tiering) distilled into [WHY.md](./WHY.md) — first-person, "words by
Jingyi," linked from README. Core formulations: the 理解→判断→创造 ladder;
"AI sets your floor, understanding sets your ceiling"; 宽进严出 tiering at
scale (retention layer funds the mission, capability layer defines it).
"Actually understand what your AI is doing" retracted as too small — it
described the first course, not the project. New tagline candidates live in
WHY.md; UI/app metadata keep the old line until the owner picks.

## 2026-08-26 — Content format: analogy-first, with mandatory break-point

Owner learns best through analogies and examples (stated preference). Two
changes: (1) the content schema requires an `anchor` block per new concept —
an analogy or a contrast to something the learner already knows (the M2
SQL anchors generalize to all modules); (2) `learner_profiles.preferences`
gains `explanation_style`, read by Tier-1 prompts so LLM explanations and
hints lead with an analogy.

Guardrail: analogies create fluency illusions, and the graduation bar is
precise understanding ("not vague concepts" — owner's own words). Mandatory
pair: **analogy + the precise term**. The analogy is the on-ramp, never the
destination.

*Refined same day after owner pushback:* the originally proposed third
element ("where the analogy breaks") is **demoted to conditional**. A
break-point note is included only when (a) the analogy predictably produces
a concrete misconception the learner would act on (e.g. "a variable is a
box" vs. Python references), and (b) the correction can be phrased using
already-taught concepts or a concrete example — otherwise cut it. Rejected:
mandatory break-points, because they optimize for completeness and generate
jargon-laden footnotes that are harder than the concept itself (the
proposal's own RLS example failed this test).

## 2026-08-26 — Naming, tagline, and the no-mixing UI rule

Display names: **For Three** (English) / **反三** (Chinese); `forthree` stays
as the slug (repo, package). From 举一反三 — "shown one corner, return with
three" — the name states the actual graduation bar: transfer, not coverage.

**UI language is all-or-nothing:** every surface renders fully Chinese or
fully English per the language setting — never mixed bilingual labels
("邮箱 / Email" is banned). Phase 0 screens default to English (owner
decision, revised same day from Chinese-first), with a language toggle
(cookie-based, hand-rolled dictionaries in `src/lib/i18n.ts` — pulled
forward from Phase 1 while the surface is two screens; next-intl only if
this outgrows itself). Technical terms
keeping their English originals inside Chinese content is per DESIGN.md and
is not "mixing."

**Tagline:** "Actually understand what your AI is doing." Owner rejected the
earlier "Learn to judge, not just to use" — the goal is *actually using* AI;
judgment is the evidence of real use, not the point. Chinese meta line
(independent, not a translation): 真正会用 AI 所需要的工程常识。

## 2026-08-26 — Project renamed: CodeLingua → **forthree**

Superseded in part by the naming entry above (For Three / 反三). CodeLingua
remains in DESIGN.md as the historical working name.

## 2026-08-26 — Graduation bar calibration: instant parse of real agent output

Owner feedback (with a screenshot of a live Claude Code session): after
graduating, seeing a real agent transcript — `gh auth status`, `git config`
checks, tool calls — should produce *immediate* understanding of what is
happening and why, not a vague familiarity. **Status: calibration reference,
not yet a content requirement.** It sharpens what "success criterion #4"
means; whether real transcripts become a first-class exercise type is a
Phase 1+ content decision.

## 2026-08-26 — Content sourcing: reuse-first, license-gated

Owner overrode DESIGN.md §3's "original exercises only" rule: **if
high-quality material exists with a compatible license, use it** — original
authoring is the fallback, not the default. Scouting for sources (curricula,
exercise banks with test cases, glossaries) happens before Phase 1 content
work. License compatibility is the gate: the repo is MIT; content borrowed
under CC-BY/CC-BY-SA keeps its own license in clearly marked directories;
NC-licensed material (CS50, MIT OCW) can be *linked/embedded* but not copied
in.

**Scout results (2026-08-26):**

| Source | License | Use |
|---|---|---|
| [Exercism python track](https://github.com/exercism/python) | MIT | **Copy/adapt.** Large exercise bank *with test suites* — maps directly onto `answer_spec` assertion tests for Pyodide. Primary exercise source; attribute in a NOTICE file. |
| [futurecoder](https://github.com/alexmojaki/futurecoder) | MIT | **Adapt content + borrow implementation patterns.** Complete interactive beginner Python course already running on Pyodide; its birdseye/debugger integration is battle-tested prior art. No Chinese translation exists. |
| Python official docs & tutorial | PSF (permissive) | **Copy/adapt** for glossary and reference material. |
| CS50P / CS50x | CC BY-NC-SA | **Link/embed only** (sequencing logic + timestamped video micro-clips, per DESIGN.md §3). |
| [mooc.fi Python MOOC](https://programming-26.mooc.fi/) | CC BY-NC-SA | **Reference only** — excellent 14-part sequencing benchmark; NC clause would constrain future multi-user options, so don't copy in. |
| py4e (Severance) | mixed CC-BY / CC BY-NC-SA | **Reference; check per-file.** Data-oriented framing is a good fit for a data-scientist learner. |

Net effect on cost: the expensive parts of content (exercises + test cases)
are largely coverable from MIT sources; original authoring concentrates on
(a) all Chinese content — no source has zh, it was always original work —
(b) SQL-contrast anchors and agent-era framing that make this course
forthree and not generic Python 101.

Honest prior-art note: futurecoder alone already delivers "free interactive
browser Python for beginners." forthree's reason to exist is everything it
lacks: bilingual, the taxonomy stage, agent-transcript literacy, SRS +
gamification, LLM feedback, and the judge-AI-output graduation bar.

## 2026-08-26 — Agent portability is a hard requirement

Owner rule (applies to all their projects): any coding agent (Claude Code,
Codex, …) must be able to pick up the repo cold. Concretely: `AGENTS.md` is
the canonical agent brief (`CLAUDE.md` points to it), all decisions and
work-in-progress live in committed docs (this file, `docs/`), nothing
load-bearing exists only in a chat transcript, and everything except secrets
is public on GitHub.

## 2026-08-26 — Runtime LLM: switchable-anytime; Anthropic default

DESIGN.md said "OpenAI default, Anthropic second." Amended: both providers are
first-class, symmetric implementations behind the adapter; switching is a pure
env change (`LLM_PROVIDER`), never a code change. Default is Anthropic
(micro tier: Haiku 4.5; planner tier: Sonnet 5) — the repo doubles as a
portfolio piece and the owner's context makes the Claude-powered story the
coherent one. Cost profile is equivalent either way.

## 2026-08-26 — Phase 1 narrowed to a Module 1 vertical slice

DESIGN.md Phase 1 authored Modules 1–4 in one phase. Amended: author **Module
1 only**, run the full loop on it (player, grading, XP, bilingual toggle), and
get owner sign-off on content quality, exercise feel, and bilingual copy
**before** batch-producing M2–4. Rationale: content is the project's dominant
cost and risk; producing four modules to an unvalidated format maximizes
rework.
