# Activation Entry v2 — binding spec

Status: implemented on `/start` as of 2026-09-06.

This document supersedes the 2026-09-03 deterministic diagnostic surface and
the earlier 2026-09-05 exploratory draft. The three diagnostic axes
survive, but the entry framing, first input, examples, routing outcome, and
post-activation path changed.

Companion UI handoff: [ACTIVATION_ENTRY_UI.md](./ACTIVATION_ENTRY_UI.md).

---

## Why This Changed

Two external testers, neither a programmer, said the old `/start` felt abstract
and far from their lives:

- a psychology-counselling trainee from a humanities background
- a UX designer at a large tech company with journalism and HCI training

The important signal was not that they lacked code background. When asked what
makes AI feel dumb, the UX designer spontaneously described the course's core
mechanism: "I tell it every time to do A and not B, I explain in detail, and it
still cannot meet the expectation."

That is context, statelessness, constraints, and verification in non-engineer
language. The audience can already feel the right pain. The old door made them
think the pain belonged to programmers.

---

## Product Job

The entry must do two things in under 3 minutes:

1. Make a cold visitor feel, "This has happened to me."
2. Name one engineering mechanism behind that feeling, so curiosity carries
   them into the first lesson.

It must not ask for occupation, code background, or an open-ended first essay.
Those are either weak fit signals or high-friction inputs before trust exists.

---

## Binding Decisions

### Start From Pain Mechanism

The first answerable screen is a single-choice question with exactly five
options:

1. Rules it forgets
2. Claims of completion the learner cannot verify
3. One fix breaking another thing
4. Overwriting the original
5. Not knowing what can be handed to AI

These are not user segments. They are engineering failure modes the course can
later name as context, verification, regression, overwrite, and trust/risk
boundaries.

No first-run multiple-choice group, including the optional profile form after
activation, may exceed five options.

### Keep The Flow Deterministic

The implemented `/start` flow makes no LLM request. Routing, scoring, copy, and
persistence are all deterministic. Free-form noun capture and LLM slot filling
remain deferred because the no-LLM path must be the baseline, not the degraded
fallback.

If a future LLM layer is added, it may extract short noun phrases for examples
or analytics. It must not write on-screen prose, judge learner fit, or decide
whether the learner should continue.

### Keep Routes Internal

Route A/B/C/skip may still be recorded for product learning, but route labels
do not appear in the learner experience and no route blocks continuation. The
beta cost is asymmetric: a false negative loses a learner; a false positive
costs one lesson.

Every route may continue into the course.

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

The hook screen has no progress bar. After the hook, show an `n/8` progress
rail:

1. Pain mechanism
2. Stakes
3. Friction
4. Diagnostic: evidence
5. Diagnostic: precheck
6. Diagnostic: diff
7. Result: named practice signal -> selected pain -> one usable prompt
8. Expectations: four true/false claims -> start Lesson 0

Skip remains available through the answerable diagnostic screens. Skip records
activation as completed/skipped and sends the learner to Lesson 0.

### Hook

The hook should recall a lived frustration, not explain the product.

Chinese:

- Kicker: `在决定要不要上之前`
- Title: `「我不是已经说得很清楚了吗？」`
- Body: `你说得越细，它越像听懂了。可它交回来的东西，还是不对。`
- CTA: `花 3 分钟，看看这门课适不适合你`

English:

- Kicker: `Before you decide`
- Title: `"I thought I was being clear."`
- Body: `You give more detail. It sounds like it understood. Then the thing it hands back is still off.`
- CTA: `Take 3 minutes and decide`

### Pain Mechanism

Ask: `哪一种时刻最像你遇到的卡点？`

Use the five authored options in `src/lib/activation-diagnostic.ts`. Do not add
occupation examples here. The user has not given us that context.

### Stakes And Friction

Ask only what changes the next step:

- Stakes: `这件事如果它做错了，会怎么样？`
- Friction: `这种卡住，发生过不止一次吗？`

Internal route:

```ts
stakes >= 2 && friction >= 2  -> "A"
stakes <= 1 && friction <= 1  -> "C"
else                          -> "B"
```

The route is analytics/persistence data only. It is not rendered as a label or
exit.

### Diagnostic Axes

Keep the existing axes:

- `evidence`: does the learner ask for proof rather than accepting "done"?
- `precheck`: does the learner constrain the work before AI touches it?
- `diff`: does the learner notice hard-to-undo change risk?

The examples must be noun-light and occupation-light:

- `它说完成了。`
- `有件事，你上次已经交代过它。`
- `一份改动说明看起来很合理。`

### Result

The result is not a personality label. It should:

1. Name the deterministic practice signal.
2. Replay the selected pain as supporting context.
3. Give one prompt the learner can use today.
4. Continue to expectations.

Default prompt:

- zh: `先别动。先说你会改哪几处、哪些不能碰、改完我怎么检查。`
- en: `Do not touch it yet. Tell me what you would change, what is off-limits, and how I should check it.`

### Expectations

Use four true/false claims:

1. Certificate/resume line
2. Need to know code first
3. Job-tailored course
4. Build a product by the end

Each item is a boundary confirmation, not a punitive quiz. If the learner picks
the correct answer, say so directly before the explanation. If the learner
picks the wrong answer, show the correct answer first, then explain what the
learner gets instead. Do not stack four dry rejections. The summary should make
the boundary feel honest, not defensive.

---

## Persistence And Events

Store the new result at `learner_profiles.background.activation_v2`:

- `completed`
- `completed_at`
- `version`
- `skipped`
- `pain_type`
- `stakes`
- `friction`
- `route`
- `axes`
- `answers`
- `mechanism_line`
- `result_axis`
- `result_title`
- `result_move`
- `expectations`

Keep writing the older `activation_diagnostic` compatibility marker so existing
checks continue to work.

Events:

- `activation_diagnostic_started`
- `activation_route_assigned`
- `activation_expectations_answered`
- `activation_diagnostic_completed`
- `activation_skipped`

Do not put free-form learner text, emails, or assistant transcript content into
event properties.

---

## Deferred

- Open-text cold-start capture
- Voice input
- LLM noun extraction
- Runtime example slot filling
- Occupation-aware analytics

Do not reintroduce any of these on the first screen without a new decision
entry explaining the tradeoff.
