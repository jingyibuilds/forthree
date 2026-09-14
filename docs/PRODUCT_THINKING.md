# Product Thinking Notes

These notes capture the owner's working style so future agents can pick up the
product sensibility without relying on chat history.

## Owner Taste And Review Style

- The owner is comfortable with small, iterative slices, but rejects slices that
  feel like a thin outline rather than a real ability being built.
- "Short" is good when it is precise; "short plus too few nodes" feels like
  fun-to-know trivia.
- The course should make the learner feel they are acquiring independent
  judgment, especially the ability to understand what an AI coding agent has
  actually done, what it has only claimed, and where risk may have entered.
- The owner often spots second-order confusion: a thing may be correct in
  isolation but unclear in relation to the previous step, the next step, or the
  larger course path.
- Do not merely obey every suggested implementation literally. Extract the
  product principle, state your interpretation, then implement the version that
  best fits the repo and learning goal.
- The learner's ultimate goal is to use AI better. Computer science is not the
  initial product desire for many users; it is the method For Three earns
  permission to introduce.
- Important product signals should appear two or three times in different forms
  across a flow. Repeating the same explanatory sentence is not emphasis; it is
  noise.
- Expectation-setting should be honest without becoming avoidant. If a learner
  hopes the course will help them use AI to build more real things, preserve the
  motivating truth and narrow the promise instead of answering with a flat no.
- As an education product, For Three should spend words carefully. Use
  interaction, visual rhythm, examples, small symbols, and reveal states to
  carry meaning before adding more prose. If a screen needs many sentences, ask
  whether the concept should be practiced, pictured, or delayed.
- Fewer words cannot simply mean more screens. A short flow can be split into
  two or three purposeful beats; too many beats feels endless and weakens
  activation.
- Personalization should feel earned, not pasted on. First use deterministic
  scenario families and sharper local copy. Use runtime LLMs only as bounded
  micro-personalization when the result already knows what it wants to say.
- If a flow asks for personal input, the later screen must use it at roughly
  the same specificity. Shallow reuse of one or two words feels worse than an
  honest authored choice.
- Remove AI-template taste as an activation risk. If the UI or copy feels like
  a common LLM-generated app, users will skim before the product earns trust.
- Seek the stable 20% outside mainstream defaults: not weird, not ugly, not
  hype, but more specific and more durable than the average safe pattern.

## Teaching Product Principles

- Every lesson should answer a question the learner has a reason to ask.
- Every module should end with a demonstrable capability, not just a list of
  terms encountered.
- Every module should answer one sharper positioning question: what can the
  learner now refuse, pause, or challenge? Examples: a delivery with no
  checkable evidence, a red error pasted back without knowing the failure
  layer, a broad agent plan with no named tradeoff, or a deployment request
  that touches secrets without explaining why. "Refuse" means boundaries and
  judgment, not hostility.
- The core pain is collaboration leverage, not becoming a programmer. The
  learner wants to understand what programmers and AI agents are doing, why
  they are doing it, and how to inspect the work well enough to lower
  communication cost and make better technical calls from her own strengths.
- Frame CS concepts as tools for reducing information asymmetry. The learner
  is not memorizing vocabulary to sound technical; she is learning enough
  structure to see what is missing from a claim, request evidence, and take
  part in decisions that would otherwise happen behind a fog of jargon.
- Expose the curriculum as an incident line, then teach the interior in a
  knowledge order. The learner-facing map should start from lived situations:
  "it says it ran, but I don't know what happened", "the error is red and I
  can only paste it back", "one change broke another place", "they suggested
  caching and I don't know whether to agree". Inside each lesson, use the
  clean CS sequence needed to resolve that incident.
- A first encounter can be a small incident review rather than a preface. An
  authored AI-agent transcript or plausible-looking result with one hidden gap
  can create the need for the concept before naming it. Keep this humane:
  low-risk, short, deterministic, and recoverable inside the lesson.
- M0 is available as a bridge if the course needs more runway before M1. It
  should be orientation by incident, not a knowledge module: one small
  information-asymmetry moment, the course method, and the route ahead. M1
  should still feel like the first real technical module.
- If M0 exists, show it before the full onboarding form for invited first-time
  learners. Earn the learner's reason to care before asking them to set up a
  profile. Keep access narrow: M0 may run before onboarding; M1 and later still
  require onboarding. Do not pull existing M1 learners back to M0 after a
  content update.
- Judgment should move earlier over time. A lesson is stronger when it helps
  the learner ask one better question before work starts, request one clearer
  piece of evidence while work happens, or recognize one risk before it becomes
  an expensive after-the-fact correction.
- A strong learner with no coding background has logic and taste. Do not
  patronize them, but also do not smuggle in technical assumptions.
- Technical words can appear before they are fully taught when the learner's
  profile makes them familiar enough, but the content must label whether the
  word is "master this now", "recognize only", or "formalize later".
- Personalization should happen at marked anchors, examples, and scenarios.
  The core spine should stay stable enough to scale to other learners.
- Practice should feel like realistic collaboration, but runtime AI is not the
  default way to create that feeling. Prefer fixed scenarios, prepared variants,
  copyable prompts, deterministic checks, sorting/matching tasks, and authored
  explanations when they can teach the move.
- Use live AI inside the course only where it earns its cost: per-user
  customization, open-ended questions, and cases where static materials cannot
  reasonably cover the learner's context. Most AI leverage should happen during
  product development and course authoring.

## UI Product Principles

- Desktop and mobile are different learning contexts. Desktop can support a
  workbench layout with persistent course position; mobile should stay focused
  and linear.
- UI should show how small lessons accumulate into a skill. Completion counts
  are not enough; capability nodes and checkpoint tasks matter.
- Anything that looks clickable should either be clickable or visually read as
  information only.
- The lesson player should keep enough context visible that a learner knows why
  the current card exists.

## Team Operating Principles

- Treat owner feedback as signal about the product system, not only the named
  screen. Decide whether to update product principles, reviewer cards, decision
  logs, or code.
- Reviewers have different jobs, but the final product needs one brain. Use PM
  synthesis to accept, reject, or defer reviewer notes with product rationale.
- A local step can pass while the full journey fails. Always check the complete
  psychological path after step-level edits.
- Invite a human taste decision when a choice affects For Three's signature and
  the agent is defaulting to safe mainstream patterns.
