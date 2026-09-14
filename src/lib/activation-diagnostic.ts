import type { Locale } from "@/lib/i18n-shared";
import type { LearnerProfile } from "@/lib/profile";

export type ActivationAxis = "evidence" | "precheck" | "diff";
export type AxisLevel = 0 | 1 | 2 | 3;
export type ScenarioPresetId =
  | "code_task"
  | "research"
  | "organize"
  | "rewrite"
  | "summarize";
type ScenarioBridgeKind =
  | "code"
  | "research"
  | "organize"
  | "writing"
  | "summarize"
  | "general";
export type ActivationRoute = "A" | "B" | "C" | "skip";
export type ActivationReadinessLevel = "starting" | "everyday" | "mature";

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

export type ScenarioPresetChoice = Localized & {
  id: ScenarioPresetId;
};

export type ScenarioPresetDetails = {
  kind: ScenarioBridgeKind;
  label_en: string;
  label_zh: string;
  task_en: string;
  task_zh: string;
  artifact_en: string;
  artifact_zh: string;
  overwriteLine_en: string;
  overwriteLine_zh: string;
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
  bridge_en: string;
  bridge_zh: string;
  bridge_generic_en: string;
  bridge_generic_zh: string;
};

export type LocalizedDiagnosticResult = {
  axis: ActivationAxis;
  area: string;
  title: string;
  body: string;
  bridge: string;
  genericBridge: string;
};

type ReadinessResultCopy = {
  label_en: string;
  label_zh: string;
  title_en: string;
  title_zh: string;
  body_en: string;
  body_zh: string;
};

export type LocalizedReadinessResult = {
  level: ActivationReadinessLevel;
  score: number;
  label: string;
  title: string;
  body: string;
};

export const scenarioPresetChoices: ScenarioPresetChoice[] = [
  {
    id: "code_task",
    label_en: "Ask AI to finish a small code task",
    label_zh: "让 AI 做一个小代码任务",
  },
  {
    id: "research",
    label_en: "Ask AI to research and give me a conclusion",
    label_zh: "让 AI 查资料并给结论",
  },
  {
    id: "organize",
    label_en: "Ask AI to organize scattered notes",
    label_zh: "让 AI 整理零散信息",
  },
  {
    id: "rewrite",
    label_en: "Ask AI to rewrite something I wrote",
    label_zh: "让 AI 改一段文字",
  },
  {
    id: "summarize",
    label_en: "Ask AI to summarize something long",
    label_zh: "让 AI 总结一大段内容",
  },
];

export const scenarioPresetDetails: Record<
  ScenarioPresetId,
  ScenarioPresetDetails
> = {
  code_task: {
    kind: "code",
    label_en: "Ask AI to finish a small code task",
    label_zh: "让 AI 做一个小代码任务",
    task_en: "finish a small code task",
    task_zh: "做一个小代码任务",
    artifact_en: "code file",
    artifact_zh: "代码文件",
    overwriteLine_en: "Saved the new version over the original code file",
    overwriteLine_zh: "保存新版本时，覆盖了原来的代码文件",
  },
  research: {
    kind: "research",
    label_en: "Ask AI to research and give me a conclusion",
    label_zh: "让 AI 查资料并给结论",
    task_en: "research this and give me a conclusion",
    task_zh: "查资料并给结论",
    artifact_en: "research note",
    artifact_zh: "资料笔记",
    overwriteLine_en: "Saved the new version over the original research note",
    overwriteLine_zh: "保存新版本时，覆盖了原来的资料笔记",
  },
  organize: {
    kind: "organize",
    label_en: "Ask AI to organize scattered notes",
    label_zh: "让 AI 整理零散信息",
    task_en: "organize these scattered notes",
    task_zh: "整理零散信息",
    artifact_en: "notes",
    artifact_zh: "原始笔记",
    overwriteLine_en: "Saved the new version over the original notes",
    overwriteLine_zh: "保存新版本时，覆盖了原始笔记",
  },
  rewrite: {
    kind: "writing",
    label_en: "Ask AI to rewrite something I wrote",
    label_zh: "让 AI 改一段文字",
    task_en: "rewrite this draft",
    task_zh: "改一段文字",
    artifact_en: "draft",
    artifact_zh: "原稿",
    overwriteLine_en: "Saved the new version over the original draft",
    overwriteLine_zh: "保存新版本时，覆盖了原稿",
  },
  summarize: {
    kind: "summarize",
    label_en: "Ask AI to summarize something long",
    label_zh: "让 AI 总结一大段内容",
    task_en: "summarize this long material",
    task_zh: "总结一大段内容",
    artifact_en: "source document",
    artifact_zh: "原文档",
    overwriteLine_en: "Saved the new version over the original source document",
    overwriteLine_zh: "保存新版本时，覆盖了原文档",
  },
};

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
        label_en: "Someone else would see it. There would be consequences.",
        label_zh: "会给别人看到，或者有后果。",
      },
    ],
  },
  {
    id: "friction",
    title_en:
      "Has this happened — you explain the same thing several times, and it still doesn't do what you meant?",
    title_zh: "有没有过这种情况：同一件事你说了几次，它还是做不到你要的？",
    options: [
      {
        id: "often",
        score: 3,
        label_en: "Often — and I cannot tell where it goes wrong.",
        label_zh: "经常，而且我不知道问题在哪。",
      },
      {
        id: "sometimes",
        score: 2,
        label_en: "Sometimes, but I can usually reword my way around it.",
        label_zh: "有过，但我一般能换个说法绕过去。",
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
    title_en: "It says it's done.",
    title_zh: "它说完成了。",
    prompt_en: "What do you do next?",
    prompt_zh: "你会先怎么做？",
    artifact_en:
      "You: Please handle this: the thing I asked you to do.\nAI: All done — I went through it and it checks out.",
    artifact_zh:
      "你：请处理这件事：你上次让它做的那件事。\nAI：已经处理好了，都检查过，没问题。",
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
        label_en:
          "Ask how much it actually covered, and which parts it was not sure about.",
        label_zh: "让它说清楚实际处理了多少、哪几处它自己也不确定。",
        axes: { evidence: 3 },
      },
    ],
  },
  {
    id: "d2",
    axis: "precheck",
    title_en: "Before AI starts changing things.",
    title_zh: "在 AI 动手之前。",
    prompt_en: "Which first message gives you the cleanest handoff?",
    prompt_zh: "哪一句最容易让后面验得清楚？",
    options: [
      {
        id: "handle",
        label_en: '"Can you handle this?"',
        label_zh: "「帮我处理一下。」",
        axes: { precheck: 0 },
      },
      {
        id: "remind",
        label_en: '"Please be careful with the requirements I mentioned."',
        label_zh: "「注意我前面说过的要求。」",
        axes: { precheck: 1 },
      },
      {
        id: "list_changes",
        label_en: '"Handle it, then tell me what you changed."',
        label_zh: "「处理完告诉我你改了哪里。」",
        axes: { precheck: 2 },
      },
      {
        id: "plan_first",
        label_en:
          '"Before changing it, tell me what you will touch, what stays untouched, and how I can check it."',
        label_zh:
          "「先别改。先说你准备动哪里、哪里不动、我怎么验。」",
        axes: { precheck: 3 },
      },
    ],
  },
  {
    id: "d3",
    axis: "diff",
    title_en: "A summary of the changes looks reasonable.",
    title_zh: "一份改动说明看起来很合理。",
    prompt_en: "Which step is most likely to hurt?",
    prompt_zh: "最可能出事的是哪一处？",
    artifact_en:
      "- Normalized the formatting\n- Removed the duplicated parts\n- Saved the result back over the original file\n- Printed \"Done\"",
    artifact_zh:
      "- 统一了格式\n- 删掉了重复的部分\n- 把结果覆盖保存回原来那份东西\n- 显示「已完成」",
    options: [
      {
        id: "format",
        label_en: "Normalizing the formatting.",
        label_zh: "统一格式。",
        axes: { diff: 1 },
      },
      {
        id: "dedupe",
        label_en: "Removing the duplicates.",
        label_zh: "删掉重复的部分。",
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
        label_en: 'Printing "Done."',
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
    claim_en: "I will come out with a certificate, or something for my resume.",
    claim_zh: "学完这里，我会拿到证书，或者一段能写进简历的经历。",
    verdict_en: "No.",
    verdict_zh: "不是。",
    body_en:
      "No certificate. The gain is practical: know where to look when AI hands work back.",
    body_zh:
      "没有证书。收获是实用判断：AI 交回东西时，你知道先看哪里。",
  },
  {
    id: "prerequisite",
    answer: false,
    claim_en: "I need to know some code before I can take this.",
    claim_zh: "得先懂一点代码，才上得了这门课。",
    verdict_en: "No. Starting from zero is the assumption.",
    verdict_zh: "不用。零基础是默认假设。",
    body_en:
      "No code needed first. You will read a few lines and learn the terms that matter.",
    body_zh:
      "不用先会代码。你会读几行，认识真正用得上的术语。",
  },
  {
    id: "tailored",
    answer: false,
    claim_en: "The course will be tailored to my job.",
    claim_zh: "课程会按我的职业来定制。",
    verdict_en: "No.",
    verdict_zh: "不会。",
    body_en:
      "The opening uses your task choice for examples. The course teaches reusable checks: changes, evidence, rollback risk.",
    body_zh:
      "开头会按你选的任务换例子；课程教的是通用验收：看改动、看证据、看退路。",
  },
  {
    id: "build_product",
    answer: true,
    claim_en: "By the end, I should have a stronger foundation for using AI to build something real.",
    claim_zh: "学完之后，我会更有基础地用 AI 做出一点真实的东西。",
    verdict_en: "Yes.",
    verdict_zh: "对。",
    body_en:
      "AI can still do much of the hands-on build. You get better at directing, checking, and avoiding one-way moves.",
    body_zh:
      "动手搭建仍可交给 AI。你练的是指挥、验收，以及避开撤不回的步骤。",
  },
] as const;

const diagnosticResults: Record<ActivationAxis, DiagnosticResultCopy> = {
  evidence: {
    area_en: "Check the evidence",
    area_zh: "先看证据",
    title_en: "The issue may not be your prompt. It may be the handoff.",
    title_zh: "问题不一定是你没说清，而是交接时缺了证据。",
    body_en:
      '"Done" is only a claim. Using AI well means knowing where evidence should show up.',
    body_zh: "AI 说“完成了”，只是它的说法。你要能看见：它凭什么判断自己完成了。",
    bridge_en:
      "Ask what changed, how it checked, and what may still be wrong.",
    bridge_zh:
      "问它：改了什么、怎么验、哪里还可能不对。",
    bridge_generic_en:
      "Ask what changed, how it checked, and what may still be wrong.",
    bridge_generic_zh:
      "问它：改了什么、怎么验、哪里还可能不对。",
  },
  precheck: {
    area_en: "Setting boundaries before it acts",
    area_zh: "动手前先定边界",
    title_en: "The issue may not be saying more. It may be setting the edge earlier.",
    title_zh: "问题不一定是你说得不够多，而是边界没有放到动手前。",
    body_en:
      "AI is good at continuing. Good use means making it name what is allowed before it moves.",
    body_zh: "AI 很会顺着话往下做；真正用顺，是先让它说清哪些能动、哪些不能动。",
    bridge_en:
      "Before it moves, ask what can change, what is off-limits, and how to check it.",
    bridge_zh:
      "动手前先问：哪些能动、哪些不能动、改完怎么验。",
    bridge_generic_en:
      "Before it moves, ask what can change, what is off-limits, and how to check it.",
    bridge_generic_zh:
      "动手前先问：哪些能动、哪些不能动、改完怎么验。",
  },
  diff: {
    area_en: "See changes and rollback risk",
    area_zh: "看改动和退路",
    title_en: "The issue may not be the final output. It may be the hidden change.",
    title_zh: "问题不一定是结果难看，而是你看不见它动了哪里。",
    body_en:
      "A reasonable-looking change can still overwrite the original or break something nearby.",
    body_zh: "结果看起来顺，不代表改动安全。你要看见它改了哪里，以及还能不能撤回。",
    bridge_en:
      "See exactly what changed and whether you can roll it back.",
    bridge_zh:
      "别只听改动说明。看它动了哪里、有没有牵连、还能不能退回来。",
    bridge_generic_en:
      "See exactly what changed and whether you can roll it back.",
    bridge_generic_zh:
      "别只听改动说明。看它动了哪里、有没有牵连、还能不能退回来。",
  },
};

const readinessResults: Record<ActivationReadinessLevel, ReadinessResultCopy> = {
  starting: {
    label_en: "Handoff first",
    label_zh: "先看交接",
    title_en: "First, do not take “done” at face value.",
    title_zh: "先别急着相信“完成了”。",
    body_en:
      "When AI hands work back, look for three things: what changed, what proves it, and whether you can undo it.",
    body_zh:
      "AI 交回结果时，先看三件事：它改了什么、凭什么说对、出错能不能退回。",
  },
  everyday: {
    label_en: "Already using AI",
    label_zh: "能用起来",
    title_en: "You are using AI. Now make the handoff checkable.",
    title_zh: "你已经用得起来，下一步是把结果验清楚。",
    body_en:
      "This is less about writing a longer prompt, and more about giving every handoff a checking order.",
    body_zh:
      "不是多写几句提示词，而是每次 AI 交回结果时，都按固定顺序检查。",
  },
  mature: {
    label_en: "Strong checks",
    label_zh: "会检查",
    title_en: "You already ask good questions. Turn them into a process.",
    title_zh: "你已经会追问，接下来把检查变成流程。",
    body_en:
      "Put evidence, boundaries, and change risk in a steady order so you do not have to judge from feel each time.",
    body_zh:
      "证据、边界、改动风险，每次按同一个顺序查一遍，就不必临场凭感觉判断。",
  },
};

const axisMechanismLines: Record<ActivationAxis, { en: string; zh: string }> = {
  precheck: {
    en: "To set good boundaries, it helps to know what AI can see, what it cannot see, and what it is about to touch.",
    zh: "懂一点输入、文件和边界，才更容易在它动手前说清楚：哪些能碰，哪些不能碰。",
  },
  evidence: {
    en: "A little task structure tells you where evidence can live.",
    zh: "懂一点任务是怎么拆开的，才知道证据该在哪里出现。",
  },
  diff: {
    en: "To judge a change, you need to see what else it may touch.",
    zh: "懂一点版本和改动范围，才看得出一个小改动会牵动哪里。",
  },
};

const scenarioBridgeCopy: Record<
  ScenarioBridgeKind,
  Record<ActivationAxis, { en: string; zh: string }>
> = {
  code: {
    evidence: {
      en: 'For code, do not stop at "fixed." Ask what ran, what output came back, and what may still break.',
      zh: "做小代码任务时，别只听“修好了”。要看它跑了什么、输出是什么、哪里还没验。",
    },
    precheck: {
      en: "Before it edits, ask which files can change, what is off-limits, and how you will check it.",
      zh: "让 AI 改代码前，先问会动哪些文件、哪些不能碰、改完怎么检查。",
    },
    diff: {
      en: "After it edits, inspect what changed, what else it may touch, and whether you can roll back.",
      zh: "改完代码后，先看改动对照：动了哪里、有没有牵连、还能不能退回。",
    },
  },
  research: {
    evidence: {
      en: "For research, do not stop at the conclusion. Ask for sources, coverage, and uncertainty.",
      zh: "查资料时，别只收结论。要看来源、覆盖范围，以及哪些地方还不确定。",
    },
    precheck: {
      en: "Before it researches, set the scope, source quality, and what it should not conclude too fast.",
      zh: "开始查前先定：范围、可信来源、哪些地方不能急着下结论。",
    },
    diff: {
      en: "When it revises an answer, check what claims changed, what caveats disappeared, and which sources still support it.",
      zh: "结论改过之后，看判断变了什么、删了哪些限定、来源还能不能追。",
    },
  },
  organize: {
    evidence: {
      en: "For organizing, ask what got grouped, what got dropped, and what rule it used.",
      zh: "整理信息时，要看哪些被合并、哪些被丢掉、它按什么规则整理。",
    },
    precheck: {
      en: "Before it organizes, set the grouping rule, what must stay, and what meaning cannot change.",
      zh: "整理前先定：分类规则、必须保留什么、原意哪里不能动。",
    },
    diff: {
      en: "After organizing, check what moved, what is missing, and whether the original can still be found.",
      zh: "整理完看哪些位置变了、有没有漏项、原始材料还找不找得到。",
    },
  },
  writing: {
    evidence: {
      en: "For writing, do not only ask if it sounds good. Ask what brief it followed and where it may drift.",
      zh: "改文字时，别只看顺不顺。要看它保留了哪些要求，哪里可能跑偏。",
    },
    precheck: {
      en: "Before it writes, set tone, length, must-keep points, and what should stay untouched.",
      zh: "写之前先定：语气、长度、必须保留的点、不能碰的设定。",
    },
    diff: {
      en: "After it rewrites, check which lines changed, what got removed, and whether the old version is still there.",
      zh: "拿到文字后，别只看顺不顺。看它保留了什么、删了什么、有没有偏离原来的想法。",
    },
  },
  summarize: {
    evidence: {
      en: "For summaries, ask what was removed, what rule it used, and whether any key point went missing.",
      zh: "做摘要时，要看删了什么、按什么保留、有没有漏掉关键点。",
    },
    precheck: {
      en: "Before it summarizes, set the audience, length, and information that cannot be cut.",
      zh: "压缩前先定：给谁看、留多长、哪些信息不能删。",
    },
    diff: {
      en: "After the summary, compare what disappeared, what changed meaning, and whether it still matches the source.",
      zh: "摘要完成后，看哪些信息不见了、意思有没有变、还能不能对回原文。",
    },
  },
  general: {
    evidence: {
      en: "Ask what changed, how it checked, and what may still be wrong.",
      zh: "问它：改了什么、怎么验、哪里还可能不对。",
    },
    precheck: {
      en: "Before it moves, ask what can change, what is off-limits, and how to check it.",
      zh: "动手前先问：哪些能动、哪些不能动、改完怎么验。",
    },
    diff: {
      en: "See exactly what changed and whether you can roll it back.",
      zh: "看它动了哪里，还能不能退回来。",
    },
  },
};

function classifyScenarioBridge(
  preset?: ScenarioPresetId | null
): ScenarioBridgeKind {
  if (preset) return scenarioPresetDetails[preset].kind;
  return "general";
}

export function scenarioDetailsForPreset(
  preset: ScenarioPresetId | null,
  locale: Locale
) {
  if (!preset) return null;
  const details = scenarioPresetDetails[preset];
  return {
    kind: details.kind,
    label: locale === "zh" ? details.label_zh : details.label_en,
    task: locale === "zh" ? details.task_zh : details.task_en,
    artifact: locale === "zh" ? details.artifact_zh : details.artifact_en,
    overwriteLine:
      locale === "zh" ? details.overwriteLine_zh : details.overwriteLine_en,
  };
}

export function describeScenarioBridge({
  axis,
  locale,
  preset,
}: {
  axis: ActivationAxis;
  locale: Locale;
  preset?: ScenarioPresetId | null;
}) {
  const kind = classifyScenarioBridge(preset);
  return scenarioBridgeCopy[kind][axis][locale];
}

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

export function isScenarioPresetId(value: string): value is ScenarioPresetId {
  return scenarioPresetChoices.some((choice) => choice.id === value);
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
  return stakes >= 2 && friction >= 2 ? "A" : stakes <= 1 && friction <= 1 ? "C" : "B";
}

export function describeDiagnostic(
  axes: Record<ActivationAxis, AxisLevel>,
  locale: Locale
) {
  const selectedAxis = weakestAxis(axes);
  return axisMechanismLines[selectedAxis][locale];
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
    bridge: locale === "zh" ? result.bridge_zh : result.bridge_en,
    genericBridge:
      locale === "zh" ? result.bridge_generic_zh : result.bridge_generic_en,
  };
}

export function getActivationReadiness(
  axes: Record<ActivationAxis, AxisLevel>,
  locale: Locale
): LocalizedReadinessResult {
  const score = axes.evidence + axes.precheck + axes.diff;
  const level: ActivationReadinessLevel =
    score >= 7 ? "mature" : score >= 4 ? "everyday" : "starting";
  const copy = readinessResults[level];
  return {
    level,
    score,
    label: locale === "zh" ? copy.label_zh : copy.label_en,
    title: locale === "zh" ? copy.title_zh : copy.title_en,
    body: locale === "zh" ? copy.body_zh : copy.body_en,
  };
}

export function describeStakesSignal(score: AxisLevel | null, locale: Locale) {
  if (locale === "zh") {
    if (score === 3) return "会影响别人";
    if (score === 2) return "发现晚了要返工";
    if (score === 1) return "错了能重做";
    return "只是试试看";
  }
  if (score === 3) return "Others may see it";
  if (score === 2) return "Late errors mean rework";
  if (score === 1) return "You can redo it";
  return "Just trying it";
}

export function describeFrictionSignal(score: AxisLevel | null, locale: Locale) {
  if (locale === "zh") {
    if (score === 3) return "经常卡住";
    if (score === 2) return "偶尔卡住";
    if (score === 1) return "基本顺手";
    return "还不常这样用";
  }
  if (score === 3) return "Often stuck";
  if (score === 2) return "Sometimes stuck";
  if (score === 1) return "Mostly smooth";
  return "Not a habit yet";
}
