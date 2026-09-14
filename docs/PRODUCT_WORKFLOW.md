# Product Workflow

This is the operating loop for For Three learner-facing work. It exists so the
agent team can keep moving without losing the owner's product philosophy.

## North Star

For Three helps capable non-engineers use AI better.

The route is not prompt tricks and not a coding bootcamp. The route is a small,
durable layer of computer science and engineering literacy: enough structure to
see what AI changed, what it checked, what it cannot know, and what may be hard
to undo.

## Product Taste

For Three should not feel like the average AI-generated app. The safe mainstream
80% is useful for avoiding obvious mistakes, but flagship surfaces should search
for the stable 20%: choices that remain clear and accessible while feeling
owned, memorable, and hard to copy.

Anti-template taste is not decoration. It protects attention. When copy or UI
looks machine-smooth, generic, or trend-bound, learners skim before the product
has earned trust.

## Build Loop

Use this loop for landing, login, `/start`, onboarding, course-map, lesson-flow,
or other meaningful learner-facing changes.

1. Interpret the owner feedback.
   - What surface is named?
   - What deeper product principle is being corrected?
   - Does this require a reviewer card, product principle, decision log, or
     only a local implementation change?

2. Write a short feature brief.
   - Learner job:
   - Current friction or risk:
   - Smallest useful change:
   - Appetite:
   - Kill condition:
   - Primary action on screen:
   - Deterministic evidence of success:
   - Reviewers to run:

3. Run a capability ROI triage.
   - Is this a real capability gain, or only nicer packaging?
   - Can the product make it feel natural with current bandwidth?
   - What is the cheapest proof that it works?
   - What evidence would make us stop building it?
   - Low-ROI smells: the feature needs too much explanatory copy, asks for
     personal input it cannot reuse well, depends on brittle LLM prose, makes
     the static fallback feel worse, or adds workflow ceremony without sharper
     learner judgment.
   - Choose one path before polishing: ship, revise, keep dev-only, defer as
     named debt, kill from the main path, or ask the owner for the fork.

4. Map the psychological path.
   - Before this step, what is the learner likely thinking?
   - What do we want them to feel or understand next?
   - What could go wrong?
   - How does the UI dissolve the wrong turn without amplifying it?
   - What question does this step create for the next page?

5. Design the signal rhythm.
   - Important promises should appear two or three times as different signals.
   - Do not repeat the same sentence.
   - Do not make defensive explanations do the work of good flow.
   - Set a text budget for each screen. Prefer choices, reveal states, icons,
     examples, and learner action over paragraphs when they can carry the same
     meaning.
   - Do not solve density only by adding more screens. Splitting text helps only
     when the expected flow length still matches the learner's patience.

6. Check taste before implementation.
   - Is this the mainstream-safe answer?
   - Is there a stable, more signature alternative?
   - Is the signature choice clear, accessible, and not weird for its own sake?
   - If the agent cannot choose with confidence, ask the owner for a taste fork.

7. Implement narrowly.
   - Follow existing code patterns.
   - Keep unrelated refactors out.
   - Preserve deterministic grading, privacy, and auth boundaries.

8. Run the review panel.
   - Architecture Reviewer for meaningful code changes.
   - Interaction, Translation, Zero-Code Learner, Education, and AI-Era
     Engineer reviewers as relevant.
   - Native Chinese Copy Reviewer for Chinese first-run, onboarding, lesson, or
     result copy where translated phrasing would damage trust.
   - New User Activation Reviewer for first-run funnels.
   - Taste Signature Reviewer for flagship UI/copy.
   - PM Synthesis Reviewer after specialist reviews.

9. Synthesize and iterate.
   - Accept, reject, or defer each material note.
   - Assign every risky feature or enhancement one explicit decision: ship,
     revise, keep dev-only, defer with priority, kill, or ask the owner.
   - Apply accepted blockers.
   - Re-review until blockers are gone or an explicit owner decision is needed.
   - Do not polish a feature that the PM gate would likely kill; either remove
     it from the main path or park it behind a deliberate experiment boundary.

10. Record durable learning.
   - Product forks go in `docs/DECISIONS.md`.
   - Repeatable owner/agent procedures go in `docs/MAINTENANCE.md`.
   - Reviewer corrections go in the relevant reviewer card.
   - Product philosophy goes in `docs/PRODUCT_THINKING.md`.

11. Run the housekeeper pass.
   - Map changed files into: belongs in this change, pre-existing unrelated
     dirty work, generated artifact, or temporary scratch.
   - Remove duplicate helpers, stale copy, abandoned preview routes, and dead
     TODOs introduced during the iteration.
   - Check that docs and code describe the same behavior.
   - Run the relevant validation and `git diff --check`.
   - Before committing, stage only the coherent slice and report any dirty files
     deliberately left outside the commit.

## Human Decision Triggers

Ask the owner for direction instead of polishing the default when:

- The surface is a flagship first impression.
- Multiple taste directions are viable and none is clearly superior.
- The safest UI pattern looks like a common AI/SaaS template.
- Copy is accurate but has no human texture.
- A reviewer says "fine" without naming a memorable product signal.
- A change would shift positioning, curriculum scope, or For Three's signature.
- A feature is promising in theory but currently feels stiff, generic, or
  expensive to make humane.
- The team is choosing between killing a feature, keeping it dev-only, or
  making it a P1/P2 future bet.
