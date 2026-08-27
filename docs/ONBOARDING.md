# Onboarding Questionnaire Spec

> v1 (2026-08-27), from owner design input. Implements in Phase 3; specced
> now because it shapes the learner-profile schema and Tier-1 prompts.
> Expands DESIGN.md §4's one-line onboarding note.

## Design principles (owner's words, distilled)

1. **The questionnaire is a bonding moment, not a form.** Answering "who am
   I, how do I learn, what do I want" is the learner's first act of taking
   the course seriously — and their first act of self-knowledge about
   learning. Copy should feel like that, not like a signup survey.
2. **Examples should fit the person.** A 20-year executive and a first-year
   art grad need different anchors. Career stage + field feed example
   tailoring: static content keeps its default anchor (e.g. SQL for a data
   person); Tier-1/Tier-2 LLM calls re-frame anchors using the profile.
3. **Ask for the No-list, not just the Yes-list.** Explicit anti-goals
   ("I do NOT need to write complex engineering code") are stronger
   steering signal than goals, and they license the course to cut content.
4. **Multi-selects: ≤ 5 options, MECE.** Every option list below follows
   this. Free text only where a fixed list would flatten the answer.
5. **Explanation style is a first-class preference.** Some people want the
   definition straight; some (like the first user) only understand a
   definition after translating it into something they can relate to.
   Neither is the default; ask.

## The questionnaire

All learner-facing copy exists in zh and en (all-or-nothing per UI
language). Single-select unless marked.

### Part A — 你是谁 / Who you are (feeds example tailoring)

**A1. 你现在的阶段** / Your current stage
在校学生 · 工作 0–3 年 · 工作 3–10 年 · 工作 10 年以上 · 暂时不在工作
(Student · Working 0–3 yrs · 3–10 yrs · 10+ yrs · Not working right now)

**A2. 你最熟悉的领域** / The field you know best
数据/分析 · 工程/技术 · 设计/创意 · 商业/运营/市场 · 其他(填空)
(Data/analytics · Engineering/tech · Design/creative · Business/ops ·
Other — free text)

**A3. 年龄段(可跳过)** / Age band (skippable)
18 以下 · 18–25 · 26–35 · 36–50 · 50+

### Part B — 你怎么学 / How you learn (feeds preferences)

**B1. 上手一个新东西,你的自然顺序是** / Your natural order
先动手试错,再回头看解释 · 先听懂原理,再动手 · 看着例子边模仿边学 ·
跟着练习一步一步来
(Try first, read later · Understand first, then do · Imitate from
examples · Follow guided practice)

**B2. 理解一个新概念,哪种最像你** / What makes a definition land
直接给我精确定义 · 先给一个我能 relate 的比喻或对照 · 给我一个真实场景
的例子 · 让我先猜,猜错了再纠正我
(The precise definition, straight · An analogy to something I know ·
A real scenario · Let me guess, then correct me)
→ `explanation_style`: definition_first / analogy_first / scenario_first /
guess_first

**B3. 你明确不喜欢的(多选)** / What you know you dislike (multi)
大段文章 · 视频讲解 · 死记硬背 · 过于简单的重复练习 · 没有反馈的自学
(Long readings · Video lectures · Rote memorization · Trivially easy
drills · Practicing without feedback)

### Part C — 你要什么 / What you want (feeds plan + Tier-2)

**C1. 学完之后,你希望自己能(多选,≤5)** / By the end, you want to be
able to (multi)
读懂代码和报错,判断 AI 给的对不对 · 自己写小脚本解决实际问题 ·
看懂技术文档和工程师的讨论 · review 别人(或 AI)写的代码 ·
独立搭一个自己的小应用
(Read code & errors well enough to judge AI output · Write small scripts
for real tasks · Follow technical docs & engineer conversations · Review
code written by others or AI · Build a small app of my own)

**C2. 你明确不追求的(多选)** / Explicitly NOT goals (multi)
成为职业软件工程师 · 写大型/复杂的工程代码 · 刷题准备技术面试 ·
掌握底层理论(算法证明、编译原理) · 以上都不排除
(Becoming a professional engineer · Writing large/complex production code ·
Grinding interview problems · Deep theory · None excluded)

**C3. 一句话:学完之后的你,正在做什么?**(自由文本)
/ One sentence: after this course, what are you doing? (free text)
→ `success_definition` seed; revisited at every stage checkpoint
(the evolving success definition, DESIGN.md §4).

### Part D — 现实约束与状态 / Constraints & intent

**D1. 你现在的状态** / Where you are right now
先试试看,看看合不合适 · 打算认真学完
(Trying it out to see if it fits · Committed to finishing)
→ `commitment`: trial / committed. Trial mode changes the product's
behavior: get to a first "this is useful" moment faster, defer heavier
setup, and treat the early re-anchor checkpoint (below) as the real
conversion moment.

**D2. 每周真实能投入** / Honest weekly time
1 小时以内 · 1–2 小时 · 2–5 小时 · 5 小时以上

**D3. 内容语言默认** / Default content language: 中文 · English

Then: the 10-item calibration quiz (DESIGN.md §4) — placement is measured,
not just self-reported.

## Early re-anchor checkpoint (owner addition, 2026-08-27)

After **lesson 3 or day 3, whichever comes first**, one scheduled check-in
(distinct from threshold-triggered pulse checks, same `pulse_checks` table,
`trigger_reason: "early_anchor"`):

1. One tap: 到目前为止,这对你有用吗? / Has this been useful so far?
   很有用 · 有点用 · 没什么用 · 不太相关
2. If the answer is negative: one follow-up collecting **why** (太简单 ·
   太难 · 例子不贴合我 · 内容不是我要的 · 太花时间 · 自由文本). This is
   the highest-value feedback moment in the whole funnel — the person is
   still here, and they're telling you exactly what to fix.
3. The answer feeds the next Tier-2 replan directly, and for `trial` users
   this checkpoint is the conversion moment: a positive answer is when to
   invite real commitment.

**North-star feeling** (owner's words, the test every onboarding and
early-session decision must pass): the user should end week one thinking
"这个东西太适合我了,对我真的很有价值,而且它不费我的时间" — *this fits
me, it's genuinely valuable, and it doesn't cost me time.* Fit, value, low
cost — in that order, all three.

## Profile mapping

| Questions | `learner_profiles` field | Consumed by |
|---|---|---|
| A1–A3 | `background` | Tier-1 example re-anchoring; Tier-2 |
| B1–B3 | `preferences` (modality, explanation_style, dislikes) | Tier-1 prompt template; lesson modality choice |
| C1–C2 | `background.goals` / `background.anti_goals` | Plan seeding; Tier-2 replanning; elective pruning |
| C3 | `success_definition` | Stage checkpoints; capstone spec |
| D1 | `weekly_budget_hours` | Pacing, streak expectations |
| D2 | `lang_pref` | Content locale |

Anti-goals are honored the same way core/elective is: Tier-2 may prune or
reframe toward them, but core lessons still can't be silently deleted —
skip-with-debt applies (DESIGN.md §4).
