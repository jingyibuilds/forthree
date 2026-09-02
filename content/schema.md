# Content Format Spec

Course content is the Tier-0 static spine (DESIGN.md §5): versioned JSON in
this directory, validated at build time (`npm run validate:content`), shipped
with each deploy. The database never stores content — only learner state.

Language standard: rigorous, vivid, concise, clear. Do not pad time with prose.
Cut repetition, then add interaction or transfer practice when a lesson feels
thin.

## Layout

```
content/stage-<n>/module-<nn>/module.json
content/stage-<n>/module-<nn>/lesson-<nn>.json
```

New files must be registered in `src/lib/content.ts` (static imports).

## stages.json

```jsonc
{
  "course_title_en": "…", "course_title_zh": "…",
  "course_promise_en": "…", "course_promise_zh": "…",
  "course_sources": [
    {
      "name": "MIT 6.100L",
      "url": "https://…",
      "focus_en": "computational thinking",
      "focus_zh": "计算思维",
      "reviewed_on": "2026-08-30",
      "fit_en": "why this source belongs in the course-level provenance list",
      "fit_zh": "为什么这个来源适合出现在课程级参考列表里"
    }
  ],
  "stages": []
}
```

`course_sources` is for public curriculum influences. Link out; do not copy
their prose, problem text, or licensed assets. A course-level source says "this
tradition influenced the course"; it is not enough evidence to place a
lesson-level resource. Lesson placement needs the stricter `resources` review
below.

## module.json

```jsonc
{
  "id": "m01",            // ^m\d\d$
  "stage": 1,
  "order": 1,
  "title_en": "…", "title_zh": "…",
  "description_en": "…", "description_zh": "…",
  "capability_en": "…", "capability_zh": "…", // optional: what the learner can now do, not what they have heard about
  "refusal_en": "…", "refusal_zh": "…", // optional: what the learner can now pause, challenge, or refuse
  "capability_moves_en": ["…"], "capability_moves_zh": ["…"], // optional: 2-4 short UI chips for the module's main moves
  "customization_points": [] // optional: anchors/examples/terms safe to rewrite for a different learner profile
}
```

Modules do not carry bare external links. Course-level provenance belongs in
`stages.json` `course_sources`; lesson-level resources belong in lesson
`resources` after the stricter review below.

`refusal_en/zh` names a concrete boundary the learner can now hold. It should
read like a practical sentence, not a defensive slogan: "a delivery with no
checkable evidence", "a plan with no acceptance standard", "a design proposal
whose tradeoff has not been named." This field helps keep modules capability-
shaped instead of term-shaped.

`capability_moves_en/zh` are short labels for the course-map chips. Keep them
action-oriented and specific to the module. Do not let future modules inherit
M1's "what changed / what ran / what is risky" wording unless those are still
the actual moves being trained.

## lesson-<nn>.json

```jsonc
{
  "id": "m01-l01",        // ^m\d\d-l\d\d$
  "module_id": "m01",
  "order": 1,
  "format": "reading",     // reading | drill | code | scenario
  "tag": "core",           // core | elective  (core is never auto-removed)
  "est_minutes": 8,        // whole lesson; validator enforces ≤ 10 in Phase 1
  "title_en": "…", "title_zh": "…",
  "outcome_en": "…", "outcome_zh": "…", // optional: concrete ability after this lesson
  "resources": [
    {
      "title_en": "…", "title_zh": "…",
      "source": "MIT Missing Semester",
      "url": "https://…",
      "est_minutes": 6,
      "placement": "optional",
      "reviewed_on": "2026-08-30",
      "fit_en": "why this exact page belongs here",
      "fit_zh": "为什么这个页面正好适合放在这里",
      "note_en": "optional reference", "note_zh": "可选参考"
    }
  ],
  "review_tags": [],       // optional: e.g. ["must_master", "recognize_only", "profile_anchor:data"]
  "blocks": [ … ],         // rendered in order
  "exercises": [ … ]       // referenced from blocks by id
}
```

`resources` are reviewed external references that open on the original site.
Do not add one because the source is generally good. Add it only after reading
the linked page/video, deciding the exact lesson/block where it belongs, and
recording why it fits. `placement` is usually `optional`; `required` needs a
separate return-path and completion-design review. Reference minutes are shown
separately from required lesson time. Link out; do not embed videos,
screenshots, long excerpts, problem statements, or course assets unless the
license and attribution have been checked for that exact use.

### Blocks

- `{"type": "reading", "body_en": md, "body_zh": md}` — short prose, markdown.
- `{"type": "concept", "term": "source code", "term_zh": "源代码",
   "anchor_en": …, "anchor_zh": …, "explain_en": …, "explain_zh": …}` —
  one new concept. **`anchor` is mandatory** (decision 2026-08-26): an analogy
  or a contrast to something the learner already knows. A break-point note
  goes inside `explain` only when the analogy predictably misleads and the
  correction uses already-taught concepts.
- `{"type": "visual", "kind": "terminal-command", "title_en": …,
   "title_zh": …, "caption_en": …, "caption_zh": …, "alt_en": …,
   "alt_zh": …}` — a concept-bearing illustration, not decoration. Current
  allowed kinds: `cs-scope-map`, `source-code-file`, `terminal-command`,
  `agent-command-log`, `pseudocode-vs-code`, `failure-stage`, `python-output`. Use this when a new learner benefits
  from seeing the shape of an artifact: a code file, terminal, output,
  traceback, folder tree, or similar. Captions must state the learning point in
  the same language standard as prose. Do not rely on desktop-only spatial
  wording such as "left/right" when a responsive layout may stack on mobile;
  refer to labels, file names, or window titles instead.
- `{"type": "exercise", "ref": "m01-l01-e01"}` — plays the exercise inline.

### Exercises

Common fields: `id` (`<lesson>-e\d\d`), `type`, `prompt_en/zh`,
`explain_en/zh` (shown after answering — why the right answer is right),
`difficulty` (1–3), `xp_value`.

- `mcq`: `options_en: []`, `options_zh: []` (same length/order), `answer`
  (index).
- `fill_in`: `answer_spec: {"accept": ["…"], "regex": "…"?, "ignore_case":
  true?}` — deterministic match, instant verdict. `accept` must include
  reasonable synonym variants; in zh mode, accept Chinese answers too —
  **unless** `"term_drill": true`, which deliberately requires the English
  term (agent transcripts are English) and is badged as such in the player.
- `drag_order`: `items_en/zh: []`, `answer: [indices]`. Tap-to-order on
  touch; mouse users can also click items into the chosen order.
- `code` (later): `answer_spec: {"tests": […]}` run in Pyodide.

Optional on any exercise: `advanced: true` marks a transfer prompt shown with
the "Advanced question / 举一反三" badge. These should ask the learner to apply
the idea in a new terminal log, agent transcript, pseudocode plan, or realistic
work scenario rather than repeat the definition.

## Language rules

Every learner-facing field exists as `_en` and `_zh`. Neither side is a
translation of the other — write each to be natural.

### Bilingual editorial standard (2026-08-30)

The English and Chinese versions do not need word-by-word or phrase-by-phrase
alignment. They need shared intent, shared technical meaning, and native
reader trust. Edit as a bilingual professor would: preserve accuracy and
faithfulness first, then make each language elegant in its own idiom. If a
literal translation sounds stiff, suspicious, or copyright-adjacent, rewrite
the sentence from the learner's purpose rather than from the other language's
syntax.

### 中文版交付标准 (hard requirement, 2026-08-27)

**Target reader: a mainland-China learner with CET-4/6 general English who
does NOT know English technical nouns.** The Chinese version is for them —
not for a bilingual engineer. Concretely:

1. **Chinese must carry the meaning by itself.** A reader who skips every
   English word must still understand the sentence completely. English is a
   *label attached to* an idea the Chinese already delivered, never the
   carrier of it.
2. **Gloss on first appearance, in every lesson:** `构建 (build)`,
   `运行时 (runtime)`, `bug(代码里的错误)`. Chinese first when the concept
   is new; English first only when the English string is itself the artifact
   being taught (a command, an error message).
3. **Quoted agent/tool output stays in English** — it's a real artifact and
   the learner must recognize it — but every quote is followed immediately
   by a Chinese gloss: `"the build failed"(构建失败)`.
4. **`term_drill` exercises still require the English answer** (that's the
   point), but the Chinese prompt must make the *concept* unambiguous
   without the English — the learner should know which idea is being asked
   about, and only be recalling its English name.
5. **No bare English nouns in Chinese prose.** `traceback` → `traceback
   (报错追踪信息)`. Exceptions, because they're already everyday Chinese:
   `app`, `SQL`, `Python`, `AI`, `agent`.

Failing this standard makes the Chinese version a fake — it looks Chinese
but still requires the English the learner came here to acquire.

## Personalization without rewriting the course

The first course version is personal, but it must not become unscalable. Use a
stable core plus marked variation points:

- `must_master` — a concept the learner must be able to use or judge later.
- `recognize_only` — a term that may appear because of the learner's work
  context, but does not need full mastery yet. The copy should say so.
- `later_formalize` — a word or idea introduced lightly now and taught
  formally in a later module.
- `profile_anchor:<domain>` — an example chosen because the current learner
  has that background, such as data work or AI-agent workflows. For another
  learner, rewrite the example, not the whole lesson.

When scaling to new users, preserve the lesson's concept spine, exercise
intent, and module capability. Rewrite only marked anchors, examples, and
glosses that depend on a learner profile.

## Learned terms stop being treated as brand-new forever

Beginner-friendliness is stage-aware. A term needs a full Chinese explanation
the first time it appears in a lesson, and it may need a reminder for the next
few lessons. After the learner has practiced it in both directions and passed a
checkpoint using it, future lessons may use the term normally, with tooltip or
AI-assistant help available on demand. Do not keep re-explaining foundational
words forever; that makes the course feel like it does not trust the learner.

## Lesson-level optional fields

- `why_en` / `why_zh` — one-sentence design rationale shown at lesson start
  ("why this lesson, why now"). Both languages or neither.
- `outcome_en` / `outcome_zh` — one sentence stating the concrete ability the
  learner should have after the lesson.
- (future) `source_refs` — provenance footnote when a lesson's design
  clearly derives from a public course (e.g. a CS50 week).

## The 哑巴语 rule (bidirectional knowledge)

Named for the Duolingo failure the owner described: you learn to *ask* for
directions but can't *understand* the answer. Every term and concept must
eventually be exercised in **both directions** — produce it (fill-in, write)
*and* recognize it in the wild (spot it in a real transcript, traceback, or
doc). One-directional knowledge doesn't count as learned; module checkpoint
quizzes should mix directions deliberately.

## XP

Correct on first attempt: full `xp_value`. Correct after a wrong try: half
(rounded down). Re-doing a completed exercise: zero (no grinding).
