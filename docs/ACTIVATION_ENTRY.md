# Activation Entry v3 — binding spec

Status: implemented on `/start` as of 2026-09-12.

This document supersedes the 2026-09-06 pain-mechanism-only implementation and
restores the earlier scenario-first design. The implementation keeps the
deterministic routing and diagnostic checks, but the examples now start from
the learner's own sentence when the learner provides one.

Companion UI handoff: [ACTIVATION_ENTRY_UI.md](./ACTIVATION_ENTRY_UI.md).

---

## Why This Changed

Two external testers, neither a programmer, said the earlier `/start` felt
abstract and far from their lives. The issue was not the curriculum. The issue
was the door: fixed examples can always borrow the wrong noun.

The 2026-09-06 version solved one problem by starting from five general pain
mechanisms, but it lost the more important property of the earlier local spec:
the learner could bring in their own scene first. Without that, the first
diagnostic example can still feel unrelated before the learner understands the
mechanism.

The restored rule is:

- Let the learner supply the noun if they are willing.
- If they skip, the generic flow remains complete.
- Explain with engineering concepts, not occupational categories.

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

### Start From One Sentence

The first answerable screen is a skippable sentence completion:

- zh: `最近一次我想让 AI 帮我做的事，是`
- en: `The last thing I wanted AI to do for me was`

This is not a blank form. It has five example chips that fill the field and
remain editable:

These chips are a structured task-preset set, not random examples. Keep the set
to five or fewer:

- `code_task`: zh `完成一个小代码任务` / en `Finish a small code task`
- `research`: zh `查资料并给我一个结论` / en `Research something and give me an answer`
- `organize`: zh `整理一堆零散信息` / en `Organize scattered notes`
- `rewrite`: zh `改一段已经写好的话` / en `Rewrite something I already wrote`
- `summarize`: zh `把很长的东西压成摘要` / en `Summarize something long`

The sentence is saved to the learner profile and replayed on the result screen.
The chosen preset id, if any, is also saved as `scenario_preset` and may enter
event properties. The UI promises only that the next examples may borrow one or
two words from the sentence. The free-form sentence is never written to
`app_events`.

### Keep Deterministic Rules First

Routing, scoring, result selection, copy, and continuation are deterministic.

The optional LLM layer may extract only:

```ts
{
  task: string | null;         // rendered, short verb phrase
  artifact: string | null;     // rendered, short noun
  role_context: string | null; // analytics/profile only, never rendered
  pain_type:
    | "memory"
    | "claim"
    | "regression"
    | "overwrite"
    | "trust"
    | "none";
}
```

The LLM must not write on-screen prose, grade answers, route the learner, or
decide whether the learner should continue. If there is no key, a cost cap,
invalid output, provider failure, or a skipped sentence, the flow silently uses
local fallback slots or the blank-slot wording. The UI must not wait on this
extraction before continuing.

A future result-polish layer may relax "no on-screen prose" only for one
bounded micro-sentence after a separate review. It cannot change the
deterministic result, cannot add broad coaching, and must use strict schema
validation, cost logging, timeout, and local fallback.

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

If `pain_type === "none"` and the route computed to `B`, downgrade to `C`.
This is a tiebreaker only.

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

1. Scenario sentence
2. Stakes
3. Friction
4. Diagnostic: evidence
5. Diagnostic: precheck
6. Diagnostic: diff
7. Result: replay sentence -> why a little CS helps -> continue
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

- `d1` uses `{task}` when available: `请处理这件事：{task}` / `Please handle this: {task}.`
- `d2` stays deliberately noun-free.
- `d3` uses `{artifact}` when available: `覆盖保存回原来那份{artifact}` / `over the original {artifact}`

A wrong noun is worse than a blank slot. Slots must come only from the learner's
sentence or a validated extraction of that sentence, never from inferred
occupation.

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
2. Show three compact signals from previous answers: consequence if wrong,
   friction frequency, and practice focus.
3. Replay the learner's own sentence as the original line, or state that the
   generic version was used.
4. Add one short bridge sentence that explains why the practice focus matters
   in that scenario. Prefer deterministic scenario families such as code,
   research, organizing, writing, and summary before using runtime LLM wording.
   If the learner skipped the sentence, use generic-scenario bridge copy and do
   not mention an original line.
5. Connect the ability to inspect, set boundaries, or read changes to why a
   a little computer basics helps them use AI better.
6. Continue to expectations.

The mechanism explanation must come from the same deterministic axis as the
result title. `pain_type` from scenario extraction may support internal product
learning, but it must not rewrite the result-page mechanism.

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
- `version: 3`
- `skipped`
- `verbatim`
- `scenario_preset`
- `slots`
- `role_context`
- `pain_type`
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
- Learner-controlled retention/clearing of the scenario sentence
- Widening the course endpoint for learners whose AI use never touches code
