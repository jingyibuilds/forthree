import type { Locale } from "@/lib/i18n-shared";
import type { LearnerProfile } from "@/lib/profile";

export type ActivationAxis = "evidence" | "precheck" | "diff";
export type AxisLevel = 0 | 1 | 2 | 3;
export type PainType = "memory" | "claim" | "regression" | "overwrite" | "trust";
export type ActivationRoute = "A" | "B" | "C" | "skip";

export type DiagnosticAnswer = {
  questionId: string;
  optionId: string;
};

type Localized = {
  label_en: string;
  label_zh: string;
};

type DiagnosticOption = Localized & {
  id: string;
  axes: Partial<Record<ActivationAxis, AxisLevel>>;
};

export type PainChoice = Localized & {
  id: PainType;
  axis: ActivationAxis;
};

export type RoutingQuestion = {
  id: "stakes" | "friction";
  title_en: string;
  title_zh: string;
  options: Array<
    Localized & {
      id: string;
      score: AxisLevel;
    }
  >;
};

export type DiagnosticQuestion = {
  id: string;
  axis: ActivationAxis;
  title_en: string;
  title_zh: string;
  prompt_en: string;
  prompt_zh: string;
  artifact_en?: string;
  artifact_zh?: string;
  options: DiagnosticOption[];
};

type DiagnosticResultCopy = {
  area_en: string;
  area_zh: string;
  title_en: string;
  title_zh: string;
  body_en: string;
  body_zh: string;
  move_en: string;
  move_zh: string;
};

export type LocalizedDiagnosticResult = {
  axis: ActivationAxis;
  area: string;
  title: string;
  body: string;
  move: string;
};

export const painChoices: PainChoice[] = [
  {
    id: "memory",
    axis: "precheck",
    label_en: "It forgets rules I already gave.",
    label_zh: "说过的规则，它下次还是会忘。",
  },
  {
    id: "claim",
    axis: "evidence",
    label_en: "It says done, but I cannot verify it.",
    label_zh: "它说完成了，但我验不出来。",
  },
  {
    id: "regression",
    axis: "diff",
    label_en: "One fix breaks another part.",
    label_zh: "改好一处，又弄乱另一处。",
  },
  {
    id: "overwrite",
    axis: "diff",
    label_en: "I worry it will overwrite the original.",
    label_zh: "我怕它改没原来的东西。",
  },
  {
    id: "trust",
    axis: "evidence",
    label_en: "I do not know what to hand over.",
    label_zh: "我不知道什么能交给它。",
  },
];

export const routingQuestions: RoutingQuestion[] = [
  {
    id: "stakes",
    title_en: "If it got that wrong, what happens?",
    title_zh: "这件事如果它做错了，会怎么样？",
    options: [
      {
        id: "play",
        score: 0,
        label_en: "Nothing. I was just trying it.",
        label_zh: "无所谓，我只是试试看。",
      },
      {
        id: "redo",
        score: 1,
        label_en: "I would notice and redo it myself.",
        label_zh: "我会发现，自己重做就行。",
      },
      {
        id: "rework",
        score: 2,
        label_en: "I might notice late and have to rework.",
        label_zh: "我可能发现得晚，还得返工。",
      },
      {
        id: "consequence",
        score: 3,
        label_en: "Someone else would see it.",
        label_zh: "会给别人看到，或者有后果。",
      },
    ],
  },
  {
    id: "friction",
    title_en: "Have you hit this wall more than once?",
    title_zh: "这种卡住，发生过不止一次吗？",
    options: [
      {
        id: "often",
        score: 3,
        label_en: "Often, and I cannot tell where it goes wrong.",
        label_zh: "经常，而且我不知道问题在哪。",
      },
      {
        id: "sometimes",
        score: 2,
        label_en: "Sometimes, but I can usually work around it.",
        label_zh: "有过，但我一般能绕过去。",
      },
      {
        id: "rarely",
        score: 1,
        label_en: "Rarely. It mostly gives me what I ask for.",
        label_zh: "很少。我要什么，它基本给什么。",
      },
      {
        id: "not_really",
        score: 0,
        label_en: "I do not really use AI for this yet.",
        label_zh: "我平常还不太这样用 AI。",
      },
    ],
  },
];

export const diagnosticQuestions: DiagnosticQuestion[] = [
  {
    id: "d1",
    axis: "evidence",
    title_en: "It says it is done.",
    title_zh: "它说完成了。",
    prompt_en: "What do you do next?",
    prompt_zh: "你下一步会怎么做？",
    artifact_en:
      "You: Please handle this for me.\nAI: All done. I checked it, and everything looks fine.",
    artifact_zh:
      "你：帮我处理一下这件事。\nAI：已经处理好了，我也检查过，没问题。",
    options: [
      {
        id: "use",
        label_en: "Use it.",
        label_zh: "直接拿去用。",
        axes: { evidence: 0 },
      },
      {
        id: "spot_check",
        label_en: "Spot-check a few parts myself.",
        label_zh: "自己抽查几处。",
        axes: { evidence: 1 },
      },
      {
        id: "ask_rule",
        label_en: "Ask what rule it followed.",
        label_zh: "问它按什么标准做的。",
        axes: { evidence: 2 },
      },
      {
        id: "ask_coverage",
        label_en: "Ask what it covered and where it was unsure.",
        label_zh: "让它说清处理了多少，哪里不确定。",
        axes: { evidence: 3 },
      },
    ],
  },
  {
    id: "d2",
    axis: "precheck",
    title_en: "You already told it this once.",
    title_zh: "有件事，你上次已经交代过它。",
    prompt_en: "Now you need the same kind of thing again. Your first message is:",
    prompt_zh: "这次你又要让它做同一类的事。你的第一句话是：",
    options: [
      {
        id: "handle",
        label_en: '"Can you handle this?"',
        label_zh: "「帮我弄一下。」",
        axes: { precheck: 0 },
      },
      {
        id: "remind",
        label_en: '"Handle this, and do not repeat what I flagged last time."',
        label_zh: "「帮我弄，注意上次说过的别再犯。」",
        axes: { precheck: 1 },
      },
      {
        id: "list_changes",
        label_en: '"Handle this, then list everything you changed."',
        label_zh: "「帮我弄，弄完列出你动过的地方。」",
        axes: { precheck: 2 },
      },
      {
        id: "plan_first",
        label_en:
          '"Do not touch it yet. Tell me what you would change, what is off-limits, and how I should check it."',
        label_zh:
          "「先别动。先说你会改哪几处、哪些不能碰、改完我怎么检查。」",
        axes: { precheck: 3 },
      },
    ],
  },
  {
    id: "d3",
    axis: "diff",
    title_en: "A change summary looks reasonable.",
    title_zh: "一份改动说明看起来很合理。",
    prompt_en: "Which step is riskiest?",
    prompt_zh: "最可能出事的是哪一处？",
    artifact_en:
      "- Normalized the formatting\n- Removed duplicated parts\n- Saved the result over the original\n- Showed \"Done\"",
    artifact_zh:
      "- 统一了格式\n- 删掉了重复部分\n- 覆盖保存回原件\n- 显示「已完成」",
    options: [
      {
        id: "format",
        label_en: "Normalizing the formatting.",
        label_zh: "统一格式。",
        axes: { diff: 1 },
      },
      {
        id: "dedupe",
        label_en: "Removing duplicated parts.",
        label_zh: "删掉重复部分。",
        axes: { diff: 1 },
      },
      {
        id: "overwrite",
        label_en: "Saving over the original.",
        label_zh: "覆盖保存回原件。",
        axes: { diff: 3 },
      },
      {
        id: "done",
        label_en: 'Showing "Done."',
        label_zh: "显示「已完成」。",
        axes: { diff: 0 },
      },
    ],
  },
];

export const expectationItems = [
  {
    id: "credential",
    answer: false,
    claim_en: "I will get a certificate or a resume line.",
    claim_zh: "学完会拿到证书，或者一段能写进简历的经历。",
    verdict_en: "Not quite.",
    verdict_zh: "很多人会这样想，其实不是。",
    body_en:
      "This is not an accredited course. What you get is more everyday: when AI hands you something, you know where to look and what to ask.",
    body_zh:
      "这不是认证课程。它给你的是更日常的本事：下次 AI 交东西给你，你知道该看哪里、该问什么。",
  },
  {
    id: "prerequisite",
    answer: false,
    claim_en: "I need to know code before I can start.",
    claim_zh: "得先懂一点代码，才上得了这门课。",
    verdict_en: "No. Starting from zero is the assumption.",
    verdict_zh: "不用。零基础是默认假设。",
    body_en:
      "You will still touch a few lines of code and some English terms. That small amount is the point, so you stop talking around things.",
    body_zh:
      "但也不会完全不碰代码。你会读几行、跑一两次、认识一些英文术语。给你这“一点”，正是这门课的用处。",
  },
  {
    id: "tailored",
    answer: false,
    claim_en: "The course will be tailored to my job.",
    claim_zh: "课程会按我的职业来定制。",
    verdict_en: "No.",
    verdict_zh: "不会。",
    body_en:
      "The opening used your choice; the course itself is shared. That is deliberate: principles transfer because they are not rewritten for every job.",
    body_zh:
      "刚才用的是你的选择，课程本身还是同一套。不是省事，而是因为原理能迁移：它不需要按职业重写，也能用到你的场景里。",
  },
  {
    id: "build_product",
    answer: false,
    claim_en: "By the end, I should be able to build a product.",
    claim_zh: "学完就能自己做出一个产品。",
    verdict_en: "No. This course teaches judgment first.",
    verdict_zh: "不会。这门课先教判断。",
    body_en:
      "It helps you decide what to hand to AI, how to check it, and which moves are hard to undo. Building can come later.",
    body_zh:
      "它先帮你判断：什么能交给 AI，交回来怎么验，哪一步做了就难撤回。做东西可以以后再学。",
  },
] as const;

export const defaultDiagnosticMove = {
  en: "Do not touch it yet. Tell me what you would change, what is off-limits, and how I should check it.",
  zh: "先别动。先说你会改哪几处、哪些不能碰、改完我怎么检查。",
} as const;

const diagnosticResults: Record<ActivationAxis, DiagnosticResultCopy> = {
  evidence: {
    area_en: "Verification",
    area_zh: "Verification（验证）",
    title_en: "Your result: ask for evidence before trust.",
    title_zh: "测出来的是：先要证据，再信结果。",
    body_en:
      "Your answers point to one practice signal: AI can sound finished before it has shown what changed, what it checked, and what is still uncertain.",
    body_zh:
      "你的答案指向一个练习方向：AI 可以说得像已经完成，但还没交代它改了什么、查过什么、哪里不确定。",
    move_en:
      "Before I use this, show me what changed, what you checked, and what might still be wrong.",
    move_zh:
      "在我使用之前，先告诉我：你改了什么、查过什么、还有哪里可能不对。",
  },
  precheck: {
    area_en: "Context setup",
    area_zh: "Context（上下文）",
    title_en: "Your result: set rules before AI starts.",
    title_zh: "测出来的是：规则要放在 AI 动手前。",
    body_en:
      "Your answers point to one practice signal: the rules, limits, and checking method have to be visible before AI begins.",
    body_zh:
      "你的答案指向一个练习方向：规则、边界、怎么检查，都要在 AI 开始之前摆出来。",
    move_en:
      "Before you touch it, restate my constraints, what is off-limits, and how I should check the result.",
    move_zh:
      "先别动手。先复述我的要求、哪些地方不能碰、以及我该怎么验收结果。",
  },
  diff: {
    area_en: "Change control",
    area_zh: "Diff（改动差异）",
    title_en: "Your result: watch the change, not the promise.",
    title_zh: "测出来的是：别只听承诺，要看改动。",
    body_en:
      "Your answers point to one practice signal: a fix can break another part, or overwrite something you needed.",
    body_zh:
      "你的答案指向一个练习方向：它可能修好一处，又碰坏别处，或者盖掉原件。",
    move_en:
      "Make the smallest change first, show what else it may affect, and tell me how to undo it.",
    move_zh:
      "先做最小改动，说明还可能影响哪里，并告诉我怎么退回来。",
  },
};

const mechanismLines: Record<
  PainType,
  {
    en: string;
    zh: string;
  }
> = {
  memory: {
    en: "Saying it once is not the same as making it visible now. AI works from the material inside its context window. Important rules have to live where it will re-read them.",
    zh: "说过，不等于这次看得见。AI 只能根据这次 context window（上下文窗口）里的材料工作。重要规则要放在它每次都会重读的位置。",
  },
  claim: {
    en: '"Done" is not evidence. First define what done means, then ask what proof it used. Engineers call that verification.',
    zh: "「完成了」不是证据。先说清什么算完成，再问它拿什么证明。工程里把这种检查叫 verification（验证）。",
  },
  regression: {
    en: "AI may fix the part you named and break one you did not. When a new change breaks old behavior, engineers call it a regression.",
    zh: "它可能改对了你说的那处，又碰坏你没说的地方。新改动把旧东西弄坏，工程里叫 regression（回归）。",
  },
  overwrite: {
    en: "The dangerous step is often saving over the original. Overwrite changes the risk because undoing is no longer simple.",
    zh: "最危险的常常不是它写错，而是把结果盖回原件。overwrite（覆盖）会改变风险：事情不再只是“改回来”。",
  },
  trust: {
    en: "Handing work to AI is a risk choice. Ask two things: how costly a mistake would be, and whether it can be undone.",
    zh: "能不能交给 AI，是风险判断。先看两件事：错了代价多高，以及错了能不能撤回。",
  },
};

const axisPainFallback: Record<ActivationAxis, PainType> = {
  evidence: "claim",
  precheck: "memory",
  diff: "regression",
};

export function labelFor(
  item: { label_en: string; label_zh: string },
  locale: Locale
) {
  return locale === "zh" ? item.label_zh : item.label_en;
}

export function hasCompletedActivation(profile?: LearnerProfile | null) {
  const background = profile?.background;
  const v2 = background?.activation_v2;
  const v1 = background?.activation_diagnostic;
  return [v2, v1].some(
    (diagnostic) =>
      typeof diagnostic === "object" &&
      diagnostic !== null &&
      "completed" in diagnostic &&
      diagnostic.completed === true
  );
}

export function isPainType(value: string): value is PainType {
  return painChoices.some((choice) => choice.id === value);
}

export function scoreDiagnostic(answers: DiagnosticAnswer[]) {
  const result: Record<ActivationAxis, AxisLevel> = {
    evidence: 0,
    precheck: 0,
    diff: 0,
  };
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.optionId]));

  for (const question of diagnosticQuestions) {
    const option = question.options.find(
      (item) => item.id === answerMap.get(question.id)
    );
    if (!option) return null;
    for (const [axis, level] of Object.entries(option.axes)) {
      result[axis as ActivationAxis] = level as AxisLevel;
    }
  }

  return result;
}

export function weakestAxis(axes: Record<ActivationAxis, AxisLevel>) {
  return (Object.entries(axes).sort(
    (a, b) => a[1] - b[1]
  )[0]?.[0] ?? "precheck") as ActivationAxis;
}

export function routeActivation(
  stakes: AxisLevel | null,
  friction: AxisLevel | null
): ActivationRoute {
  if (stakes === null || friction === null) return "skip";
  if (stakes >= 2 && friction >= 2) return "A";
  if (stakes <= 1 && friction <= 1) return "C";
  return "B";
}

export function describeDiagnostic(
  axes: Record<ActivationAxis, AxisLevel>,
  locale: Locale,
  painType?: PainType | null
) {
  const selectedPain = painType ?? axisPainFallback[weakestAxis(axes)];
  return mechanismLines[selectedPain][locale];
}

export function getDiagnosticResult(
  axes: Record<ActivationAxis, AxisLevel>,
  locale: Locale
): LocalizedDiagnosticResult {
  const axis = weakestAxis(axes);
  const result = diagnosticResults[axis];
  return {
    axis,
    area: locale === "zh" ? result.area_zh : result.area_en,
    title: locale === "zh" ? result.title_zh : result.title_en,
    body: locale === "zh" ? result.body_zh : result.body_en,
    move: locale === "zh" ? result.move_zh : result.move_en,
  };
}

export function describePain(painType: PainType, locale: Locale) {
  const pain = painChoices.find((choice) => choice.id === painType) ?? painChoices[0];
  return labelFor(pain, locale);
}
