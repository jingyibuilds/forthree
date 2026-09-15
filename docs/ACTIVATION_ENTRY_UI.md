# Activation Entry v5 — UI handoff

Status: implemented on `/start` as of 2026-09-14.

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
- Result and expectation CTAs should sit in the content flow, not fixed over
  mobile content. The learner must see the course-value bridge before the exit
  action competes for attention.
- Back and skip are text buttons. Skip is available during answerable checks,
  but not on the result or expectation screens.
- The expectation screen should keep its primary CTA findable on mobile while
  preserving readable explanations and 44px tap targets.

---

## Screen List

### 0. Hook

No progress bar. Use the cinnabar left rail.

```text
先做个 3 分钟小检查

AI 交回来的东西
你通常怎么判断？

不用准备，也不打分。选几个日常情境，看看这门课会在哪一步帮你把 AI 用得更稳。

[开始小检查]
```

Purpose: re-establish the AI-use promise after login, then recall a frustration
before the learner knows any product terms.
On mobile, the hook title must not create hanging punctuation or single-character
quote fragments, and the primary button should read as a button rather than a
wrapped paragraph.
The English hook must also be hand-set. Do not let the browser wrap the headline
into weak helper-word fragments such as `how do / you judge it`; inspect the
375px mobile viewport before approval.

### 1. Task Choice

Progress `1/6`.

```text
先从日常用法开始
选一个最接近的任务。

[写一段小代码，或改个 bug]
[查资料、找论文，整理结论]
[做一张图或一页展示稿]
[安排提醒，或处理一件重复的小事]
[把零散想法整理成文字]

返回
```

The choices are structured presets, not a blank question. They cover classic AI
work modes: a small code task, research/sources, visual generation, reminders
or small automation, and turning messy thoughts/material into writing. Tapping
a choice moves forward immediately and saves only the preset id as an
event-safe signal. There is no generic-example button on this screen.

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
- precheck: "Before AI starts."
- diff: "A summary of the changes looks reasonable."

`d1` and `d3` may show preset-derived task/artifact words. `d2` stays noun-free.

### 7. Result

No progress rail. This screen must satisfy the learner's "what did this tell
me?" expectation before it moves them into the course. Keep the screen skimmable:
one strong title, compact signals, and short revealed explanations. Do not let
the result become a report. Order matters:

1. Result kicker: `Your result` / `你的结果`
2. Small behavior badge for the deterministic level: `Handoff first`,
   `Already using AI`, or `Strong checks`
3. One concrete result title about the learner's next useful AI-checking move
4. One short paragraph explaining the level without overstating it
5. Replay the chosen task family, or name the generic fallback, with one
   bridge sentence inside the same card
6. Card titled `Your answers point to` / `刚才的几个判断指向`, with three
   compact signals from previous answers:
   - consequence if wrong
   - friction frequency
   - practice focus
7. Course-value card: `Why computer basics help` / `为什么这里会讲一点计算机基础`
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
