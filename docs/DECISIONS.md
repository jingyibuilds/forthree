# Decision Log

Amendments to [DESIGN.md](./DESIGN.md) (v1.1). The design doc is the baseline;
this file records every fork taken since, newest first. Capture the fork, not
just the outcome: what was considered, what was rejected, why.

---

## 2026-09-16 — Part 1 needs course-architecture correction before more authoring

Owner testing through Lesson 8 found a serious course-quality mismatch: lessons
declared 7-10 minutes but often took 1-3 minutes, MCQs had one obvious answer
and several irrelevant distractors, and the whole Part 1 experience felt closer
to a polished glossary than a course worth a dedicated app. The owner also
challenged whether public-course research and AI-era vocabulary were actually
changing the curriculum, or only decorating it.

Review-panel finding: M1's concept spine is directionally right — source vs.
run, command vs. output, folder context, pseudocode, claim/evidence, output, and
side effects are good early moves for judging AI-agent work. The failure is the
unit of learning and assessment rigor. The current micro-lesson pattern must not
be used as the template for the rest of Part 1.

Resolution: revise the course architecture before batch-authoring more lessons.
A learner-facing session should be 15-30 minutes and may bundle several short
cards, but it must include meaningful practice: plausible distractors,
bidirectional term use, ordering/tracing tasks, messy transcript judgment, and a
checkpoint or lab that requires synthesizing what happened, what evidence is
missing, what may have changed, and what to ask next. Timing is active effort,
not seat time, and estimates must be recalibrated from observed completion.

Part 1 is reframed as "read, question, and verify AI-agent work" using
terminal/Python basics as the medium. Pull a thin `recognize_only` slice of
agent-workflow vocabulary earlier when it explains real incidents: workspace,
repo, branch, diff, changed files, build, test, lint, dependency/install, env
var, secret, backup/rollback, and residual risk. Do not teach the full Git,
deployment, or LLM-infra taxonomy here; those stay formalized later. Public
courses should influence sequencing, problem density, labs, and mastery bars,
not become passive linked homework or copied content.

Immediate implication: before M1 is accepted and before M2-M4 are authored,
upgrade M1 into a stronger vertical slice with realistic agent transcripts,
plausible wrong answers, a required transcript-reading lab, and a no-hint
checkpoint that proves the module capability.

---

## 2026-09-14 — Start hook typography is an approval gate

Owner review found that the English `/start` hook passed broad taste review but
still looked weak on mobile because the headline wrapped as browser leftovers:
`When AI / hands work / back, how do / you judge it`. This is not merely copy; a
flagship first screen loses trust when typography looks accidental.

Resolution: the English hook now uses a shorter, more lived sentence, "When AI
says it's done, how do you know?", and is hand-set into three mobile lines. The
UI spec and Taste Signature Reviewer now require explicit mobile headline
line-break inspection before approval.

---

## 2026-09-14 — Activation v5 widens everyday AI task presets

Owner review found that v4's first task choice still overfit text-work
categories: research, organizing, rewriting, and summarizing felt like several
versions of homework rather than genuinely different everyday AI uses. The hook
also moved too abruptly from "use AI better" to a CTA without making clear that
the learner was about to take a small, low-pressure check.

Resolution: `/start` now opens with an explicit three-minute check frame: no
prep, no score, a few everyday situations, and a first signal of where the
course can help the learner use AI with steadier judgment. The first answerable
screen keeps five options, but they now cover broader AI task families: small
code work, research/sources or papers, visual generation, reminders or small
automation, and turning messy notes into writing. The generic-example escape
hatch is removed because the five choices should be broad enough to choose from
without extra explanation. Do not repeat "Ask AI to..." / "让 AI..." in every
option; the question already names AI, and option labels should read like lived
tasks. The precheck diagnostic copy now says "Before AI starts" rather than
"Before AI starts changing things," so non-editing tasks still fit.

Chinese copy rule: distinguish "I can notice immediately and do it myself" from
"I only notice several steps later and must redo a larger chunk." Do not
collapse both into "重做/返工"; the timing difference is the learner signal.

---

## 2026-09-14 — PM synthesis owns low-ROI kill decisions

Owner review identified a process gap during the activation LLM discussion:
the agent team can keep improving a feature even after the product signal says
it is stiff, generic, expensive, or not worth its learner gain. That creates
polished product debt. A weak runtime personalization layer, for example, can
feel worse than an honest authored choice if it only partially uses the
learner's input.

Resolution: For Three's learner-facing workflow now includes an explicit
capability ROI triage before polish and a PM synthesis disposition before final
delivery. Risky features must be assigned one path: ship, revise now, keep
dev-only, defer with priority, kill from the main path, or ask the owner for the
fork. Removal is an acceptable product decision when the current version weakens
the flow more than it helps. This does not block future experiments; it prevents
half-working features from quietly becoming the primary learner experience.

---

## 2026-09-14 — Activation v4 is preset-first and no-LLM on the main path

Owner review found two activation failures on `/start`: switching language in
the middle of the flow reset progress, and the free-form scenario sentence
created a personalization promise the product did not fulfill. The LLM slot
extraction reused only a few words, making the result feel half-tailored and
half-template. The Chinese result copy also exposed translated-English wording
such as "fixed places to look" rendered as unnatural Chinese.

Resolution: `/start` now stores in-progress answers in browser session storage
so language switching preserves the current step. The `fresh=1` reset marker is
consumed after the initial local cleanup so a later locale bounce cannot replay
the reset. The first answerable screen is no longer an open sentence; it is a
preset task choice: code task, research, organizing, rewriting, or summarizing,
with a generic path still available. Diagnostic examples and result bridge copy
are authored per preset. The start path no longer calls `/api/llm` for
activation scenario extraction, and `activation_v2.version` advances to 4.

Product rule: first-run personalization must not be a shallow LLM wrapper. If
the app asks for personal input, the later screen must clearly use it at the
same specificity. Otherwise prefer authored choices and stronger flow.
Chinese first-run copy now requires a native Chinese copy gate, not only a
bilingual translation check.

## 2026-09-13 — Done includes a housekeeper pass

Owner review identified a workflow risk: fast, fine-grained iteration can leave
many dirty files, duplicate helpers, stale preview routes, or half-integrated
changes behind. Passing product review is not enough if the repo becomes harder
for the next agent to understand.

Resolution: multi-file or long-running work now ends with a housekeeper pass.
The pass maps dirty files by ownership, removes scraps introduced during the
current task, checks docs/code consistency, runs validation and
`git diff --check`, and stages only a coherent commit slice. It must not revert
unrelated owner/user changes merely to make the tree clean. A dedicated
Housekeeper Reviewer card now lives in `docs/reviewers/`.

## 2026-09-13 — Activation result personalization stays bounded

Owner testing found that the result page could still feel formulaic even after
the scenario sentence was replayed. Phrases such as "everyday use," "next
jump," or "when tasks get messy" created small context gaps, and the same bridge
sentence felt too generic across examples like writing a novel scene versus a
small code task.

Resolution: the result page now uses clearer readiness language and a
deterministic scenario-family bridge. Code, research, organizing, writing, and
summary examples each receive a short tailored result sentence. This improves
continuity without letting the LLM decide the diagnosis, route, score, or
course handoff.

LLM personalization remains a possible future layer, but only as optional
micro-copy: one short sentence that connects the learner's own words to the
already-determined result. It must have strict JSON/schema validation, a short
timeout, cost logging, local fallback, and no authority to change the result or
write broad coaching prose.

## 2026-09-13 — Education flow uses interaction before prose

Owner review found that even accurate activation copy can become too text-heavy
for an education product. Learners often do not read long explanatory blocks,
especially in short daily-learning or check-in style products. Reducing text by
splitting it into many more screens is not automatically better; too many steps
can make a three-minute flow feel endless.

Resolution: learner-facing education surfaces now need a text budget. Before
adding prose, use interaction, choices, examples, compact visual rhythm,
symbols, and progressive reveal where they can carry the same meaning. If a
screen needs many sentences, ask whether the idea should be practiced,
represented visually, delayed, or removed. Reviewers now check reading load and
must not approve a flow that is clear only because the learner read several
paragraphs.

## 2026-09-13 — Expectation checks preserve motivating ambition

Owner review found that answering "No" to "By the end, I should be able to
build a product" lowered the activation energy too much. The intent of the
expectation screen is not to tell learners they will get nothing; it is to set
honest boundaries while preserving the motivating promise that they can use AI
to achieve more.

Resolution: the product-building expectation is now a positive, narrower claim:
by the end, the learner should have a stronger foundation for using AI to build
something real. The answer is true, with copy clarifying that AI may still do
much of the hands-on building while the course improves the learner's judgment:
what to hand off, how to check it, and which steps cannot be taken back.

## 2026-09-13 — First-run work centers using AI better and signature taste

Owner review reframed the activation problem as larger than a dangling phrase
on `/start`. The target learner is not primarily buying "learn CS"; many arrive
because they want to use AI better and only later discover that a little
computer/engineering structure is the durable way to judge AI work. The funnel
must therefore lead with AI-use improvement, then introduce CS as the method,
not the assumed desire.

The same review identified "AI-template taste" as an activation cost. UI and
copy that look like common Codex/Claude-generated SaaS patterns cause users to
skim before they engage. For Three should seek a stable, memorable 20% outside
mainstream defaults: not quirky for its own sake, but specific enough to become
a durable product signature.

Resolution: add three durable review roles: New User Activation Reviewer,
Taste Signature Reviewer, and PM Synthesis Reviewer. First-run funnel work now
requires a cold-start psychological map, subtle repeated signals instead of
repeated slogans, an anti-template taste check, and PM synthesis of reviewer
conflicts before final delivery. The operating loop is captured in
`docs/PRODUCT_WORKFLOW.md`, and the review board now treats these gates as
operational rather than decorative.

## 2026-09-12 — Activation result must return a diagnosis

Owner testing found that the activation checks were successfully reminding
learners of real AI pain, but the result still under-delivered on the testing
promise. After several choices, learners expected to know what had been
measured. A pure mechanism handoff made the flow feel like a template attached
after a quiz.

Resolution: the result screen now starts with a deterministic, non-personality
diagnosis of `AI task judgment`: `starting`, `everyday`, or `mature`, based on
the three diagnostic axes. It also shows three compact signals from the
preceding answers: consequence if wrong, friction frequency, and the practice
focus. The result must stay modest and operational; do not call learners "AI
experts" or imply credentialed skill. The mechanism/CS bridge remains, but it
supports the diagnosis instead of replacing it.

## 2026-09-12 — Scenario chips are structured task presets

Owner review of the scenario sentence step found that the chip interaction
works well, but the example set was too thin and too random. Because many
learners will choose a chip instead of typing from scratch, the chips should
serve two jobs: lower input friction and provide an early, event-safe signal of
what kind of AI work the learner is trying to hand off.

Resolution: the scenario chips are now a five-item task-preset set, capped at
five options: `code_task`, `research`, `organize`, `rewrite`, and `summarize`.
They are examples, not occupational categories. Clicking a chip still fills an
editable sentence, but it also records `scenario_preset` in
`activation_v2` and event properties. Free-form learner text remains excluded
from `app_events`.

## 2026-09-12 — Activation result screen is an operational handoff

Owner review of the restored scenario-first `/start` found that the result
screen still felt scattered: it mixed the result, the learner's sentence,
engineering vocabulary, course philosophy, and a reusable prompt without making
the connection to the preceding questions obvious. The Chinese copy also read
too translated.

Resolution: the result screen has one job. It is the activation turn, not a
test report. It should make the learner feel that the course starts from a
failure they recognize: not being able to inspect, set boundaries, or see what
changed when AI hands work back. It replays the learner's own sentence as the
original line, gives one short bridge sentence, and connects the needed
inspection ability to why learning a little CS is useful. Broad philosophy
paragraphs belong in lessons, not this transition screen. A copyable prompt or
"try this today" block makes the flow feel finished and should not appear here.
The mechanism sentence must be aligned to the scored diagnostic axis; extracted
`pain_type` can remain an internal signal, but it cannot personalize the result
into a different mechanism.

## 2026-09-12 — Activation returns to learner-scenario slot filling

Owner review found that the 2026-09-06 implementation over-corrected the
activation entry. It removed the earlier sentence-first version that let a
learner bring in their own AI-use scene, leaving only a fixed five-option pain
mechanism page. That made the diagnostic deterministic, but it also recreated
the original relevance failure: the examples could still feel like someone
else's work before the learner had a chance to recognize their own.

Resolution: `/start` starts from one skippable sentence completion again:
"The last thing I wanted AI to do for me was..." / "最近一次我想让 AI 帮我做的事，是..."
The sentence is replayed on the result screen and used to fill at most two
short slots in the diagnostic examples: `task` and `artifact`. The app first
uses a local deterministic fallback so the flow never waits on a model. When
available, `/api/llm` supports `feature: "activation_scenario"` and may extract
`task`, `artifact`, `role_context`, and `pain_type` as strict JSON. The LLM
must not write learner-facing sentences, grade answers, route the learner, or
decide whether the learner should continue.

Routes A/B/C remain internal product signals, preserving the 2026-09-06 choice
to remove learner-facing Exit C. Every route can continue into Lesson 0. The
main record stays in `learner_profiles.background.activation_v2`, now with
`version: 3`, `verbatim`, `slots`, optional `role_context`, optional
`pain_type`, deterministic stakes/friction route, diagnostic axes, answers,
and expectations. Free-form learner text must not enter `app_events`.

## 2026-09-11 — Authenticated learning routes must stay findable and actionable

Owner testing found three connected navigation failures after login: test
accounts did not reliably restart from the new-user path on each login,
onboarding/profile inputs disappeared after authentication, and the course map
split an unclickable "course arc" from the actual lesson list. That made the
authenticated app feel like a dead-end dashboard instead of a learning path.

Resolution: `/start` remains an authenticated first-run route, not a public
landing-page destination. Public landing should send visitors to login; after
magic-link confirmation, allowlisted test accounts reset learner-owned app
state server-side and land on `/start?fresh=1`. Manual test reset uses the same
server helper. The course page exposes the onboarding/profile surface as a
normal signed-in action, and the full route folds course arc and lessons into
one actionable map: released modules show clickable lesson rows; unreleased
stages show `Coming soon` / `敬请期待` in the same route structure.

Local UI review of authenticated surfaces must not require live Supabase auth.
For the course overview, `/dev/course` exists in development only and redirects
to the real course page with `?preview=1`; production ignores the preview flag
and keeps the normal auth gate. Use this for visual review, and reserve
Supabase-backed sessions for validating the real auth/data path.

Local fresh-account testing should also avoid live Supabase when the goal is
product flow, not auth verification. `/dev/test-account` now exists in
development only; it sets a local dev session cookie, resets the local learner
state to `fresh`, and enters `/start?fresh=1` without sending email or calling
Supabase. The local session can advance through activation, onboarding, course
overview, lessons, and a no-op `/api/progress` response; production ignores
these cookies and keeps the Supabase path as the only real auth path.

---

## 2026-09-11 — UI review gates are operational, not decorative

Owner review of the mobile landing page found that the previous UI review
standard was too aesthetic and too easy to satisfy from a desktop impression:
the English headline created an orphan word on phone, the proof/source block
appeared before the CTA, and the English copy felt heavier than the Chinese
surface. The deeper failure was process: build principles and reviewer
criteria were not the same executable checklist.

Resolution: learner-facing UI now uses an operational build/fix loop. When the
owner says "开始build" or "开始fix", the agent first decides whether new feedback
should update reviewer cards, product goals, or principles; then plans; checks
the plan against the product standards; executes; runs the review panel;
accepts or rejects each review note with rationale; implements accepted
improvements; and repeats until there are no blocking to-dos. Interaction
review must cite viewport evidence, separately pass English and Chinese, and
treat first-viewport action, copy budget, line integrity, and action hierarchy
as hard gates rather than decorative preferences.

---

## 2026-09-06 — Activation evaluation ends with a named result

Second-round testing showed that the activation flow now succeeds at reminding
learners of real AI pain, but the result screen still failed its job: learners
could feel the pain and still not know "what was measured." A result screen
that mostly explains the underlying mechanism is too easy to miss in a
three-minute onboarding flow.

Resolution: after the three diagnostic questions, Step 7 must begin with a
plain result sentence. The visible conclusion is one of three deterministic
practice signals: verification, context setup, or change control. The learner's
chosen pain is replayed as supporting context, not as the conclusion. Route
A/B/C remains internal and does not appear as a learner-facing result.

The final expectation check is also reframed from correction to boundary
confirmation. If the learner selects the correct answer, the feedback says so
directly (`Correct. Answer: No.` / `你判断对了。答案：不对。`). If they select the
wrong answer, the feedback shows the correct answer and explains the course
boundary in neutral language. Correct answers must not use a visual treatment
that feels like an error state.

---

## 2026-09-06 — Default first-run language is English

New visitors with no `locale` cookie should see English first. Chinese remains
available through the locale toggle and is still a fully authored product
surface, but fallback language now defaults to `en` instead of `zh`.

This applies to `getLocale()`, auth-created first-run profile defaults, database
fallbacks for new learner profiles and assistant threads, and the optional
onboarding form's default language preference. Existing browsers with a
`locale=zh` cookie keep Chinese until the learner changes the toggle.

---

## 2026-09-06 — Activation starts from pain mechanism, not an open sentence

Owner reconsidered the v2 activation spec after friend testing and planning:
the prompt "最近一次我想让 AI 帮我做的事,是..." could collect a noun, but it is a
weak first signal. Many people would answer with low-stakes toy tasks such as
recipes or casual search, which says little about whether the course can hit a
real pain. The entrance needs to infer motivation before it tries to collect
surface nouns.

Resolution: Step 0 is now one single-choice question with exactly five pain
mechanisms: rules it forgets, claims of completion that cannot be verified,
one fix breaking another thing, overwriting the original, and not knowing what
can be handed to AI. These are not occupations or borrowed nouns; they are the
engineering failure modes the course later names as context, verification,
regression, overwrite, and trust/risk boundaries. No first-run multiple-choice
group, including the optional profile form, may exceed five options.
Free-form noun capture and LLM slot filling are deferred.

Also remove learner-facing Exit C. Route A/B/C/skip is still recorded as a
product-learning signal, but it no longer blocks or discourages the learner.
This is a small invite beta, and a false negative is more expensive than
letting a weak-fit learner try one lesson. After activation, the profile form
is optional: a learner can continue into the course without completing the
full onboarding form. Bilingual activation copy must remain authored, concise,
and native in each language; Chinese should not preserve English syntax when a
natural Chinese sentence carries the same meaning better.

---

## 2026-09-05 — Activation entry is a mutual fit check, not a diagnosis

Two non-programmer testers (a counselling trainee, a UX designer) both reported
that `/start` felt abstract and far from their lives. The decisive evidence
against blaming recruitment: asked separately what makes AI feel dumb, the UX
designer spontaneously restated this course's core concept — "I tell it every
time to do A and not B, in detail, and it still can't" — and still said the
product wasn't for them. A tester who independently produces the curriculum and
still bounces means the door is wrong, not the audience.

Diagnosis: the entry surface was built out of agent logs (`checkout.py`,
`python scripts/lint.py`, "tests pass"). Agent logs are where this skill pays
off most, which is exactly why they sit after the threshold the course exists
to help people cross — a circular entry requirement. The hook copy also
presumed shipping, and the result screen handed out a personality-quiz label
instead of naming a mechanism.

Rejected: rewriting the examples with "more relatable" nouns. The first attempt
picked 用户访谈 and 术语表, which is not neutral — it is UX-research-shaped and
content-design-shaped, i.e. overfitting to a sample of two. There is no neutral
noun; concreteness and reach trade off directly. Also rejected: widening the
curriculum (turns this into a saturated "use AI better" product and discards
the only moat), scenario tiles (a category set is still categories, and tiles
cost ~36 bilingual variants), and letting an LLM judge learner fit (asymmetric
error cost, unreviewable, violates determinism-first).

Adopted: the problem is wide, the explanation stays narrow and engineering.
Examples carry no borrowed context — a noun may only come from the learner's
own sentence, from a low-occupational-load everyday task, or from something the
course already taught. Segment by how load-bearing AI is in the learner's work,
not by code knowledge. Sentences are always authored; an LLM may fill at most
two length-capped nouns and classify a pain type, never write prose or decide
routing. The flow becomes: one optional sentence, two routing questions
(stakes, friction — the two preconditions inside the course's own philosophy),
the existing three-axis diagnostic in blank-slot costume, a result screen that
replays the learner's own words then names the mechanism, and a four-item
expectation screen before M0. Three exits, and the poor-fit exit gives
something rather than a verdict, admitting the product's boundary rather than
the learner's.

The promise moves from 90 seconds to 3 minutes, and from "see what you can
inspect" to "see whether you actually need this" — which converts the poor-fit
exit from a rejection into the promise being kept.

Stage 2 adds one micro LLM call at `/start`, forking the 2026-09-03 decision
that `/start` makes no LLM request. Stage 1 must ship and stand alone first,
because the no-LLM path is literally the fallback.

Full spec, copy in both languages, and the rationale behind each rule:
[ACTIVATION_ENTRY.md](./ACTIVATION_ENTRY.md). Still open there: whether to
widen the course endpoint for learners who will never touch code (wait for
exit-C data), verbatim retention, and voice input.

---

## 2026-09-05 — Invite activation is durable; product events test real value fit

The first external tester exposed a confusing auth state: the app could know a
browser had requested a magic link with an invite code, but it did not always
leave a durable server-side record that the email identity had been invited.
That made the short-lived invite cookie too load-bearing. If the learner opened
the link through a different browser/webview, or reached an auth-created state
before creating a learner profile, they could see "signed in" while the app
still redirected them around the first-run route.

Resolution: invite codes are still required only once. On successful invited
auth confirmation, the app writes `learner_profiles.background.invite.redeemed`
as the durable activation marker. Future email magic-link logins use that
server-side marker and do not ask for the invite again. A signed-in invite
recovery form remains only for the old/edge state where an auth user exists
but no durable invite/profile marker was ever saved; it is not the normal
returning-learner path.

Also add a sparse `app_events` stream for early product learning. Its purpose
is not to prove the founder's ideal value proposition, but to detect value-fit
mismatch: what attracted a learner, what they say they do not want, where they
stall, whether language support helps, and whether the assistant helps learning
or behaves like a support escape hatch. Existing `attempts`,
`lesson_time_events`, `lesson_assistant_messages`, and `llm_usage` remain the
deeper domain-specific records; `app_events` connects the funnel and friction
signals across surfaces.

The first event set is intentionally small: landing CTA, auth completion or
friction, invite redemption, activation diagnostic start/completion,
onboarding start/completion, lesson start/step/completion, exercise submit,
hint request, assistant open/message, progress save failure, and locale
change. Event properties must stay compact and structured; do not store emails,
free-form assistant text, or full learner answers there.

Mobile lesson assistant entry also changes from an always-floating large CTA to
a desktop-only floating card plus a small mobile toolbar icon. On phones, the
primary learning action is the bottom `Next` bar; assistant access must not
cover or compete with it.

---

## 2026-09-03 — Activation starts with a deterministic diagnostic

Owner brought in an activation action plan arguing that the course should not
open by explaining the solution ("read agent logs"), but by letting a learner
feel the problem: AI can sound done while the evidence, pre-check, or risky
diff is missing. The reasoning matches the existing product direction: start
from lived incidents, keep deterministic checks first, and make the learner's
next action obvious.

Resolution: add a `/start` route before M0 for invited first-time learners.
It is a 90-second, three-question diagnostic across evidence, pre-check, and
diff-risk axes. It shows no mid-quiz correctness feedback and makes no LLM
request. The result is stored in
`learner_profiles.background.activation_diagnostic` instead of adding columns,
because `background` is already the profile JSONB for starting-point signals
and this avoids a Phase 1 migration.

After the diagnostic, the learner receives one copyable sentence to use in a
real AI-agent conversation, then continues into M0. Existing fully onboarded
learners are not forced back through `/start`; test accounts can reset and
rerun the new-user path. `/learn` stays available for full learners, but its
first screen is now one decision: resume/start today's lesson, with the full
route folded below.

This activation-result copyable sentence was later removed by the 2026-09-12
activation-handoff decision. Lesson-level `takeaway_move` remains separate.

Also adopt the action plan's "portable move" requirement for lessons:
`takeaway_move_en` / `takeaway_move_zh` are now required content fields and
validated at build time. They appear on lesson completion with a copy button.
Second wrong attempts show static authored explanation plus the nearest concept
anchor, so help is available without `/api/llm`.

Not adopted yet: visit-count-based copy decay, pre/post checkpoint comparison,
task-first rewrites of every lesson, and term-drill demotion. Those remain P1
or later because they change broader content structure.

---

## 2026-09-02 — Landing typography uses real CJK title font without preloading all CJK

The landing page exposed a font bug: `Noto_Serif_SC` was configured with
`subsets: ["latin"]`, so Chinese headings fell through to system serif fonts
instead of the declared title face. Loading a full CJK web font eagerly would
also be too heavy for a small private beta landing page.

Resolution: keep `Noto Serif SC` for the serif title/brand voice, but configure
it with `preload: false`, `display: "swap"`, and only the used `600` weight.
This lets Next emit unicode-range CJK slices and lets the browser request only
the glyph ranges used on the page. Body text stays on Geist for Latin plus an
explicit system Chinese sans stack, so Chinese body copy no longer depends on
browser-default fallback. Latin font names stay before Chinese font names in
the stacks so mixed strings such as AI, CS50P, and MDN keep the Latin face.

Tradeoff: local Chrome timing on the logged-out landing page at 375px showed
about 268KB of woff2 font resources for Chinese first view and about 72KB for
English. That is heavier than the earlier Latin-only title setup, but avoids
shipping a full multi-megabyte CJK font up front and fixes the visible Songti
fallback problem.

---

## 2026-09-02 — Product/design skill hook guides future learner-facing work

Owner asked to bring higher-quality web/mobile visual design and product
development practice into the repo as reusable agent capability, not as chat
memory. Installing every available PM/design skill would add noise and make
future agents over-framework simple work.

Resolution: install a curated local Codex skill set for deeper dives
(`refactoring-ui`, `problem-framing-canvas`, `discovery-interview-prep`,
`opportunity-solution-tree`, `prioritization-advisor`, `prd-development`,
`user-story`, `user-story-splitting`, `context-engineering-advisor`) and add a
project-specific `forthree-product-design` skill under
`docs/agent-skills/forthree-product-design/`. `AGENTS.md` now treats this as a
pre-work hook for learner-facing UI, lesson flow, onboarding, course maps, AI
feedback, prioritization, PRDs, user stories, and roadmap choices. The project
skill translates external frameworks into For Three's own gates: learner job
first, calm density, concise bilingual language, deterministic checks before
LLM output, and small phase-bound vertical slices.

---

## 2026-09-02 — Public landing defaults to Chinese and names the product job

Owner rejected the deployed Chinese landing copy as visually heavy and
semantically mushy. The page also exposed a deeper inconsistency: the app name
and pitch cannot sound like generic anxiety comfort.

Resolution: the default locale is Chinese unless the user has chosen English.
English surfaces keep **For Three** with the explainer "Learn one thing. Use
it three ways." Chinese landing uses **举一反三** with **学点真本事** as the
lockup. The landing promise should name the actual job: a 10-minute daily
learning experience that gives non-engineers just enough CS to use AI better
and judge whether it is capable. Avoid abstract comfort lines, treadmill
promises such as "you can keep up," and literal translations such as "按事故进入."
Non-interactive signals should not be styled as clickable cards.

Course-map pages should be task-first, not syllabus-first: put resume lesson,
current module, and today's next action before broad course arc or source
links. Long roadmaps and all-module lists belong in collapsible sections so
the learner is not met by a wall of text before they can continue.

Onboarding should also lower the writing burden for friend beta. Personal
targets, success definitions, and daily learning time are multiple-choice
signals by default. Store daily minutes in `preferences.daily_learning_minutes`
while computing the existing `weekly_budget_hours` value for schema
compatibility.

Do not put an isolated no-account sample question on the public landing page
unless it has a clear next step. The "first small incident" belongs in M0,
where the learner can continue directly into the course method.

Add a standing Translation Reviewer to the review board for bilingual,
learner-facing copy. This reviewer checks 信、达、雅 and proposes replacement
lines instead of only flagging awkward wording.

## 2026-09-02 — Course map follows incidents outside, concepts inside

Owner reframed the course around information asymmetry: learners are not
collecting CS facts for their own sake; each concept should reduce one class
of technical information gap between the learner, programmers, and AI agents.
The best test of a module's positioning is what the learner can now refuse,
pause, or challenge. If the answer is only a list of terms, the module has not
yet become a capability.

Resolution: preserve the existing CS spine, but expose it through an incident
line. Course and module navigation should name lived failure modes first
("I don't know whether it really ran", "I can only paste the error back",
"they suggested caching and I don't know whether to agree"), then teach the
CS concepts needed to interpret that incident. In short: the learner-facing
directory follows accidents; the lesson internals follow knowledge order.

Every module should be able to answer "what can the learner now refuse?" in a
plain sentence, such as "a delivery with no checkable evidence" or "a proposed
architecture whose tradeoff has not been named." Refusal here does not mean a
defensive or superior posture; it means learned judgment, clear boundaries,
and the ability to ask for the missing evidence before work becomes expensive.

The first lesson may start with a small, authored incident review: an AI agent
claim or code/result that looks plausible but hides a gap. The goal is not to
scare or humiliate the learner, but to create a memorable need for the first
concept. Keep it low-risk, deterministic, and short enough that the learner can
recover inside the lesson. Existing M1 content already supports this direction
through claim/command/output, failure timing, current directory, and side
effects; future content should make that incident arc visible rather than
presenting the module as a generic Python introduction.

Follow-up: adding an M0 is allowed if the landing-page promise needs a stronger
bridge into the course. M0 should not become a generic "what is programming"
preface. Its job would be orientation by incident: let the learner experience
one small information-asymmetry gap, name the course's method, and show the
learning route. Keep it short, low-stakes, and capability-shaped. M1 remains
the first real technical module; M0 is the threshold where the learner sees why
the technical modules matter.

Second follow-up: M0 should come before the full onboarding form for invited
first-time learners. The learner should feel the small information gap before
doing profile setup; otherwise the setup arrives before the reason to care.
Allow only M0 to be entered and saved with a valid remembered invite but no
completed learner profile. After M0, the learner must complete onboarding
before entering M1 or later. Existing learners who already have M1 progress
should not be pulled back to M0 by the new content; M0 becomes an optional
bridge for them.

## 2026-09-02 — Study minutes measure active effort, not seat time

Owner asked whether the app should measure real lesson interaction time because
"I studied N more minutes today" might feel satisfying. Industry patterns
support minutes as a habit and effort signal, but not as a proxy for learning
quality. For Three should therefore use time as warm confirmation, while
capability progress remains primary.

Resolution: show lesson estimates as honest ranges before entry, then record
`lesson_time_events` as learner-owned active learning intervals. Count only
visible lesson time with recent interaction; pause on background tabs and
idle stretches. On lesson completion, show "this lesson" and "today learned"
minutes. On the course map, show active learning time beside exercise progress,
with planned estimate as supporting context. Do not award or gate progress by
minutes.

## 2026-09-02 — Learner language must be dense, not long

Owner clarified the language standard across the app: rigorous, vivid,
concise, and clear. The product should not rely on long explanations or repeat
the same promise in several places.

Resolution: treat brevity as a quality gate, not a style preference. When a
lesson feels too short, add interaction, transfer, or scenario judgment before
adding prose. Chinese and English may differ by wording, but both should read
like native editorial writing.

## 2026-09-02 — Auth entry splits real learning from test review

Owner requested a full rethink of login, signup, test accounts, and the
before-Lesson-0 experience for a likely 5-10 person private testing group.

Resolution: keep Supabase passwordless magic links. Passwords would add reset
and setup UX before they add learner value. Email remains the stable identity;
Supabase user id remains the private progress key. First signup stays invite-
gated, while returning learners sign in with email only. The owner distributes
one invite code and should not need to add each learner email by hand. A valid
invite code stores a short-lived, signed, httpOnly invite cookie for that email;
only that browser session can create the first learner profile. After
onboarding, the profile is the app access record. Profile writes are server-
owned: `authenticated` users may read their own `learner_profiles` row, but
cannot create or update it directly through the Data API.

New learners complete a short onboarding profile before the course path: role,
known tools, confidence, motivation, success definition, weekly time, language
preference, and example preference. The five-question calibration is no longer
a gate before Lesson 0; missing calibration saves as a gentle start and can be
collected inside the learning flow. This writes to `learner_profiles` and sets
`preferences.onboarding.completed=true`.

Allowlisted test accounts serve two QA jobs: reset learner-owned app state to
re-run new-user onboarding, and browse/open any lesson without creating new
auth users. Test accounts are still emails the owner controls, preferably
email aliases, not guessable usernames. Real learners without onboarding are
redirected to `/onboarding`; test accounts may still enter the course map after
reset.

Content updates should respect lived progress. The profile and attempt history
are the stable learner record; future personalization should change upcoming
plan steps, not repeatedly invalidate lessons a real learner already completed.

Follow-up: the login page must answer what the app is for, but must not expose
internal operating personas such as "returning learner", "new tester", or
"test account." Those distinctions are implementation and QA rules, not useful
landing-page content for anyone except the owner. Keep the public login surface
to the product job and the email/invite action. Test reset and lesson-jump
affordances belong only after a test account is signed in.

Second follow-up: the signed-out homepage is the landing page. It must make the
product job clear before asking a friend to sign in. The login page is the
action surface: email, invite code, and the passwordless-link constraint. Copy
should state that the individual email link is device/browser-bound for that
login attempt, while the learner's progress syncs across devices after signing
in.

## 2026-09-01 — Review board uses living specialist cards

Owner clarified that architecture review should not be the only standing
independent gate. Education, interaction design, AI-era engineering judgment,
and zero-code learner clarity should also exist as separate senior reviewers
with their own context and accumulated learnings.

Resolution: add `docs/REVIEW_BOARD.md` and reviewer cards under
`docs/reviewers/`. The board mirrors the owner's Claude agent-fleet logic:
specialist reviewers are independent agents when tooling allows, not simulated
voices inside the implementer's answer. Reusable corrections go into each
reviewer card's `Learned Corrections`; durable product or architecture forks go
into this decision log. Architecture approval remains mandatory before final
submission of meaningful code changes. Learner-facing changes run the relevant
reviewers as capacity allows, and any skipped reviewer must be named rather
than silently implied.

## 2026-09-01 — Public-course research follows source trails

Owner corrected the depth standard for public CS references. A source list is
not enough if the actual course points to a textbook, readings, instructor
notes, code files, or problem-style materials. For example, MIT 6.100L's
reading path points into Guttag's introductory computation textbook and its
public companion code/errata.

Resolution: research public courses deeply but lawfully. Follow syllabus source
trails and index the materials that influence curriculum sequence, concept
density, explanations, visual patterns, and exercise style. Do not copy prose,
problem statements, screenshots, or long excerpts. Login remains a compact
trust signal, so it shows representative roots plus "and more"/"等"; the
course page and resource index carry the fuller source map.

## 2026-08-30 — Standing Architecture Reviewer before submission

Owner requested an independent senior-architect review role that persists
beyond one chat turn. This reviewer exists to catch issues an implementation
agent is likely to miss after becoming attached to its own patch: inconsistent
code, brittle extension paths, unnecessary complexity, wrong global/local
scope, and security regressions.

Resolution: add `docs/ARCHITECT_REVIEWER.md` as the reviewer's charter and
make it a required pre-submission gate in `docs/MAINTENANCE.md`. For meaningful
code changes, the implementation agent must obtain approval from a separate
agent when multi-agent tooling is available. If that tooling is unavailable,
the agent should not fake an approval; it should report that the required gate
cannot be completed.

## 2026-08-30 — Visual system avoids both AI futurism and AI minimalism

Owner asked for a broader visual refresh: not just color, but typography,
borders, and interaction. The target is 文雅中有活泼: a refined learning
tool with enough warmth and motion to feel alive, without emoji, purple-blue
gradients, glass cards, glow blobs, or the flat grey minimalism now associated
with large AI chat products.

Resolution: update the global palette from bright indigo on warm paper to a
cooler 瓷青 paper ground, 墨 ink, 孔雀青 for primary actions, and a deeper
朱砂 for the seal and teacher-margin emphasis. Remove wide letter-spacing from
major Chinese headings and source labels. Give buttons, inputs, locale toggles,
and source chips a consistent tactile layer: clearer borders, custom soft
shadows, visible focus rings, and a small hover lift. The brand should signal
specific learning judgment, not generic AI category membership.

## 2026-08-30 — Auth form states keep one visual skeleton

Owner flagged that the post-submit login page felt inconsistent because the
screen lost much of the content below the hero after the magic link was sent.
This is a state-design issue: initial, error, and sent states should feel like
the same login surface, not separate pages.

Resolution: keep the email form visible after submit, preserve the submitted
email in the input, and render success/error/link-invalid messages in one
stable status slot under the primary button. Invite code remains a first-signup
detail, not part of the old-user login path.

## 2026-08-30 — Login pitch leads with target-user pain

Owner liked "not a coding bootcamp" but flagged the follow-up sentence as
stiff and too narrow. The login page is the highest-value information reveal:
it must answer, in one glance, why this product is different from general
adult-learning apps and why a practical non-engineer should care.

Review through four target profiles clarified the hierarchy. A product or
operations lead wants fewer unclear handoffs; a founder wants less expensive
rework; a data/AI-heavy user wants to judge agent output earlier; a non-
technical manager wants better questions before engineering time is spent.
All four respond to collaboration leverage, not to curriculum provenance.

Resolution: the primary pitch should say For Three is not a coding bootcamp,
but a demystification course for code and AI. It should still land on the
practical job: read what programmers and AI agents are doing, ask earlier, and
avoid expensive misunderstandings. Public CS course sources remain a trust
signal below the fold or below the form, not the lead sentence.

Follow-up: "engineering collaboration course" is strategically accurate but
too stiff as a learner-facing category in Chinese. Keep collaboration as the
underlying job-to-be-done, but expose the course as code and AI demystification
or code and AI fluency.

Second follow-up: the login page should hint that For Three is itself an
AI-assisted learning product, not only a course about AI. The promise should
carry the mission clearly: AI helps prepare and improve the course, and the
learning path should fit each learner's starting point and sticking points.

## 2026-08-30 — Bilingual copy optimizes for 信达雅, not word matching

Owner flagged that "rewritten" and the Chinese "改写" can sound copyright-
adjacent, as if For Three were laundering public-course material. The deeper
copy principle is that English and Chinese should not mirror each other word
for word when that weakens native fluency or creates the wrong implication.

Resolution: bilingual learner-facing copy should preserve shared intent and
technical meaning, but each language should read as if written originally in
that language. The review standard is a bilingual professor's eye: accurate,
faithful to the product promise, and elegant enough not to feel translated.
For the login page, lead with the learner's job-to-be-done rather than with
course provenance. Provenance is supporting trust, not the primary pitch.

## 2026-08-30 — External links require resource-index review before placement

Owner corrected the first external-resource implementation: linking out is not
just a copyright question. It is a learning-flow decision. A useful external
page can still be a bad in-lesson link if it interrupts the learner at the
wrong time, duplicates the app's own explanation, takes too long, opens poorly
on phone, or leaves the learner unsure how to return and continue.

Resolution: keep course-level public links compact and mostly as provenance.
The login page may show a lightweight source signal, but should not become a
public-link directory. The course homepage may show the full source list in a
small footprint. Lesson-level links must come from a maintained resource index
after the exact page/video has been read or watched, matched to a specific
lesson moment, classified as optional or required, and checked on phone and
desktop for open/return continuity. Remove premature lesson-level links until
that review is complete.

## 2026-08-30 — Add Lesson 0 as orientation, not an essay

Owner asked for a short opening frame inspired by public course introductions:
what computer science roughly contains, what AI changes today, why this course
exists, and what commitment the learner should bring. This is valuable, but
only if it behaves like the product: concrete, visual, and quickly testable.

Resolution: add Lesson 0 before the first technical lesson. It gives a compact
CS scope map, defines engineering literacy as collaboration leverage, explains
why AI makes judgment more important rather than optional, and sets expectations
around 5-8 minute practice, answering before hints, and not running risky
agent-suggested actions blindly. Keep it short. The purpose is orientation and
trust, not a textbook preface.

## 2026-08-30 — External course links are optional references, not copied content

Owner wants useful public course materials linked at the moment they become
relevant, especially short videos or tool demonstrations from resources such
as Missing Semester. This is pedagogically right: a learner who wants breadth
can leave the app briefly without forcing every learner through a longer path.

Resolution: lessons may declare optional external `resources` with source, URL,
and reference minutes. These links open the original site and do not count
toward required lesson completion. The app should not embed, download, rehost,
copy screenshots, copy problem text, or summarize large portions of external
materials unless the exact license and attribution requirements have been
checked. We link out as provenance and enrichment; For Three remains the
teaching surface.

## 2026-08-30 — Visual copy must survive mobile stacking

Owner noticed a recurring responsive-learning problem: desktop layouts often
place artifacts side by side, but mobile stacks them vertically. Copy that says
"left" and "right" stops matching what the learner sees.

Resolution: visual titles, captions, and exercise prompts should identify
artifacts by semantic labels, window titles, filenames, or highlighted terms,
not by fragile screen position. Mobile and desktop should be checked separately
for major learner-facing visual changes. When one copy cannot work naturally
across both, prefer a more universal layout before creating divergent text.

## 2026-08-30 — Course URLs use specific slugs, not `/learn`

Owner clarified that the course suffix itself should be specific because For
Three may later host multiple courses. A generic `/learn` path would become
ambiguous and create migration debt once a second course exists.

Resolution: the active course lives at
`/courses/engineering-literacy-code-ai-agents`, with lesson pages underneath
that same course slug. Do not keep `/learn` as a compatibility redirect in
Phase 1; there is no public contract worth preserving yet, and keeping it would
teach the codebase the wrong routing model. Shared lesson UI belongs outside
route folders, so the player now lives as a reusable component.

## 2026-08-30 — Current course name and influences must be visible

As For Three may later host multiple courses, the current course should not be
labeled with a generic umbrella title. Rename it around the actual job-to-be-
done: engineering literacy for collaboration with programmers and AI agents.

Resolution: the active course is "Engineering Literacy: Code & AI Agents" /
"工程协作入门：读懂代码与 AI agent". Public course links should be visible in
the app, not only in design docs, so learners can open the original courses
directly. The product claim is "集众家所长", not endorsement and not copied
content: these sources shape sequencing and emphasis; For Three's Chinese
explanations, AI-agent collaboration framing, and exercises remain original.

## 2026-08-30 — Fresh onboarding tests reset learner state, not auth users

Owner needs to repeatedly experience the app as a new learner. Creating a new
Supabase auth account for every test run would be closer to a literal signup,
but it creates account clutter and makes routine onboarding review slower.

Resolution: use one fixed test account and give only allowlisted test emails a
server-side reset action. The reset clears learner-owned app data for that user
— progress, XP, profile, plans, SRS, pulse checks, assistant history, and usage
logs — but keeps the Supabase auth user. This tests the product state that
matters for onboarding without changing identity infrastructure. Production
requires both `TEST_ACCOUNT_EMAILS` and `TEST_ACCOUNT_RESET_ENABLED=true`; local
development only needs the email allowlist.

The reset must also clear lesson-player browser caches on return, because
client-side interruption recovery can otherwise make a freshly reset test user
look partly complete.

## 2026-08-30 — The pain is collaboration leverage, not becoming a programmer

Owner clarified the deeper personal pain: she does not need to become a
programmer, but she does need to understand what programmers are doing, why
they are doing it, and roughly how the work is carried out. That understanding
reduces communication and interpretation cost in engineering collaboration,
lets her contribute from her own strengths, and creates better synergy with
programmers and AI agents.

AI does not remove this pain. It raises the floor by letting the owner create
more than she could have built alone, but if judgment stays after-the-fact,
time cost and communication cost compound. The ceiling is still limited by the
parts she cannot explain or evaluate. This refines the app's founding frame:
For Three is not a programming course wearing AI clothing; it is a course in
engineering literacy for people who need to direct, judge, and collaborate
around technical work without becoming full-time engineers.

Resolution: lessons should repeatedly connect concepts to collaboration moves:
what to ask before work starts, what evidence to request while work happens,
what output proves after work finishes, and which risks need escalation to a
human engineer. "Understand programmers" and "understand AI agents" are not
separate tracks; AI makes the same collaboration gap faster, cheaper to enter,
and easier to underestimate.

Also set the AI-cost design principle: practical-feeling lessons do not imply
frequent runtime AI calls. Use AI heavily during development and authoring:
researching curricula, designing lesson packages, writing code, preparing fixed
scenario variants, and reviewing content. At runtime, prefer deterministic,
pre-authored, copyable, and selectable interactions whenever they can teach the
same move. Reserve live AI calls for genuine per-user customization, open-ended
questions, and cases where static packages would clearly fail. The intended
shape is roughly 80/20: most AI leverage happens before the course is shipped;
only the high-value minority happens inside the live lesson.

## 2026-08-30 — Mobile lesson flow must be interruption-safe

Owner supplied a mobile-first critique after live production use and a second
model's code read. Triage: the main claims are accurate. The lesson player
kept correct answers only in React state until the final screen, `?step=` was
read only on entry, checkpoint material was separated from its questions, and
several controls were below comfortable mobile tap targets. This made normal
phone behaviors — language switching, app switching, lock-screen recovery, and
edge-back gestures — feel like punishment.

Resolution: progress must be recorded at the exercise boundary, not only at
lesson completion. Correct exercise results are POSTed immediately and mirrored
in a same-tab session cache so a language refresh can restore the local lesson
state while the database remains the source of truth. Lesson navigation writes
the current step into browser history so refresh/language switch resumes in
place and mobile back gestures can walk through recent steps. Use `dvh` and a
sticky lesson footer for phone browser chrome; lesson chrome controls should
meet mobile tap-target expectations.

Module checkpoints need a different layout from ordinary reading cards:
assessment material should stay visible in a collapsible panel while the
question is answered. Wrong answers also need deterministic help without
depending on an LLM call; after repeated misses, show the authored explanation
as a static clue.

Course entry should answer "what am I doing today?" before showing the whole
route. The home continue action should deep-link to the next unfinished lesson,
and the course page should lead with today's lesson and the current module capability.
Longer-term session bundles, warm-up/SRS, and placement testing remain separate
progress-model work; do not fake them with copy-only UI.

## 2026-08-30 — Micro-lessons need real transfer friction, not padded time

Owner retook L3-L4 in production and finished each in under 3 minutes despite
the 8-minute labels. The issue is not merely dishonest estimation; it means the
lesson path lets a fast learner recognize definitions without doing enough
evidence-sorting, variation, or application work to feel "举一反三."

Resolution: keep Phase 1 lessons under the 10-minute ceiling, but treat 5-6
minutes of focused work as the practical center of gravity, with slower
learners plausibly taking about 8 minutes. Add marked transfer prompts via
`advanced: true`, rendered as "Advanced question" / "举一反三", when a lesson
needs more capability weight. These prompts should reuse the concept in a new
terminal log, agent transcript, pseudocode plan, or small work scenario.

Also formally enable `drag_order` now. Tap-to-order is the first interaction
that is richer than reading/MCQ/fill-in while staying deterministic and mobile
honest. Use it where ordering or mapping evidence is the skill, not as a
decorative activity.

## 2026-08-30 — Supabase Data API grants are explicit

Supabase's 2026 Data API defaults mean new `public` tables are not reliably
reachable by `supabase-js` unless migrations grant role privileges explicitly.
Resolution: keep RLS as the row-ownership layer, but make table exposure an
intentional migration concern too. `0004_explicit_data_api_grants.sql` revokes
signed-out access, grants authenticated users only the operations the app uses,
and leaves `service_role` available for trusted server-side maintenance.

Add `supabase/SCHEMA.md` as the human schema ledger and
`npm run check:supabase` as the non-destructive preview check after applying
migrations. The check validates expected tables/columns with
`SUPABASE_SECRET_KEY` and fails if the anon key can reach app tables.

---

## 2026-08-29 — Assistant history is private and compacted after 30 days

Owner wants lesson-assistant questions saved because they reveal learning
habits, pain points, and course blind spots. Resolution: assistant history is
private learner data in Supabase, not public content and never committed to the
repo. Tables are user-scoped with RLS (`user_id = auth.uid()`), matching
attempts and profiles.

Full question/answer bodies are useful while the product is learning where the
course is unclear, but they should not live forever by default. Store full
messages for 30 days, and store compact `learning_signal` JSON beside each
message immediately. Application cleanup can later null old bodies/context
after `body_retained_until`, preserving the compact learning signal for
stage-level summaries.

## 2026-08-29 — XP is secondary to capability progress

Owner pointed out that a visible "level" has no value unless it carries a real
product meaning, such as unlocked difficulty, identity, or capability. For the
Phase 1 learning path, remove the arbitrary level display. The primary progress
signal is now distance toward the current module capability/milestone, measured
by passed exercise checks. Pair that with cumulative estimated learning time so
the learner sees both today's effort and long-term accumulation. XP remains an
internal event stream for later streaks/achievements, but it should not be the
main visible meaning until those systems exist.

## 2026-08-29 — Lesson estimates should be honest micro-lesson estimates

Owner noted that several early lessons felt shorter than their listed time.
Resolution: estimate focused learner time honestly instead of padding lessons
to look weighty. A normal Phase 1 micro-lesson should be 6-10 minutes, and the
content validator enforces a 10-minute ceiling. A learner should be able to do
one lesson in a small pocket of time, then choose whether to continue. The
module should feel substantial through enough nodes, 3-5 meaningful checks per
lesson, visuals where they clarify artifacts, and a module capability
checkpoint, not through inflated duration labels.

## 2026-08-29 — Visual review must inspect the rendered image

Owner clarified that the four-reviewer loop must not review visual teaching
aids from text alone. If a lesson change includes diagrams, screenshots, or
illustrations, reviewers must inspect the rendered visual or a screenshot.
They should check whether the image teaches the intended distinction, whether
labels/cursors/prompts create false beliefs, and whether the visual is legible
on laptop and phone.

## 2026-08-29 — Visual aids are concept-bearing lesson blocks

Owner asked for illustrations inside lessons, especially for Python,
terminal, and newly introduced concepts. Resolution: add a `visual` block type
to the content schema. Visuals are part of the course spine, not decorative
page chrome, so the renderer, validator, and lesson assistant can all know
which artifact the learner is seeing.

First implementation uses small code-rendered teaching illustrations
(`source-code-file`, `terminal-command`, `python-output`) instead of generic
stock imagery. The goal is recognition: a learner should remember what a code
file, a terminal prompt, and program output look like when later reading an
AI-agent transcript. Richer bitmap, real screenshots, or public web images can
be added later when the artifact is specific enough to justify it. When using
outside images, prefer stable official/public sources, store attribution in
content, and avoid hotlinking fragile assets.

## 2026-08-28 — Course authoring uses four-reviewer convergence

Owner clarified that course design should not depend on the owner's manual
review after every slice. Resolution: substantial learner-facing curriculum
work runs through four perspectives before handoff:

1. Education / learning science: sequence, durable skill, retrieval,
   transfer, and checkpoint design.
2. AI-era senior engineer: what judgment matters when working with coding
   agents, and which traditional coding details can stay light.
3. UI/UX designer: how the product makes path, progress, curiosity,
   interaction, and next action visible.
4. Strong zero-code learner: a smart learner from another field who has good
   reasoning but no programming background.

The loop is review -> revise -> re-review until comments converge to minor
wording/future polish, or until token/time budget is near the limit. If budget
forces a stop, the remaining risk must be named explicitly.

## 2026-08-28 — Micro-lessons are allowed, but modules need capability weight

Owner noted that L1/L2 felt closer to 5-10 minutes than 15-30. Short lessons
are acceptable and often desirable, but "short + too few nodes" makes the
course feel like a fun-to-know outline rather than skill acquisition.

Resolution: do not pad lessons just to hit a time number. Instead, allow
micro-lessons with honest estimates, increase module node count when needed,
and require each module to end in a checkpoint that proves a concrete
capability. For M1, that capability is: read a short AI coding-agent transcript
or terminal log and judge what the agent wrote, what it actually ran, where it
ran it, what the output proves, where the failure happened, and whether files
or data may already have been affected.

## 2026-08-28 — Personalization happens at marked variation points

Owner wants the first version to feel personal without becoming a fully custom
course that cannot scale. Resolution: keep a stable concept spine and mark the
places that depend on the learner profile: examples, analogies, domain
references, and terms that are safe because this learner has some data/AI-agent
work context. Future users should get rewritten anchors/examples at those
marked points, not a rewritten course from scratch.

Also: the course is stage-aware. A term is explained when it is new, lightly
reminded while fragile, and then used normally after the learner has practiced
and passed checkpoint tasks with it. Beginner support should fade as the
learner earns the vocabulary.

## 2026-08-28 — M1 lessons need a narrative question chain, not a concept list

Owner noted that "What is a program?" did not create curiosity, and L1/L2 felt
adjacent rather than connected. Resolution: Module 1 is framed as one practical
question chain a learner meets when using AI coding agents:

1. Did the AI-written code do anything yet, or is it still just text?
2. If code is text, who translates it into action?
3. Where does the human or agent ask the computer to run something?
4. Before exact syntax, how do we state the plan clearly?
5. When the first Python line runs, how do we read the visible output?

Lesson titles, opening blocks, closing bridges, and module description should
serve that chain. Avoid starting a lesson with a bare taxonomy question unless
the learner already has a lived reason to ask it.

## 2026-08-28 — Desktop and mobile learning UI should diverge intentionally

Owner noted that the desktop learning page still does not use the wider
viewport well. Future UI passes should treat desktop and mobile as different
learning contexts, not one stretched layout. On desktop, prefer a more
workbench-like layout: a collapsible left column for course position, module
outline, and progress, with the current lesson or module content using the
main reading area. On mobile, keep the experience more linear and focused,
with navigation collapsed behind lightweight controls.

This is deferred from the current OpenRouter/copy-edit slice. Do not rush a
sidebar into the product until the course map, lesson player, and progress
model agree on what the side column should show.

## 2026-08-28 — Every deliverable gets a zero-code learner blind-spot pass

Owner noted that once a concept has been learned, both the owner and the agent
can miss beginner confusion on a second read. Resolution: every completed
lesson, page, or learner-facing interaction now gets a final blind-spot pass
from the imagined perspective of a learner with no coding background.

The pass checks whether a first-time learner can tell what is information vs.
action, what the current step is, how this screen relates to the course path,
which technical terms need a Chinese explanation before their English label,
and what to do next. Any confusing point should be fixed before handoff, or
explicitly named as residual risk if it is intentionally deferred.

## 2026-08-28 — Course map separates overview from active module

Owner caught a product-design ambiguity on the course path: the four Part
summaries looked like clickable cards, while the real lesson list below felt
visually detached from that overview. Resolution: the Part area is now a
non-clickable course arc, styled as a route overview rather than an action
grid. The lesson area is explicitly presented as the current module within
that arc, with the stage label repeated above the module title and only lesson
rows behaving like navigation.

Rejected for now: making the Part summaries filter or switch the lower list.
That would imply functionality the product does not have yet, and would make
the current Phase 1 vertical slice feel broader than it is.

## 2026-08-28 — Lesson language toggle preserves current card; UI text scale raised

Owner caught that switching language inside a lesson restarted the lesson from
the first card. Resolution: lesson pages accept `?step=<blockIndex>`, and the
in-lesson language toggle sends `/locale` a safe relative `back` URL containing
the current step. This preserves the learner's current card across a full
language-cookie refresh without writing transient state to the database.

Owner also noted the UI still felt too small and not polished enough. For this
pass, keep the 「朱批」 identity and avoid adding a design system dependency, but
raise the text scale for lesson reading and exercises, give the course map more
structure, and make surfaces/buttons feel more deliberate with brighter paper,
clearer hierarchy, and restrained shadows. Bigger visual redesign remains open
after more live playtesting.

## 2026-08-28 — Phase 1 lesson assistant starts with OpenRouter

Owner asked to do the OpenRouter lesson assistant first. This amends the
2026-08-26 runtime-provider decision for the current vertical slice: the first
implemented `/api/llm` path uses OpenRouter directly, with the provider still
hidden behind `src/lib/llm` so future provider changes stay localized.

Scope for the first slice: every lesson has a small in-lesson assistant dialog.
It sends the current lesson, current block, relevant exercise (if any), current
response (if any), and local progress into `/api/llm` for a short explanation
or hint. The model never grades; deterministic grading stays the first, trusted
verdict. If `OPENROUTER_API_KEY` is missing, daily/monthly caps are reached, or
OpenRouter errors, the route returns static fallback text and the lesson remains
fully usable. Usage is logged to `llm_usage` when a live call succeeds.

Rejected for now: installing OpenRouter's SDK or building the full planner
adapter. The direct fetch call is enough for this Phase 1 slice, avoids a new
dependency, and follows OpenRouter's documented `/api/v1/chat/completions`
contract plus app attribution headers (`HTTP-Referer`, `X-OpenRouter-Title`).

## 2026-08-28 — UI brightness correction: force the learning app light

Owner said the web app still felt too black/dark. The likely culprit was the
CSS `prefers-color-scheme: dark` branch, which made the whole app switch to a
near-black palette on dark-mode devices. Resolution for now: remove the dark
override and keep the product in a bright 月白 paper palette regardless of
system setting. Keep 「朱批」 as the identity, but make the base brighter:
white surfaces, lighter lines, brighter indigo, and softer success/warning
backgrounds.

## 2026-08-27 — 中文版交付标准: CET-4/6 reader, no technical English assumed

Owner caught a zh lesson whose Chinese still required English to parse
("agent 说 build failed 和 crashed at runtime..."). Delivery standard set:
**the Chinese version targets a mainland-China learner with CET-4/6 general
English who does not know English technical nouns** — not a bilingual
engineer. Full rule in `content/schema.md` § 中文版交付标准: Chinese must
carry the meaning alone; every English term glossed on first appearance;
quoted agent output stays English but is glossed immediately; term drills
still want the English answer but their Chinese prompt must make the concept
unambiguous without it. M1 L1–L2 zh revised to comply — use them as the
reference implementation.

Rationale: a Chinese version that presumes technical English is a fake — it
looks translated but still gates on exactly the vocabulary the learner came
to acquire.

## 2026-08-27 — System design is domain-general; teach it from the learner's own domain

Owner: "system design 的底层逻辑和很多其他事情是共同的,只是因为发生在编程中
显得很 specific." Agreed, and it changes the teaching direction.

The load-bearing moves in system design are not software-specific:
**decomposition** (where do you cut the parts), **contracts** (what does each
part promise the others), **tradeoffs** (nothing is free — what are you
buying, what are you paying), **failure modes** (what breaks, and what
happens to everything else when it does), **coupling** (what is forced to
change together). A data pipeline, a restaurant kitchen at dinner rush, an
org chart, a supply chain, an inventory flow — all of them run these same
moves. Software just gives them jargon.

**Consequence for Stage 3 (M9–M12) and the capstone:** do NOT teach system
design from zero. The first user already exercises it at a serious level
(a 20→40+ table attribution pipeline with 100+ signals *is* system design);
what's missing is the vocabulary and the software-specific instances. So the
sequence inverts:

1. **举一** — surface a design decision the learner already made in their own
   domain, and have them articulate it (what did you cut apart, what did each
   piece promise, what did you trade).
2. **命名** — give that move its engineering name (decomposition, interface,
   coupling…). The learner discovers they already had the judgment; they were
   missing the word. This is the fastest possible route from 理解 to 判断.
3. **反三** — map it onto two unfamiliar instances: a software architecture,
   and one non-software system. Then judge an agent-proposed design in that
   shape.

This makes system design the clearest expression of the product's own name,
and it means Stage 3 exercises must be **generated against the learner's
stated domain** (onboarding A2), not hardcoded to data pipelines. Content
files carry a generic default anchor plus a `domain_variants` hook for
Tier-1 re-anchoring.

## 2026-08-27 — Curriculum amendment: system design as an explicit thread

Owner: "基础的编程知识是基石,最重要的是之后能够拥有 system design." Correct
and era-consistent — once AI writes the code, the human leverage point moves
up to system design, which is also the layer where agent proposals most need
judging. Gap confirmed: Stage 3 taught system *literacy* (parts and
vocabulary), not design *judgment* (composition, tradeoffs).

Amendment (weave, not bloat — no new module): (a) every Stage-3 module
(M9–M12) ends with a design-judgment exercise — given a scenario, judge an
agent-proposed architecture directionally; (b) the M14 capstone becomes
**design-doc-first**: a one-page mini design doc (components, data flow, one
key tradeoff) written and rubric-reviewed before any code; (c) Stage 3/4
milestones updated in content/stages.json accordingly. Teaching material:
forthree's own architecture decisions in this very file (extends the M11
repo-as-textbook approach). Rejected for now: a dedicated system-design
module — revisit as an elective if Stage 3 leaves appetite.

## 2026-08-27 — First-user playtest feedback round (owner played L1 live)

Four decisions from live feedback:

1. **English-in-Chinese-course policy.** A zh-mode fill-in demanding an
   English word felt like leakage. Resolution: it *is* deliberate
   (graduation ability #3 — agent transcripts are English), so make the
   intent visible: `term_drill: true` exercises get a badge (术语题 ·
   用英文回答). Non-term fill-ins must accept zh variants. Rejected: adding
   zh words to term-drill accept lists — it would defeat the drill's point.
2. **Back navigation added.** Its absence was MVP omission, not design;
   learners must be able to look back at a concept while answering.
   Answered exercises stay done when revisited.
3. **In-lesson language toggle** added to the player header.
4. **The 哑巴语 rule** (content/schema.md): every term exercised in both
   directions — produce *and* recognize in the wild. Named for Duolingo's
   ask-directions-but-can't-parse-the-answer failure, which the owner
   experienced directly.

Also from this round: big-picture context on the path page (course title +
promise + 卷一–卷四 stage map with per-stage "what you can do after"
milestones, from content/stages.json), per-lesson `why` rationale footnote,
and (future) lesson provenance footnotes (`source_refs`).

## 2026-08-27 — Visual identity: 「朱批」 design system

Owner rejected the black/white placeholder UI as depressing. Direction
chosen from the subject's own world — Chinese pedagogy — rather than
generic edtech: 月白 cool paper ground (deliberately not the AI-default
warm cream), 墨 ink text, 靛青 indigo as the interactive color (indigo-dye
cloth × terminal blue), 朱砂 vermilion reserved for exactly two things —
the 反三 seal (印章 brand mark) and the analogy-anchor cards, styled as a
teacher's vermilion margin notes (朱批), which is what anchors *are*.
松绿 for correct verdicts. Display type: Noto Serif SC; body stays Geist.
Tokens live in globals.css (light + dark). Signature element: the seal +
朱批 anchor card; boldness spent there, everything else quiet.

## 2026-08-27 — Onboarding questionnaire specced (docs/ONBOARDING.md)

Owner design input, distilled into a full spec (expands DESIGN.md §4's one
line). New beyond the original design: (a) career-stage/field questions so
examples can be tailored to the person, (b) an explicit **anti-goal
No-list** ("I do NOT need to write complex engineering code") as steering
signal, (c) explanation-style as a first-class asked preference (analogy
vs. definition vs. scenario vs. guess-first — the owner's own style is not
assumed to be everyone's), (d) a trial-vs-committed intent question that
changes early product behavior, (e) a scheduled **early re-anchor
checkpoint** at lesson 3 / day 3 collecting "was this useful, and if not
why" — distinct from threshold-triggered pulse checks. Rules: multi-selects
≤5 options, MECE. North-star feeling: fit, value, low cost. Implementation
stays in Phase 3; the spec exists now because it shapes learner_profiles
and Tier-1 prompts. Owner's own answers stay out of the public repo (PII).

## 2026-08-26 — Tagline v4 (final, owner's words): "Learning for real."

Owner vetoed the Analects line as front door: opaque to a stranger ("you
just said a sentence"), and its Chinese duplicated the app name on the same
screen. New rule extracted: a tagline must answer "what is this + why do I
care" at first glance; allusions are the name's story, not the pitch.
v3 ("Learning that becomes yours.") lasted minutes; the owner then wrote
the real one themselves: **"Learning for real." / 「学点真本事」** (zh picked
over 「学点能用的」 — 真本事 covers taste and judgment; 能用的 reads narrowly
utilitarian). Applied to UI dictionaries, app metadata, README, and repo
description.

## 2026-08-26 — Taste correction; tagline settled on the name itself

Owner reflection: the ladder overstated AI's limits — AI does allow
creation, even skipping judgment entirely. What it never builds is
**taste**: you can feel something is off but cannot say why or how, and
over time you slide into blindly delegating decisions you cannot parse.
WHY.md's ladder reframed from *access* to *ownership*. Tagline directive:
natural, humble, true, anchored on learning — not on AI. Settled on the
name itself: **"Shown one corner, return with three." / 举一反三** —
applied to UI, README, app metadata, and repo description. "AI sets your
floor…" demoted to essay prose.

## 2026-08-26 — Philosophy distilled: docs/WHY.md; tagline retracted again

Owner voice memo (ladder self-diagnosis, vacation story, Duolingo verdict,
tiering) distilled into [WHY.md](./WHY.md) — first-person, "words by
Jingyi," linked from README. Core formulations: the 理解→判断→创造 ladder;
"AI sets your floor, understanding sets your ceiling"; 宽进严出 tiering at
scale (retention layer funds the mission, capability layer defines it).
"Actually understand what your AI is doing" retracted as too small — it
described the first course, not the project. New tagline candidates live in
WHY.md; UI/app metadata keep the old line until the owner picks.

## 2026-08-26 — Content format: analogy-first, with mandatory break-point

Owner learns best through analogies and examples (stated preference). Two
changes: (1) the content schema requires an `anchor` block per new concept —
an analogy or a contrast to something the learner already knows (the M2
SQL anchors generalize to all modules); (2) `learner_profiles.preferences`
gains `explanation_style`, read by Tier-1 prompts so LLM explanations and
hints lead with an analogy.

Guardrail: analogies create fluency illusions, and the graduation bar is
precise understanding ("not vague concepts" — owner's own words). Mandatory
pair: **analogy + the precise term**. The analogy is the on-ramp, never the
destination.

*Refined same day after owner pushback:* the originally proposed third
element ("where the analogy breaks") is **demoted to conditional**. A
break-point note is included only when (a) the analogy predictably produces
a concrete misconception the learner would act on (e.g. "a variable is a
box" vs. Python references), and (b) the correction can be phrased using
already-taught concepts or a concrete example — otherwise cut it. Rejected:
mandatory break-points, because they optimize for completeness and generate
jargon-laden footnotes that are harder than the concept itself (the
proposal's own RLS example failed this test).

## 2026-08-26 — Naming, tagline, and the no-mixing UI rule

Display names: **For Three** (English) / **反三** (Chinese); `forthree` stays
as the slug (repo, package). From 举一反三 — "shown one corner, return with
three" — the name states the actual graduation bar: transfer, not coverage.

**UI language is all-or-nothing:** every surface renders fully Chinese or
fully English per the language setting — never mixed bilingual labels
("邮箱 / Email" is banned). Phase 0 screens default to English (owner
decision, revised same day from Chinese-first), with a language toggle
(cookie-based, hand-rolled dictionaries in `src/lib/i18n.ts` — pulled
forward from Phase 1 while the surface is two screens; next-intl only if
this outgrows itself). Technical terms
keeping their English originals inside Chinese content is per DESIGN.md and
is not "mixing."

**Tagline:** "Actually understand what your AI is doing." Owner rejected the
earlier "Learn to judge, not just to use" — the goal is *actually using* AI;
judgment is the evidence of real use, not the point. Chinese meta line
(independent, not a translation): 真正会用 AI 所需要的工程常识。

## 2026-08-26 — Project renamed: CodeLingua → **forthree**

Superseded in part by the naming entry above (For Three / 反三). CodeLingua
remains in DESIGN.md as the historical working name.

## 2026-08-26 — Graduation bar calibration: instant parse of real agent output

Owner feedback (with a screenshot of a live Claude Code session): after
graduating, seeing a real agent transcript — `gh auth status`, `git config`
checks, tool calls — should produce *immediate* understanding of what is
happening and why, not a vague familiarity. **Status: calibration reference,
not yet a content requirement.** It sharpens what "success criterion #4"
means; whether real transcripts become a first-class exercise type is a
Phase 1+ content decision.

## 2026-08-26 — Content sourcing: reuse-first, license-gated

Owner overrode DESIGN.md §3's "original exercises only" rule: **if
high-quality material exists with a compatible license, use it** — original
authoring is the fallback, not the default. Scouting for sources (curricula,
exercise banks with test cases, glossaries) happens before Phase 1 content
work. License compatibility is the gate: the repo is MIT; content borrowed
under CC-BY/CC-BY-SA keeps its own license in clearly marked directories;
NC-licensed material (CS50, MIT OCW) can be *linked/embedded* but not copied
in.

**Scout results (2026-08-26):**

| Source | License | Use |
|---|---|---|
| [Exercism python track](https://github.com/exercism/python) | MIT | **Copy/adapt.** Large exercise bank *with test suites* — maps directly onto `answer_spec` assertion tests for Pyodide. Primary exercise source; attribute in a NOTICE file. |
| [futurecoder](https://github.com/alexmojaki/futurecoder) | MIT | **Adapt content + borrow implementation patterns.** Complete interactive beginner Python course already running on Pyodide; its birdseye/debugger integration is battle-tested prior art. No Chinese translation exists. |
| Python official docs & tutorial | PSF (permissive) | **Copy/adapt** for glossary and reference material. |
| CS50P / CS50x | CC BY-NC-SA | **Link/embed only** (sequencing logic + timestamped video micro-clips, per DESIGN.md §3). |
| [mooc.fi Python MOOC](https://programming-26.mooc.fi/) | CC BY-NC-SA | **Reference only** — excellent 14-part sequencing benchmark; NC clause would constrain future multi-user options, so don't copy in. |
| py4e (Severance) | mixed CC-BY / CC BY-NC-SA | **Reference; check per-file.** Data-oriented framing is a good fit for a data-scientist learner. |

Net effect on cost: the expensive parts of content (exercises + test cases)
are largely coverable from MIT sources; original authoring concentrates on
(a) all Chinese content — no source has zh, it was always original work —
(b) SQL-contrast anchors and agent-era framing that make this course
forthree and not generic Python 101.

Honest prior-art note: futurecoder alone already delivers "free interactive
browser Python for beginners." forthree's reason to exist is everything it
lacks: bilingual, the taxonomy stage, agent-transcript literacy, SRS +
gamification, LLM feedback, and the judge-AI-output graduation bar.

## 2026-08-26 — Agent portability is a hard requirement

Owner rule (applies to all their projects): any coding agent (Claude Code,
Codex, …) must be able to pick up the repo cold. Concretely: `AGENTS.md` is
the canonical agent brief (`CLAUDE.md` points to it), all decisions and
work-in-progress live in committed docs (this file, `docs/`), nothing
load-bearing exists only in a chat transcript, and everything except secrets
is public on GitHub.

## 2026-08-26 — Runtime LLM: switchable-anytime; Anthropic default

DESIGN.md said "OpenAI default, Anthropic second." Amended: both providers are
first-class, symmetric implementations behind the adapter; switching is a pure
env change (`LLM_PROVIDER`), never a code change. Default is Anthropic
(micro tier: Haiku 4.5; planner tier: Sonnet 5) — the repo doubles as a
portfolio piece and the owner's context makes the Claude-powered story the
coherent one. Cost profile is equivalent either way.

## 2026-08-26 — Phase 1 narrowed to a Module 1 vertical slice

DESIGN.md Phase 1 authored Modules 1–4 in one phase. Amended: author **Module
1 only**, run the full loop on it (player, grading, XP, bilingual toggle), and
get owner sign-off on content quality, exercise feel, and bilingual copy
**before** batch-producing M2–4. Rationale: content is the project's dominant
cost and risk; producing four modules to an unvalidated format maximizes
rework.
