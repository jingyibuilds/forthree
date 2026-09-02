# Visual Quality

Use this reference when changing For Three UI, navigation, learning surfaces,
lesson players, code exercises, onboarding, mobile layouts, or visual copy.

## North Star

For Three should feel like a refined learning tool: literate, calm, warm, and
decisive. It should not feel like a generic AI chat product, a dashboard skin,
or a motivational landing page.

## Procedure

1. Start with the learner state and primary action.
2. Sketch the smallest real screen, preferably mobile first.
3. Work in hierarchy first: spacing, weight, contrast, then color.
4. Build the actual UI, then verify desktop and mobile.
5. Inspect the page for visual noise, text overflow, and unclear actions.

## For Three Visual Rules

- Use the existing "zhu pi" direction: porcelain paper ground, ink text,
  peacock-teal actions, cinnabar teacher emphasis.
- Use calm density. A learning/product app can be compact if the next action
  is unmistakable.
- Keep cards for repeated items, tools, and modals. Do not nest cards inside
  cards or make page sections look like floating cards.
- Favor small, stable radii. Cards should usually be 8px radius or less unless
  the existing component requires otherwise.
- Never use decorative gradient orbs, bokeh blobs, glassmorphism, purple-blue
  AI gradients, or generic futuristic effects.
- Do not write visible instructional text explaining the UI controls. Controls
  should be understandable through placement, labels, icons, and state.
- Use icons for tool actions when a common symbol exists. Use text buttons for
  commands whose wording matters.
- Reserve hero-scale type for true heroes. Inside lesson panels, maps, and
  compact controls, use smaller headings and tighter rhythm.
- Keep letter spacing at 0, especially for Chinese.

## Hierarchy Rules

- There should be one primary action per screen or state.
- Primary actions are solid and high contrast. Secondary actions are quieter.
  Tertiary actions behave like links.
- De-emphasize competing material before making the primary element louder.
- Prefer three text strengths: primary ink, secondary ink-grey, tertiary muted
  text that still passes contrast.
- Put more space around a group than within it. Ambiguous grouping is a product
  bug because the learner cannot tell what belongs together.
- Use labels only where scanning depends on the label. Otherwise fold meaning
  into the value or surrounding context.

## System Scales

Use constrained scales. Avoid one-off values.

- Spacing/sizing: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128`.
- Type: `12, 14, 16, 18, 20, 24, 30, 36, 48`.
- Font weights: normal UI text at `400` or `500`; emphasis at `600` or `700`.
- Shadows: use sparingly and consistently; raised controls, dropdowns, and
  modals should read as different elevations.
- Contrast: normal text should meet 4.5:1; functional borders should meet 3:1
  when the border is the only visible control boundary.

## Mobile Checks

- The next action should sit where a thumb can reach it, or remain obvious
  after scrolling.
- A learner should be able to continue, submit, go back, switch locale, and
  recover from an error without hunting.
- Avoid horizontally scrolling primary learning content.
- Do not let badges, source labels, or long bilingual strings push controls out
  of view.
- Stable dimensions matter for boards, drills, answer choices, toolbars, code
  panes, and counters. State changes must not resize the layout unexpectedly.

## Lesson UI Checks

- Every screen should answer one question: what should the learner understand
  or do now?
- "Why this matters" belongs near the action or mistake, not as repeated page
  preamble.
- Incorrect-answer feedback should identify the mistaken mental model, not only
  say which option was right.
- AI feedback, when present, should feel like margin notes or next-step hints,
  not a separate chatbot competing with the lesson.
- Loading states for Pyodide should teach what is happening in one short line
  and offer a useful skeleton or tip.

## Anti-Patterns

- Syllabus-first pages that bury "continue learning".
- Decorative cards for non-interactive text.
- Long paragraphs repeating the same promise.
- Grey text on colored backgrounds.
- Color as the only success/error signal.
- UI that looks fine on desktop but makes mobile learner actions vague.
