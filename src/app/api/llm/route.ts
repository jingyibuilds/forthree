import { NextResponse, type NextRequest } from "next/server";
import { getLesson } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";
import { getLLMProvider } from "@/lib/llm";
import { hasOpenRouterKey } from "@/lib/llm/openrouter";
import type { Exercise, Lesson } from "@/lib/content";
import type { Locale } from "@/lib/i18n-shared";

type LessonAssistantBody = {
  feature?: "lesson_assistant";
  lessonId?: string;
  blockIndex?: number;
  exerciseId?: string;
  locale?: Locale;
  question?: string;
  response?: string;
  progress?: {
    blockIndex?: number;
    totalBlocks?: number;
    answeredExerciseIds?: string[];
  };
};

const fallback = {
  en: "The lesson assistant is offline for now. Use the anchor card above, then compare your answer with the prompt one piece at a time.",
  zh: "助教现在暂时离线。先回看上面的朱批锚点，再把你的答案和题目逐句对照。",
} as const;

function parseUsd(value: string | undefined, defaultValue: number) {
  if (!value) return defaultValue;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : defaultValue;
}

function utcStartOfDay(now = new Date()) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();
}

function utcStartOfMonth(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function exercisePrompt(exercise: Exercise, locale: Locale) {
  if (exercise.type === "mcq") {
    const options = (locale === "zh" ? exercise.options_zh : exercise.options_en)
      .map((option, index) => `${index}. ${option}`)
      .join("\n");
    return `${locale === "zh" ? exercise.prompt_zh : exercise.prompt_en}\n${options}`;
  }
  return locale === "zh" ? exercise.prompt_zh : exercise.prompt_en;
}

function learnerAnswer(exercise: Exercise, response: string | undefined, locale: Locale) {
  if (!response) return "(no answer provided)";
  if (exercise.type !== "mcq") return response;
  const index = Number(response);
  const options = locale === "zh" ? exercise.options_zh : exercise.options_en;
  return Number.isInteger(index) && options[index] ? options[index] : response;
}

function lessonContext(lesson: Lesson, locale: Locale) {
  return lesson.blocks
    .filter((block) => block.type === "concept")
    .map((block) => {
      const term = locale === "zh" ? block.term_zh : block.term;
      const anchor = locale === "zh" ? block.anchor_zh : block.anchor_en;
      const explain = locale === "zh" ? block.explain_zh : block.explain_en;
      return `- ${term}\n  Anchor: ${anchor}\n  Explain: ${explain}`;
    })
    .join("\n");
}

function currentBlockContext(lesson: Lesson, blockIndex: number, locale: Locale) {
  const block = lesson.blocks[blockIndex];
  if (!block) return "No current block was provided.";
  if (block.type === "reading") {
    return locale === "zh" ? block.body_zh : block.body_en;
  }
  if (block.type === "concept") {
    return [
      `Term: ${locale === "zh" ? block.term_zh : block.term}`,
      `Anchor: ${locale === "zh" ? block.anchor_zh : block.anchor_en}`,
      `Explain: ${locale === "zh" ? block.explain_zh : block.explain_en}`,
    ].join("\n");
  }
  if (block.type === "visual") {
    return [
      `Visual: ${locale === "zh" ? block.title_zh : block.title_en}`,
      `Kind: ${block.kind}`,
      `Caption: ${locale === "zh" ? block.caption_zh : block.caption_en}`,
      `Alt: ${locale === "zh" ? block.alt_zh : block.alt_en}`,
    ].join("\n");
  }
  const exercise = lesson.exercises.find((e) => e.id === block.ref);
  return exercise
    ? `Current exercise:\n${exercisePrompt(exercise, locale)}`
    : `Current exercise id: ${block.ref}`;
}

function assistantSystem(locale: Locale) {
  if (locale === "zh") {
    return [
      "你是 forthree 的课内助教，服务对象是中文学习者。",
      "用简体中文回答。英文技术术语必须中文先行并在首次出现时括号标注英文。",
      "解释当前课内材料，优先用类比、对照或一个很小的例子。",
      "如果涉及练习题，不要直接泄露正确答案；先给提示或排除思路。",
      "最多 120 个汉字，语气温和、具体，不要说教。",
    ].join("\n");
  }

  return [
    "You are the in-lesson assistant for forthree.",
    "Explain the current lesson material with an analogy, contrast, or tiny example.",
    "If the learner is asking about an exercise, do not reveal the correct answer directly; give a hint or elimination step first.",
    "Keep it under 100 words, concrete, and warm.",
  ].join("\n");
}

async function currentSpendUsd(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  since: string
) {
  const { data } = await supabase
    .from("llm_usage")
    .select("cost_usd")
    .eq("user_id", userId)
    .gte("ts", since);

  return (data ?? []).reduce((sum, row) => sum + Number(row.cost_usd ?? 0), 0);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as LessonAssistantBody;
  const locale: Locale = body.locale === "zh" ? "zh" : "en";
  const lesson = body.lessonId ? getLesson(body.lessonId) : undefined;
  const blockIndex =
    Number.isInteger(body.blockIndex) && body.blockIndex! >= 0 ? body.blockIndex! : 0;
  const block = lesson?.blocks[blockIndex];
  const exerciseId = body.exerciseId ?? (block?.type === "exercise" ? block.ref : undefined);
  const exercise = exerciseId
    ? lesson?.exercises.find((e) => e.id === exerciseId)
    : undefined;
  const question = body.question?.trim();
  if (body.feature !== "lesson_assistant" || !lesson || !question) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  if (!hasOpenRouterKey()) {
    return NextResponse.json({
      text: fallback[locale],
      degraded: true,
      reason: "missing_key",
    });
  }

  const dailyCap = parseUsd(process.env.LLM_DAILY_CAP_USD, 1);
  const monthlyCap = parseUsd(process.env.LLM_MONTHLY_CAP_USD, 25);
  const [todaySpend, monthSpend] = await Promise.all([
    currentSpendUsd(supabase, user.id, utcStartOfDay()),
    currentSpendUsd(supabase, user.id, utcStartOfMonth()),
  ]);

  if (todaySpend >= dailyCap || monthSpend >= monthlyCap) {
    return NextResponse.json({
      text: fallback[locale],
      degraded: true,
      reason: "cost_cap",
    });
  }

  try {
    const completion = await getLLMProvider().complete({
      tier: "micro",
      system: assistantSystem(locale),
      maxTokens: 160,
      messages: [
        {
          role: "user",
          content: [
            `Lesson: ${locale === "zh" ? lesson.title_zh : lesson.title_en}`,
            `Progress: block ${blockIndex + 1} of ${lesson.blocks.length}; answered exercises: ${
              body.progress?.answeredExerciseIds?.join(", ") || "none"
            }`,
            "Current block:",
            currentBlockContext(lesson, blockIndex, locale),
            "Concepts:",
            lessonContext(lesson, locale),
            exercise
              ? [
                  "Relevant exercise:",
                  exercisePrompt(exercise, locale),
                  `Learner answer, if any: ${learnerAnswer(
                    exercise,
                    body.response,
                    locale
                  )}`,
                ].join("\n")
              : "No exercise is currently active.",
            `Learner question: ${question}`,
          ].join("\n\n"),
        },
      ],
    });

    const { error: usageError } = await supabase.from("llm_usage").insert({
      user_id: user.id,
      tier: "micro",
      provider: completion.provider,
      model: completion.model,
      tokens_in: completion.usage.tokensIn,
      tokens_out: completion.usage.tokensOut,
      cost_usd: completion.usage.costUsd,
    });

    return NextResponse.json({
      text: completion.text,
      degraded: false,
      usageSaved: !usageError,
    });
  } catch {
    return NextResponse.json({
      text: fallback[locale],
      degraded: true,
      reason: "provider_error",
    });
  }
}
