# Decision Log

Amendments to [DESIGN.md](./DESIGN.md) (v1.1). The design doc is the baseline;
this file records every fork taken since, newest first. Capture the fork, not
just the outcome: what was considered, what was rejected, why.

---

## 2026-08-26 — Project renamed: CodeLingua → **forthree**

举一反三 — "shown one corner, return with three." The name states the actual
graduation bar: transfer, not coverage. CodeLingua remains in DESIGN.md as the
historical working name.

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
