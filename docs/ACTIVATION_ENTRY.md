# Activation Entry v4 — binding spec

Status: implemented on `/start` as of 2026-09-14.

This document supersedes the 2026-09-12 sentence-first implementation. The
implementation keeps deterministic routing and diagnostic checks, but the first
answerable screen now asks the learner to choose the AI task closest to their
usual use. It does not ask for free-form text and does not call an LLM in the
activation path.

Companion UI handoff: [ACTIVATION_ENTRY_UI.md](./ACTIVATION_ENTRY_UI.md).

---

## Why This Changed

Owner review found that the free-form sentence created a false promise of
personalization. The runtime LLM extraction only reused a few words, so the
flow felt half-tailored and half-template. It also made Chinese copy sound like
translated product language.

The revised rule is:

- Let the learner choose a familiar AI-task family, not write an open sentence.
- Use authored examples for each family so continuity is deliberate.
- Treat LLM personalization as a later high-bar layer, not the default first
  screen.
- Explain with plain inspection habits, then earn the CS bridge.

---

## Product Job

The entry must do two things in under 3 minutes:

1. Make a cold visitor feel, "This is about using AI better, and this has
   happened to me."
2. Let the visitor discover that the missing layer is not a longer prompt, but
   a little computer/engineering structure: evidence, boundaries, changes,
   reversibility.

It must not ask for occupation, code background, or a long open-ended essay
before trust exists.

The learner does not have to arrive wanting "CS." The visible promise is better
AI use. CS is the method the flow earns permission to introduce.

---

## Binding Decisions

### Start From One Task Choice

The first answerable screen is a single-choice task question:

- zh: `选一个最接近你平常会让 AI 做的事。`
- en: `Choose the task closest to what you usually ask AI to do.`

The choices are structured task presets, not occupation categories. Keep the
set to five or fewer:

- `code_task`: zh `让 AI 做一个小代码任务` / en `Ask AI to finish a small code task`
- `research`: zh `让 AI 查资料并给结论` / en `Ask AI to research and give me a conclusion`
- `organize`: zh `让 AI 整理零散信息` / en `Ask AI to organize scattered notes`
- `rewrite`: zh `让 AI 改一段文字` / en `Ask AI to rewrite something I wrote`
- `summarize`: zh `让 AI 总结一大段内容` / en `Ask AI to summarize something long`

The chosen preset id is saved as `scenario_preset` and may enter event
properties. The chosen label may be saved to the learner profile as a
non-free-form `verbatim` value for compatibility, but learner-authored text is
not collected here. A generic example path remains available.

### Keep Deterministic Rules First

Routing, scoring, result selection, copy, and continuation are deterministic.

The `/start` flow makes no LLM request. A future personalization layer may add
one bounded micro-sentence only after a separate review. It cannot change the
deterministic result, cannot add broad coaching, cannot be the only reason the
page feels relevant, and must use strict schema validation, cost logging,
timeout, and local fallback.

### Keep Routes Internal

Route A/B/C/skip may be recorded for product learning, but route labels do not
appear in the learner experience and no route blocks continuation. Every route
may continue into Lesson 0.

The deterministic route remains:

```ts
stakes >= 2 && friction >= 2  -> "A"
stakes <= 1 && friction <= 1  -> "C"
else                          -> "B"
```

### Make Profile Onboarding Optional

After activation, the learner can enter Lesson 0 without completing the longer
profile form. The profile remains useful, but it is no longer a gate between
"this feels relevant" and "let me try the first lesson."

### Write Both Languages Natively

English and Chinese are authored versions, not literal translations. Chinese
must read like native Chinese and carry the meaning without English syntax.
English must avoid startup filler, vague AI optimism, and therapy-coded comfort
copy.

---

## Flow

The hook screen has no progress bar. After the hook, show a `1/6` through `6/6`
progress rail for the answerable screens:

1. Task choice
2. Stakes
3. Friction
4. Diagnostic: evidence
5. Diagnostic: precheck
6. Diagnostic: diff
7. Result: chosen task -> why a little CS helps -> continue
8. Expectations: four true/false claims -> start Lesson 0

Skip remains available through the answerable diagnostic screens. Skip records
activation as completed/skipped and sends the learner to Lesson 0.

### Hook

Chinese:

- Kicker: `想把 AI 用顺一点`
- Title: `我不是已经` / `跟 AI 说清楚了吗？`
- Body: `它听起来像懂了，交回来的东西却还得你判断、返工，或者硬着头皮猜。`
- CTA: `用 3 分钟试一下`

English:

- Kicker: `To use AI better`
- Title: `"I told AI exactly what I wanted."`
- Body: `It sounded like it understood. The handoff still made you check, redo, or guess.`
- CTA: `Try the 3-minute check`

The hook is the second AI-use signal after the homepage. It must stand alone
after the login/email attention break, but it should not become a paragraph of
positioning copy.

### Diagnostic Axes

Keep the existing axes and option semantics:

- `evidence`: does the learner ask for proof rather than accepting "done"?
- `precheck`: does the learner constrain the work before AI touches it?
- `diff`: does the learner notice hard-to-undo change risk?

Only the costume changes:

- `d1` uses preset `{task}` when available: `请帮我{task}` / `Please {task}.`
- `d2` stays deliberately noun-free.
- `d3` uses a full authored overwrite line per preset, never string
  concatenation that can create awkward Chinese such as `原来的原稿`.

A wrong noun is worse than a generic example. Slots come from the authored
preset only, never from inferred occupation or shallow text extraction.

### Result

The result is not a personality label, report card, or course philosophy
paragraph. But it must still return a conclusion. After six answerable screens,
the learner expects to know what was measured.

Start with a deterministic diagnosis of what the learner needs next to use AI
well, computed from the three diagnostic axes:

- `starting`: score 0-3
- `everyday`: score 4-6
- `mature`: score 7-9

This diagnosis is deliberately modest. Do not call the learner an "AI expert."
The visible badge should describe behavior, not the learner as a type. The
purpose is to name the learner's current checking posture and give them a reason
to continue.

It should:

1. Give one visible diagnosis sentence about what the learner needs next to use
   AI well. Prefer concrete result language over repeating `Using AI well...` /
   `把 AI 用好...` as a prefix.
2. Replay the chosen task family, or state that the generic version was used.
3. Add one short bridge sentence that explains why the practice focus matters
   in that task family. Use deterministic scenario families such as code,
   research, organizing, writing, and summary. If the learner chose the generic
   path, use generic bridge copy.
4. Show three compact signals from previous answers: consequence if wrong,
   friction frequency, and practice focus.
5. Connect the ability to inspect, set boundaries, or read changes to why
   a little computer basics helps them use AI better.
6. Continue to expectations.

The mechanism explanation must come from the same deterministic axis as the
result title. The chosen task family may change the example sentence, but it
must not change the scored result, route, or mechanism.

Do not add a broad philosophy paragraph here. Do not add a copyable prompt or
"try this today" block; that makes the page feel like a completed takeaway
instead of an entry into the course.

### Expectations

Use four true/false claims:

1. Certificate/resume line
2. Need to know code first
3. Job-tailored course
4. Stronger foundation for using AI to build something real

Each item is a boundary confirmation, not a punitive quiz. If the learner picks
the correct answer, say so directly before the explanation. If the learner
picks the wrong answer, show the correct answer first, then explain what the
learner gets instead. Boundary confirmation should not mean lowered ambition:
avoid denying a basic, motivating hope when a narrower positive version is
true. Do not show a tally.

---

## Persistence And Events

Store the result at `learner_profiles.background.activation_v2`:

- `completed`
- `completed_at`
- `version: 4`
- `skipped`
- `verbatim` (preset label only, not learner-authored text)
- `scenario_preset`
- `slots`
- `stakes`
- `friction`
- `route`
- `axes`
- `answers`
- `mechanism_line`
- `readiness_level`
- `readiness_score`
- `readiness_title`
- `result_axis`
- `result_title`
- `expectations`

Keep writing the older `activation_diagnostic` compatibility marker so existing
checks continue to work.

Events:

- `activation_scenario_submitted`
- `activation_routing_answered`
- `activation_route_assigned`
- `activation_expectations_answered`
- `activation_diagnostic_completed`
- `activation_skipped`

Do not put free-form learner text, emails, or assistant transcript content into
event properties.

---

## Deferred

- Voice input
- Widening the course endpoint for learners whose AI use never touches code
