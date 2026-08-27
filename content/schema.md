# Content Format Spec

Course content is the Tier-0 static spine (DESIGN.md §5): versioned JSON in
this directory, validated at build time (`npm run validate:content`), shipped
with each deploy. The database never stores content — only learner state.

## Layout

```
content/stage-<n>/module-<nn>/module.json
content/stage-<n>/module-<nn>/lesson-<nn>.json
```

New files must be registered in `src/lib/content.ts` (static imports).

## module.json

```jsonc
{
  "id": "m01",            // ^m\d\d$
  "stage": 1,
  "order": 1,
  "title_en": "…", "title_zh": "…",
  "description_en": "…", "description_zh": "…",
  "refs": []               // external links (CS50 etc.), optional
}
```

## lesson-<nn>.json

```jsonc
{
  "id": "m01-l01",        // ^m\d\d-l\d\d$
  "module_id": "m01",
  "order": 1,
  "format": "reading",     // reading | drill | code | scenario
  "tag": "core",           // core | elective  (core is never auto-removed)
  "est_minutes": 12,       // whole lesson; validator enforces ≤ 30
  "title_en": "…", "title_zh": "…",
  "blocks": [ … ],         // rendered in order
  "exercises": [ … ]       // referenced from blocks by id
}
```

### Blocks

- `{"type": "reading", "body_en": md, "body_zh": md}` — short prose, markdown.
- `{"type": "concept", "term": "source code", "term_zh": "源代码",
   "anchor_en": …, "anchor_zh": …, "explain_en": …, "explain_zh": …}` —
  one new concept. **`anchor` is mandatory** (decision 2026-08-26): an analogy
  or a contrast to something the learner already knows. A break-point note
  goes inside `explain` only when the analogy predictably misleads and the
  correction uses already-taught concepts.
- `{"type": "exercise", "ref": "m01-l01-e01"}` — plays the exercise inline.

### Exercises

Common fields: `id` (`<lesson>-e\d\d`), `type`, `prompt_en/zh`,
`explain_en/zh` (shown after answering — why the right answer is right),
`difficulty` (1–3), `xp_value`.

- `mcq`: `options_en: []`, `options_zh: []` (same length/order), `answer`
  (index).
- `fill_in`: `answer_spec: {"accept": ["…"], "regex": "…"?, "ignore_case":
  true?}` — deterministic match, instant verdict.
- `drag_order` (later): `items_en/zh: []`, `answer: [indices]`. Tap-to-order
  on touch.
- `code` (later): `answer_spec: {"tests": […]}` run in Pyodide.

## Language rules

Every learner-facing field exists as `_en` and `_zh`. Chinese text keeps
technical terms in English where that is how practitioners speak (决定
2026-08-26: that is not "mixing"). Neither side is a translation of the
other — write each to be natural.

## XP

Correct on first attempt: full `xp_value`. Correct after a wrong try: half
(rounded down). Re-doing a completed exercise: zero (no grinding).
