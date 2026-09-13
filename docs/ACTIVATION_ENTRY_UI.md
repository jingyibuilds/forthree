# Activation Entry v3 — UI handoff

Status: implemented on `/start` as of 2026-09-12.

This file is the UI companion to
[ACTIVATION_ENTRY.md](./ACTIVATION_ENTRY.md). That file is binding for product
logic and copy intent; this file captures layout, visual rhythm, and handoff
notes.

---

## Existing Visual System

Use the current 「朱批」 system from `src/app/globals.css`:

| Role | Token | Use |
|---|---|---|
| `--background` | page ground | quiet paper surface |
| `--surface` | cards | option and summary cards |
| `--ink` | primary text | headings and readable body |
| `--muted` | secondary text | explanations |
| `--line` | borders | dividers and card frames |
| `--primary` | action | selected states and primary buttons |
| `--accent` | annotation | left rails, labels, result quote |
| `--accent-soft` | annotation background | result quote block |

No gradients, glass, glow, emoji-as-design, or generic AI visuals.

---

## Layout Rules

- Phone is the design target: 375px wide, 812px tall.
- Use one centered column, `max-width: 48rem` on larger screens.
- Keep one primary filled button per screen.
- Minimum tap target is 44px for normal buttons.
- Long text wraps. No horizontal scroll.
- The hook has no progress bar.
- Answerable screens show a progress rail and `n/6`.
- Result and expectation screens are closure screens, not scored questions.
- Back and skip are text buttons. Skip is available during answerable checks,
  but not on the result or expectation screens.
- The expectation screen should keep its primary CTA findable on mobile while
  preserving readable explanations and 44px tap targets.

---

## Screen List

### 0. Hook

No progress bar. Use the cinnabar left rail.

```text
想把 AI 用顺一点

我不是已经
跟 AI 说清楚了吗？

它听起来像懂了，交回来的东西却还得你判断、返工，或者硬着头皮猜。

[用 3 分钟试一下]
```

Purpose: re-establish the AI-use promise after login, then recall a frustration
before the learner knows any product terms.
On mobile, the hook title must not create hanging punctuation or single-character
quote fragments, and the primary button should read as a button rather than a
wrapped paragraph.

### 1. Scenario Sentence

Progress `1/6`.

```text
最近一次我想让 AI 帮我做的事，是

[写一句就行，不用完整。]

(完成一个小代码任务)
(查资料并给我一个结论)
(整理一堆零散信息)
(改一段已经写好的话)
(把很长的东西压成摘要)

接下来会借用里面的一两个词，让小例子更像你的场景。别写隐私内容。

[继续]
返回                         跳过
```

The chips are examples and structured presets at the same time. They cover
classic AI work modes: executing a small code task, research, organizing,
rewriting, and summarizing. They fill the field, remain editable, and save only
the preset id as an event-safe signal. A skipped sentence must still lead to the
complete generic flow.

### 2–3. Routing

Progress `2/6` and `3/6`.

Ask only the two routing questions:

- `这件事如果它做错了，会怎么样？`
- `有没有过这种情况：同一件事你说了几次，它还是做不到你要的？`

Scores are internal. Do not print numbers or route labels.

### 4–6. Diagnostic

Progress `4/6` through `6/6`.

Keep the three axes and option semantics:

- evidence: "It says it's done."
- precheck: "You already told it this once."
- diff: "A summary of the changes looks reasonable."

`d1` and `d3` may show learner-derived slots. `d2` stays noun-free.

### 7. Result

No progress rail. This screen must satisfy the learner's "what did this tell
me?" expectation before it moves them into the course. Keep the screen skimmable:
one strong title, compact signals, and short revealed explanations. Do not let
the result become a report. Order matters:

1. Result kicker: `Your result` / `你的结果`
2. Small behavior badge for the deterministic level: `Building the frame`,
   `Everyday use`, or `Strong checks`
3. One concrete result title about the learner's next useful AI-checking move
4. One short paragraph explaining the level without overstating it
5. Card titled `Signals from your answers` / `为什么是这个结果`, with three
   compact signals from previous answers:
   - consequence if wrong
   - friction frequency
   - practice focus
6. Replay the learner's original line, or name the generic fallback, with one
   bridge sentence inside the same card
7. Course-value card: `Why computer basics help` / `为什么要学一点计算机基础`
8. Primary action to expectation check

Do not render route A/B/C. Do not label the learner.
Do not call the learner an "AI expert."
Do not add a standalone philosophy paragraph. The page should feel like a
reason to try lesson 1, not a mini-essay.
Do not add a copyable prompt here; it makes the flow feel finished and sends
the learner out of the app.

The result should make the learner think "using AI well needs a little more
structure than prompting," not "I just need one better prompt."

### 8. Expectations

No score or tally. Each true/false item should feel like boundary confirmation,
not a punishment. Correct answers use a positive visual state and explicitly
show the correct answer (`Answer: Yes/No` / `答案：对/不对`). Use false items to
remove misleading promises, and true items to preserve motivating expectations
that the course can honestly support.

Keep explanations short and reveal them only after a tap. The point is to let
the learner calibrate expectations through action, not to make them read four
policy paragraphs.

The summary card remains visible enough that a learner who does not tap every
item still understands:

- what this is
- what it is not
- what the learner needs to bring
