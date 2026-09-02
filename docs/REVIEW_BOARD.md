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

## Approval Rule

- Architecture approval is mandatory before final submission of meaningful code
  changes.
- Learner-facing changes should also get the relevant learning/product
  reviewers. If tool limits prevent all reviewers from running, say which ones
  ran, which ones did not, and why.
- Do not merge all perspectives into one fake voice when separate agents are
  available.

## Output Format

Each reviewer returns:

- Blockers
- Non-blocking concerns
- Approval status: `FINAL APPROVAL`, `APPROVED WITH NOTES`, or `NOT APPROVED`

## Memory Rule

Reviewer learning must be durable. Put reusable corrections in the relevant
reviewer card under `Learned Corrections`, and put product or architecture forks
in `docs/DECISIONS.md`.
