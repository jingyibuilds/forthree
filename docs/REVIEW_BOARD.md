# Review Board

For Three uses a small board of independent reviewers before meaningful
submission. Each reviewer should be spawned as a separate agent when the tool
environment allows it. Their role cards live in `docs/reviewers/`.

This mirrors the owner's Claude agent-fleet pattern: reviewer cards are living
documents, not one-off prompts. After a reviewer catches something important or
the owner corrects its judgment, update that reviewer's `Learned Corrections`
section so future reviews become sharper.

## Standing Reviewers

| Reviewer | File | Required when |
| --- | --- | --- |
| Architecture Reviewer | `docs/reviewers/architecture-reviewer.md` | Any meaningful code change before final submission. |
| Education Reviewer | `docs/reviewers/education-reviewer.md` | Lesson content, course structure, timing, assessments, practice design. |
| Interaction Reviewer | `docs/reviewers/interaction-reviewer.md` | UI, mobile/desktop flows, visual hierarchy, controls, states. |
| AI-Era Engineer Reviewer | `docs/reviewers/ai-era-engineer-reviewer.md` | Agent workflows, engineering judgment, technical realism, old-vs-new coding emphasis. |
| Zero-Code Learner Reviewer | `docs/reviewers/zero-code-learner-reviewer.md` | Learner-facing copy, onboarding, explanations, confusion/friction risk. |
| Translation Reviewer | `docs/reviewers/translation-reviewer.md` | Bilingual landing/login/course copy, especially when Chinese and English should not mirror each other. |
| Native Chinese Copy Reviewer | `docs/reviewers/native-chinese-copy-reviewer.md` | Chinese first-run, onboarding, lesson, and result copy where translated phrasing would damage trust. |
| New User Activation Reviewer | `docs/reviewers/new-user-activation-reviewer.md` | First-run funnels: landing, login, email-return handoff, `/start`, onboarding, Lesson 0 entry. |
| Taste Signature Reviewer | `docs/reviewers/taste-signature-reviewer.md` | Flagship learner-facing UI/copy where generic AI-template taste would reduce attention or trust. |
| PM Synthesis Reviewer | `docs/reviewers/pm-synthesis-reviewer.md` | After specialist review on learner-facing work, especially when reviewers disagree, owner feedback changes principles, or a feature needs a ship/revise/defer/kill decision. |
| Housekeeper Reviewer | `docs/reviewers/housekeeper-reviewer.md` | Before final delivery or commit after multi-file work, long-running iterations, preview/dev helpers, or any dirty worktree. |

## Approval Rule

- Architecture approval is mandatory before final submission of meaningful code
  changes.
- Learner-facing changes should also get the relevant learning/product
  reviewers. If tool limits prevent all reviewers from running, say which ones
  ran, which ones did not, and why.
- First-run funnel changes require the New User Activation Reviewer and PM
  Synthesis Reviewer. Flagship first-impression changes also require the Taste
  Signature Reviewer.
- When a feature feels promising but stiff, generic, hard to personalize well,
  or expensive relative to its learner gain, PM Synthesis must make an explicit
  disposition: ship, revise now, keep dev-only, defer with priority, kill from
  the main path, or ask the owner.
- Chinese first-run copy requires the Native Chinese Copy Reviewer in addition
  to the bilingual Translation Reviewer; the Chinese page must read like an
  original product surface, not a translation of the English.
- For learner-facing UI, review is operational, not decorative: reviewers must
  judge the same acceptance gates used during build, cite the rendered surfaces
  or files inspected, and withhold approval when a required viewport, language,
  action state, or copy-density gate has not been checked.
- After multi-file work, run the Housekeeper Reviewer or perform the same
  checklist locally: categorize dirty files, remove scraps you introduced, run
  validation, and stage only a coherent commit slice.
- Do not merge all perspectives into one fake voice when separate agents are
  available.

## Operating Loop

Use [PRODUCT_WORKFLOW.md](./PRODUCT_WORKFLOW.md) for meaningful learner-facing
work. The PM Synthesis Reviewer is the final product gate: it accepts, rejects,
or defers material reviewer notes and checks the combined journey against the
North Star before final delivery.

## Output Format

Each reviewer returns:

- Evidence checked
- Blockers
- Non-blocking concerns
- Approval status: `FINAL APPROVAL`, `APPROVED WITH NOTES`, or `NOT APPROVED`

## Memory Rule

Reviewer learning must be durable. Put reusable corrections in the relevant
reviewer card under `Learned Corrections`, and put product or architecture forks
in `docs/DECISIONS.md`.
