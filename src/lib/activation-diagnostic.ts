import type { Locale } from "@/lib/i18n-shared";
import type { LearnerProfile } from "@/lib/profile";

export type ActivationAxis = "evidence" | "precheck" | "diff";
export type AxisLevel = 0 | 1 | 2 | 3;
export type PainType = "memory" | "claim" | "regression" | "overwrite" | "trust";
export type ScenarioPainType = PainType | "none";
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

export type PainChoice = Localized & {
  id: PainType;
  axis: ActivationAxis;
};

export type ScenarioPresetChoice = Localized & {
  id: ScenarioPresetId;
};

export type ActivationScenarioSlots = {
  task: string | null;
  artifact: string | null;
};

export type ActivationScenarioExtraction = ActivationScenarioSlots & {
  roleContext: string | null;
  painType: ScenarioPainType | null;
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
    label_en: "Finish a small code task",
    label_zh: "完成一个小代码任务",
  },
  {
    id: "research",
    label_en: "Research something and give me an answer",
    label_zh: "查资料并给我一个结论",
  },
  {
    id: "organize",
    label_en: "Organize scattered notes",
    label_zh: "整理一堆零散信息",
  },
  {
    id: "rewrite",
    label_en: "Rewrite something I already wrote",
    label_zh: "改一段已经写好的话",
  },
  {
    id: "summarize",
    label_en: "Summarize something long",
    label_zh: "把很长的东西压成摘要",
  },
];

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
      "Your opening scene sets the hook. The course teaches reusable checks: changed, checked, undo risk.",
    body_zh:
      "开头借你的场景进入；课程教通用验收：改了什么、验了什么、哪里难撤回。",
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
    area_en: "Checking the handoff",
    area_zh: "看 AI 交接证据",
    title_en: "The issue may not be your prompt. It may be the handoff.",
    title_zh: "问题不一定是你没说清，而是交接时缺了证据。",
    body_en:
      '"Done" is only a claim. Using AI well means knowing where evidence should show up.',
    body_zh: "AI 说“完成了”只是一句话；把 AI 用好，要知道证据应该出现在哪里。",
    bridge_en:
      "Ask what changed, how it checked, and what may still be wrong.",
    bridge_zh:
      "别让 AI 再保证一次。问：改了什么、怎么验、哪里还可能不对。",
    bridge_generic_en:
      "Ask what changed, how it checked, and what may still be wrong.",
    bridge_generic_zh:
      "别让 AI 再保证一次。问：改了什么、怎么验、哪里还可能不对。",
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
    area_en: "Seeing what changed",
    area_zh: "看见它到底改了哪里",
    title_en: "The issue may not be the final output. It may be the hidden change.",
    title_zh: "问题不一定是结果难看，而是你看不见它动了哪里。",
    body_en:
      "A reasonable-looking change can still overwrite the original or break something nearby.",
    body_zh: "一个看起来合理的改动，可能盖掉原件，或者让别处出问题。",
    bridge_en:
      "See exactly what changed and whether you can roll it back.",
    bridge_zh:
      "别只听改动说明。看它动了哪里，还能不能退回来。",
    bridge_generic_en:
      "See exactly what changed and whether you can roll it back.",
    bridge_generic_zh:
      "别只听改动说明。看它动了哪里，还能不能退回来。",
  },
};

const readinessResults: Record<ActivationReadinessLevel, ReadinessResultCopy> = {
  starting: {
    label_en: "Handoff first",
    label_zh: "先看交接",
    title_en: "First, see what AI handed back.",
    title_zh: "先看清 AI 交回了什么。",
    body_en: "Look for changes, evidence, and a way back.",
    body_zh: "看改动、看证据、看退路。",
  },
  everyday: {
    label_en: "Already using AI",
    label_zh: "能用起来",
    title_en: "Longer prompts are not the fix. A checking frame is.",
    title_zh: "不是把提示词写更长，而是先有验收框架。",
    body_en:
      "When AI hands work back, check evidence, changes, and the way back.",
    body_zh:
      "AI 交回来时，看证据、看改动、看退路。",
  },
  mature: {
    label_en: "Strong checks",
    label_zh: "会检查",
    title_en: "Your checks are strong. Structure makes them sharper.",
    title_zh: "你已经会检查，结构会让它更准。",
    body_en:
      "You already look for proof, boundaries, and change risk. Give that instinct fixed places to look.",
    body_zh:
      "你已经会看证据、边界和改动风险。现在让这套直觉有固定落点。",
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
    en: "To set good boundaries, it helps to know what AI can see, what it cannot see, and what it is about to touch.",
    zh: "设边界前，先知道 AI 看得见什么、接下来会碰哪里。",
  },
  claim: {
    en: "A little task structure tells you where evidence can live.",
    zh: "懂一点任务结构，才知道证据可能在哪里。",
  },
  regression: {
    en: "To judge a change, you need to see what else it may touch.",
    zh: "验一次改动，要看它还可能碰到哪里。",
  },
  overwrite: {
    en: "Overwrite means the new version replaces the original. The risk is losing the easy way back.",
    zh: "overwrite（覆盖）就是新版本盖掉原件。风险是回退变难。",
  },
  trust: {
    en: "Hand-off depends on two things: cost of a mistake, and whether you can undo it.",
    zh: "能不能交给 AI，先看代价和退路。",
  },
};

const axisPainFallback: Record<ActivationAxis, PainType> = {
  evidence: "claim",
  precheck: "memory",
  diff: "regression",
};

const scenarioBridgeCopy: Record<
  ScenarioBridgeKind,
  Record<ActivationAxis, { en: string; zh: string }>
> = {
  code: {
    evidence: {
      en: 'For code, do not stop at "fixed." Ask what ran, what output came back, and what may still break.',
      zh: "放到代码里，别只听“修好了”。问：跑了什么、输出是什么、哪里还可能坏。",
    },
    precheck: {
      en: "Before it edits, ask which files can change, what is off-limits, and how you will check it.",
      zh: "动手前先问：会改哪些文件、哪些不能碰、改完怎么验。",
    },
    diff: {
      en: "After it edits, inspect what changed, what else it may touch, and whether you can roll back.",
      zh: "改完看：动了哪里、还影响哪里、能不能退回。",
    },
  },
  research: {
    evidence: {
      en: "For research, do not stop at the conclusion. Ask for sources, coverage, and uncertainty.",
      zh: "放到查资料里，别只收结论。问：来源在哪、覆盖多少、哪里不确定。",
    },
    precheck: {
      en: "Before it researches, set the scope, source quality, and what it should not conclude too fast.",
      zh: "开始查前先定：范围、可信来源、哪些地方不能急着下结论。",
    },
    diff: {
      en: "When it revises an answer, check what claims changed, what caveats disappeared, and which sources still support it.",
      zh: "结论改完看：判断变了什么、删了哪些限定、来源还能不能追。",
    },
  },
  organize: {
    evidence: {
      en: "For organizing, ask what got grouped, what got dropped, and what rule it used.",
      zh: "放到整理任务里，问：哪些被合并、哪些被丢掉、规则是什么。",
    },
    precheck: {
      en: "Before it organizes, set the grouping rule, what must stay, and what meaning cannot change.",
      zh: "整理前先定：分类规则、必须保留什么、原意哪里不能动。",
    },
    diff: {
      en: "After organizing, check what moved, what is missing, and whether the original can still be found.",
      zh: "整理完看：哪些位置变了、有没有漏项、原始材料还找不找得到。",
    },
  },
  writing: {
    evidence: {
      en: "For writing, do not only ask if it sounds good. Ask what brief it followed and where it may drift.",
      zh: "放到这段内容里，别只看顺不顺。问：按什么要求写、哪里可能跑偏。",
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
      zh: "放到摘要里，问：删了什么、按什么保留、有没有漏掉关键点。",
    },
    precheck: {
      en: "Before it summarizes, set the audience, length, and information that cannot be cut.",
      zh: "压缩前先定：给谁看、留多长、哪些信息不能删。",
    },
    diff: {
      en: "After the summary, compare what disappeared, what changed meaning, and whether it still matches the source.",
      zh: "摘要完成后，看删了哪些信息、有没有改意思、还能不能对回原文。",
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
  scenarioText: string,
  preset?: ScenarioPresetId | null
): ScenarioBridgeKind {
  if (preset === "code_task") return "code";
  if (preset === "research") return "research";
  if (preset === "organize") return "organize";
  if (preset === "rewrite") return "writing";
  if (preset === "summarize") return "summarize";

  const text = scenarioText.toLowerCase();
  if (/代码|code|script|python|bug|debug|报错|程序/.test(text)) return "code";
  if (/查资料|找资料|调研|搜索|检索|资料|research|sources?|来源|文献|结论/.test(text)) {
    return "research";
  }
  if (/整理|分类|organize|notes|笔记|表格|归纳/.test(text)) return "organize";
  if (/摘要|总结|summar|压缩/.test(text)) return "summarize";
  if (/写|改写|小说|情节|文案|段落|邮件|draft|rewrite|write|story|plot|copy|email/.test(text)) {
    return "writing";
  }
  return "general";
}

export function describeScenarioBridge({
  axis,
  locale,
  scenarioText,
  preset,
}: {
  axis: ActivationAxis;
  locale: Locale;
  scenarioText: string;
  preset?: ScenarioPresetId | null;
}) {
  const kind = classifyScenarioBridge(cleanScenarioText(scenarioText), preset);
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

export function isPainType(value: string): value is PainType {
  return painChoices.some((choice) => choice.id === value);
}

export function isScenarioPresetId(value: string): value is ScenarioPresetId {
  return scenarioPresetChoices.some((choice) => choice.id === value);
}

export function isScenarioPainType(value: string): value is ScenarioPainType {
  return value === "none" || isPainType(value);
}

function codepoints(value: string) {
  return Array.from(value);
}

export function truncateSlot(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const chars = codepoints(normalized);
  if (chars.length <= maxLength) return normalized;
  return `${chars.slice(0, Math.max(0, maxLength - 1)).join("").trim()}…`;
}

export function cleanScenarioText(value: string, maxLength = 300) {
  return truncateSlot(
    value
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
    maxLength
  );
}

const zhArtifactHints = [
  "笔记",
  "邮件",
  "文案",
  "记录",
  "访谈",
  "简历",
  "表格",
  "文件",
  "文章",
  "摘要",
  "方案",
  "报告",
  "材料",
  "草稿",
];

const enArtifactHints = [
  "notes",
  "email",
  "paragraph",
  "draft",
  "document",
  "file",
  "spreadsheet",
  "presentation",
  "summary",
  "resume",
  "report",
  "transcript",
  "copy",
];

export function inferLocalActivationScenario(
  verbatim: string,
  locale: Locale
): ActivationScenarioExtraction {
  const text = cleanScenarioText(verbatim);
  if (!text) {
    return { task: null, artifact: null, roleContext: null, painType: null };
  }

  const withoutPreamble =
    locale === "zh"
      ? text
          .replace(/^最近一次我?想让\s*AI\s*帮我/, "")
          .replace(/^我想让\s*AI\s*帮我/, "")
          .replace(/^让\s*(它|AI)\s*帮我/, "")
          .replace(/^帮我/, "")
          .replace(/^请/, "")
      : text
          .replace(/^the last thing i wanted ai to do for me was\s+/i, "")
          .replace(/^i wanted ai to\s+/i, "")
          .replace(/^i want ai to\s+/i, "")
          .replace(/^ai to\s+/i, "")
          .replace(/^please\s+/i, "");
  const task = truncateSlot(
    (withoutPreamble || text).replace(/[。.!?？；;，,]+$/g, ""),
    locale === "zh" ? 22 : 64
  );
  const lower = text.toLowerCase();
  const artifact =
    locale === "zh"
      ? zhArtifactHints.find((hint) => text.includes(hint)) ?? null
      : enArtifactHints.find((hint) => lower.includes(hint)) ?? null;

  return {
    task,
    artifact: artifact ? truncateSlot(artifact, locale === "zh" ? 8 : 24) : null,
    roleContext: null,
    painType: null,
  };
}

function hasUnsafeGeneratedShape(value: string) {
  return (
    /[\n\r]/.test(value) ||
    /```|[*#<>]/.test(value) ||
    /https?:\/\//i.test(value)
  );
}

export function validateActivationScenarioExtraction(
  value: unknown,
  locale: Locale
): ActivationScenarioExtraction | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const painType = typeof record.pain_type === "string" ? record.pain_type : null;
  if (painType !== null && !isScenarioPainType(painType)) return null;

  const maxTask = locale === "zh" ? 12 : 40;
  const maxArtifact = locale === "zh" ? 6 : 20;
  const maxRole = locale === "zh" ? 8 : 24;
  const readSlot = (key: string, maxLength: number) => {
    const slot = record[key];
    if (slot === null || slot === undefined || slot === "") return null;
    if (typeof slot !== "string") throw new Error("invalid slot");
    const cleaned = slot.trim();
    if (!cleaned) return null;
    if (hasUnsafeGeneratedShape(cleaned)) throw new Error("invalid slot");
    if (codepoints(cleaned).length > maxLength) throw new Error("invalid slot");
    return cleaned;
  };

  try {
    return {
      task: readSlot("task", maxTask),
      artifact: readSlot("artifact", maxArtifact),
      roleContext: readSlot("role_context", maxRole),
      painType: painType,
    };
  } catch {
    return null;
  }
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
  friction: AxisLevel | null,
  painType?: ScenarioPainType | null
): ActivationRoute {
  if (stakes === null || friction === null) return "skip";
  const route = stakes >= 2 && friction >= 2 ? "A" : stakes <= 1 && friction <= 1 ? "C" : "B";
  if (route === "B" && painType === "none") return "C";
  return route;
}

export function describeDiagnostic(
  axes: Record<ActivationAxis, AxisLevel>,
  locale: Locale
) {
  const selectedPain = axisPainFallback[weakestAxis(axes)];
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

export function describePain(painType: PainType, locale: Locale) {
  const pain = painChoices.find((choice) => choice.id === painType) ?? painChoices[0];
  return labelFor(pain, locale);
}
