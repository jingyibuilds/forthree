# Activation Entry v5 — binding spec

Status: implemented on `/start` as of 2026-09-14.

This document supersedes the 2026-09-12 sentence-first implementation and the
2026-09-14 v4 task set. The implementation keeps deterministic routing and
diagnostic checks, but the first answerable screen now asks the learner to
choose a broad everyday AI-task family. It does not ask for free-form text and
does not call an LLM in the activation path.

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

- zh: `选一个最接近的任务。`
- en: `Choose the closest kind of task.`

The choices are structured task presets, not occupation categories and not five
near-duplicate text chores. Keep the set to five or fewer:

- `code_task`: zh `写一段小代码，或改个 bug` / en `Finish a small code task`
- `research`: zh `查资料、找论文，整理结论` / en `Research sources or papers`
- `visual`: zh `做一张图或一页展示稿` / en `Make an image or one-page visual`
- `automation`: zh `安排提醒，或处理一件重复的小事` / en `Set up a reminder or small workflow`
- `writing`: zh `把零散想法整理成文字` / en `Turn messy notes into clear writing`

The chosen preset id is saved as `scenario_preset` and may enter event
properties. The chosen label may be saved to the learner profile as a
non-free-form `verbatim` value for compatibility, but learner-authored text is
not collected here. There is no generic example button on this screen; the five
choices are broad enough that forcing a choice is lower friction than adding a
vague escape hatch.

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

- Kicker: `先做个 3 分钟小检查`
- Title: `AI 交回来的东西` / `你通常怎么判断？`
- Body: `不用准备，也不打分。选几个日常情境，看看这门课会在哪一步帮你把 AI 用得更稳。`
- CTA: `开始小检查`

English:

- Kicker: `A 3-minute check first`
- Title: `When AI hands work back, how do you judge it?`
- Body: `No prep, no score. Pick a few everyday moments and see where this course can help you use AI with steadier judgment.`
- CTA: `Start the check`

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
- `d2` stays deliberately noun-free and uses `Before AI starts` rather than
  `Before AI starts changing things`, so non-editing tasks such as research,
  image generation, and reminders still fit.
- `d3` uses a full authored overwrite line per preset, never string
  concatenation that can create awkward Chinese such as `原来的原稿`.

A wrong noun is worse than a forced scenario. Slots come from the authored
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
2. Replay the chosen task family. If older stored state or malformed input lacks
   a preset, show a quiet "task not recorded" fallback rather than presenting it
   as a product path.
3. Add one short bridge sentence that explains why the practice focus matters
   in that task family. Use deterministic scenario families such as code,
   research/sources, visual generation, reminders/workflows, and writing.
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
- `version: 5`
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
