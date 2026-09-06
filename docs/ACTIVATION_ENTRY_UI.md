# Activation Entry v2 — UI handoff

Status: implemented on `/start` as of 2026-09-06.

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
- If a screen is not the first hook, show a progress rail and `n/8`.
- Back and skip are text buttons. Skip is available during answerable checks,
  but not on the result or expectation screens.
- The expectation screen should show its primary CTA in the first mobile
  viewport in both Chinese and English, while preserving 44px tap targets.

---

## Screen List

### 0. Hook

No progress bar. Use the cinnabar left rail.

```text
在决定要不要上之前

「我不是已经说得很清楚了吗？」

你说得越细，它越像听懂了。可它交回来的东西，还是不对。

[花 3 分钟，看看这门课适不适合你]
```

Purpose: recall a frustration before the learner knows any product terms.

### 1. Pain Mechanism

Progress `1/8`.

```text
哪一种时刻最像你遇到的卡点？

[说过的规则，它下次还是会忘。]
[它说完成了，但我验不出来。]
[改好一处，又弄乱另一处。]
[我怕它改没原来的东西。]
[我不知道什么能交给它。]

返回                         跳过，直接开始
```

This is the complete first-screen option set. Do not add more choices.

### 2-3. Stakes And Friction

Progress `2/8` and `3/8`.

Use four large option buttons per screen. Scores are internal and never shown.

### 4-6. Diagnostic Questions

Progress `4/8`, `5/8`, `6/8`.

Use the same option-card treatment. Machine speech or summaries use the dark
mono block. Human prose never uses the mono block.

### 7. Result

Progress `7/8`.

Structure:

1. Small kicker: `这件事背后的机制`
2. Accent quote block replaying the selected pain
3. Surface card naming the mechanism
4. One paragraph analogy
5. Prompt card: `今天先用这一句`
6. Primary button: `最后确认一下`
7. Secondary outline/text button: copy the prompt

Do not render route A/B/C. Do not tell the learner whether they are a good fit.

### 8. Expectations

Progress `8/8`.

Use a compact summary card followed by four divided true/false rows. The
primary CTA appears after the rows, in normal document flow:

```text
开始上课前

这门课是什么
不打分，只先说清边界。

简单说
它教你判断 AI 交回来的东西靠不靠谱。
它不是认证课、编程训练营，也不是职业定制课。
适合已经在用 AI 做要紧事情，或愿意先试一节的人。

[claim]       [对] [不对]
[claim]       [对] [不对]
[claim]       [对] [不对]
[claim]       [对] [不对]

[进入第一课]
返回
```

Avoid a sticky footer here. It can hide the true/false buttons on mobile.

---

## Verification Checklist

- Chinese mobile 375x812: no horizontal scroll; final CTA visible on screen 8.
- English mobile 375x812: no horizontal scroll; final CTA visible on screen 8.
- Desktop: centered column still feels intentional, not underfilled.
- Progress shows `1/8` through `8/8` after the hook.
- Every MCQ set has five options or fewer.
- No learner-facing route label or "not for you" copy exists.
- `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass.
