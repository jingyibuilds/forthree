import type { Locale } from "@/lib/i18n-shared";
import type { LearnerProfile } from "@/lib/profile";

export type ActivationAxis = "evidence" | "precheck" | "diff";
export type AxisLevel = 0 | 1 | 2 | 3;

export type DiagnosticAnswer = {
  questionId: string;
  optionId: string;
};

type DiagnosticOption = {
  id: string;
  label_en: string;
  label_zh: string;
  axes: Partial<Record<ActivationAxis, AxisLevel>>;
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

export const diagnosticQuestions: DiagnosticQuestion[] = [
  {
    id: "d1",
    axis: "evidence",
    title_en: "The agent says the bug is fixed.",
    title_zh: "AI 说 bug 已经修好了。",
    prompt_en: "What would you do next?",
    prompt_zh: "你下一步会怎么做？",
    artifact_en:
      "Agent: I fixed the bug and tests pass.\nChanged: checkout.py\nCommand: python scripts/lint.py\nOutput: OK",
    artifact_zh:
      "Agent: I fixed the bug and tests pass.（我修好了 bug，测试通过。）\nChanged: checkout.py（改动文件：checkout.py）\nCommand: python scripts/lint.py\nOutput: OK",
    options: [
      {
        id: "trust",
        label_en: "Accept it and move on.",
        label_zh: "相信它，继续做下一件事。",
        axes: { evidence: 0 },
      },
      {
        id: "manual_click",
        label_en: "Open the app and click around myself.",
        label_zh: "自己打开页面点一遍，看看是不是真的好了。",
        axes: { evidence: 1 },
      },
      {
        id: "raw_output",
        label_en: "Ask for the exact test command and raw output.",
        label_zh: "让它贴出测试命令原文和输出原文。",
        axes: { evidence: 3 },
      },
      {
        id: "changed_file",
        label_en: "Ask which file changed and how it verified the fix.",
        label_zh: "问它改了哪个文件、怎么验证修好了。",
        axes: { evidence: 2 },
      },
    ],
  },
  {
    id: "d2",
    axis: "precheck",
    title_en: "You need AI to touch a script you use every day.",
    title_zh: "你要让 AI 改一个每天都用的脚本。",
    prompt_en: "What is your first message?",
    prompt_zh: "你发出的第一句话是什么？",
    options: [
      {
        id: "do_it",
        label_en: "Make it support CSV too.",
        label_zh: "帮我改成也能处理 CSV。",
        axes: { precheck: 0 },
      },
      {
        id: "dont_break",
        label_en: "Make the change, but do not break existing behavior.",
        label_zh: "帮我改，注意别破坏原有功能。",
        axes: { precheck: 1 },
      },
      {
        id: "run_tests",
        label_en: "Make the change and run the tests afterward.",
        label_zh: "帮我改，改完跑一下测试。",
        axes: { precheck: 2 },
      },
      {
        id: "plan_first",
        label_en: "Do not edit yet. Tell me the plan, risks, and verification.",
        label_zh: "先别改。告诉我你打算动哪几处、有什么风险、怎么验证。",
        axes: { precheck: 3 },
      },
    ],
  },
  {
    id: "d3",
    axis: "diff",
    title_en: "A short change summary looks reasonable.",
    title_zh: "一段改动摘要看起来很合理。",
    prompt_en: "Where is the most likely problem?",
    prompt_zh: "这次改动里，最可能出问题的是哪一处？",
    artifact_en:
      "Changed cleanup.py:\n- accepts .csv files\n- removes duplicate rows\n- writes results back to customers.csv\n- prints Done",
    artifact_zh:
      "Changed cleanup.py（改动了 cleanup.py）：\n- accepts .csv files（支持 .csv 文件）\n- removes duplicate rows（删除重复行）\n- writes results back to customers.csv（把结果写回 customers.csv）\n- prints Done（打印 Done）",
    options: [
      {
        id: "csv",
        label_en: "Supporting CSV files.",
        label_zh: "支持 CSV 文件。",
        axes: { diff: 1 },
      },
      {
        id: "dedupe",
        label_en: "Removing duplicate rows.",
        label_zh: "删除重复行。",
        axes: { diff: 1 },
      },
      {
        id: "overwrite",
        label_en: "Writing results back to the original file.",
        label_zh: "把结果写回原文件。",
        axes: { diff: 3 },
      },
      {
        id: "done",
        label_en: "Printing Done.",
        label_zh: "打印 Done。",
        axes: { diff: 0 },
      },
    ],
  },
];

export const defaultDiagnosticMove = {
  en: "Do not edit yet. Tell me the plan, risks, and verification.",
  zh: "先别改。告诉我你打算动哪几处、有什么风险、怎么验证。",
} as const;

export function labelFor(
  item: { label_en: string; label_zh: string },
  locale: Locale
) {
  return locale === "zh" ? item.label_zh : item.label_en;
}

export function hasCompletedActivation(profile?: LearnerProfile | null) {
  const diagnostic = profile?.background?.activation_diagnostic;
  return (
    typeof diagnostic === "object" &&
    diagnostic !== null &&
    "completed" in diagnostic &&
    diagnostic.completed === true
  );
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

export function describeDiagnostic(
  axes: Record<ActivationAxis, AxisLevel>,
  locale: Locale
) {
  const weakestAxis = (Object.entries(axes).sort(
    (a, b) => a[1] - b[1]
  )[0]?.[0] ?? "precheck") as ActivationAxis;

  const profiles = {
    evidence: {
      en: "You tend to feel something is off, but the proof trail is still easy to miss.",
      zh: "你能感觉到不对劲，但还容易漏掉真正该看的证据。",
    },
    precheck: {
      en: "Your judgment shows up after delivery. The next gain is setting a gate before AI edits.",
      zh: "你的判断多半发生在交付之后。下一步，是在 AI 动手前先设一道关。",
    },
    diff: {
      en: "You can ask for evidence, but the risky part of a change can still hide in plain sight.",
      zh: "你会追问证据，但改动里最容易出事的位置，仍然可能藏在眼前。",
    },
  };

  return profiles[weakestAxis][locale];
}

