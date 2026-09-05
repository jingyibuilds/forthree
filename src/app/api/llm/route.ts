import { NextResponse, type NextRequest } from "next/server";
import { canEnterLearnerApp } from "@/lib/access";
import { getLesson } from "@/lib/content";
import { createClient } from "@/lib/supabase/server";
import { getLLMProvider } from "@/lib/llm";
import { hasOpenRouterKey } from "@/lib/llm/openrouter";
import { getLearnerProfile } from "@/lib/profile";
import type { Exercise, Lesson } from "@/lib/content";
import type { Locale } from "@/lib/i18n-shared";

type LessonAssistantBody = {
  feature?: "lesson_assistant";
  threadId?: string;
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

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type AssistantThreadRow = { id: string };

const fallback = {
  en: "I can’t generate a new answer right now. Try this 30-second check: reread the marked clue, name the exact claim in the question, then compare your answer one sentence at a time.",
  zh: "我现在暂时不能生成新回答。先做一个 30 秒检查：回看上面的朱批锚点，说清题目到底在问什么，再把你的答案逐句对照。",
} as const;

function parseUsd(value: string | undefined, defaultValue: number) {
  if (!value) return defaultValue;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : defaultValue;
}

function parsePositiveInt(value: string | undefined, defaultValue: number) {
  if (!value) return defaultValue;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultValue;
}

function retainedUntilIso(now = new Date()) {
  const days = parsePositiveInt(process.env.LLM_HISTORY_RETENTION_DAYS, 30);
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
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
  if (exercise.type === "drag_order") {
    const items = (locale === "zh" ? exercise.items_zh : exercise.items_en)
      .map((item, index) => `${index}. ${item}`)
      .join("\n");
    return `${locale === "zh" ? exercise.prompt_zh : exercise.prompt_en}\n${items}`;
  }
  return locale === "zh" ? exercise.prompt_zh : exercise.prompt_en;
}

function learnerAnswer(exercise: Exercise, response: string | undefined, locale: Locale) {
  if (!response) return "(no answer provided)";
  if (exercise.type === "mcq") {
    const index = Number(response);
    const options = locale === "zh" ? exercise.options_zh : exercise.options_en;
    return Number.isInteger(index) && options[index] ? options[index] : response;
  }
  if (exercise.type === "drag_order") {
    try {
      const indices = JSON.parse(response) as unknown;
      const items = locale === "zh" ? exercise.items_zh : exercise.items_en;
      if (Array.isArray(indices)) {
        return indices
          .map((index) => (Number.isInteger(index) ? items[index] : undefined))
          .filter(Boolean)
          .join(" -> ");
      }
    } catch {
      return response;
    }
  }
  return response;
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

function blockContextLine(lesson: Lesson, index: number, locale: Locale) {
  const block = lesson.blocks[index];
  if (!block) return "";
  const prefix = `Block ${index + 1}/${lesson.blocks.length}`;
  if (block.type === "reading") {
    const text = locale === "zh" ? block.body_zh : block.body_en;
    return `${prefix} reading: ${text.slice(0, 420)}`;
  }
  if (block.type === "concept") {
    return `${prefix} concept: ${locale === "zh" ? block.term_zh : block.term}`;
  }
  if (block.type === "visual") {
    return [
      `${prefix} visual: ${locale === "zh" ? block.title_zh : block.title_en}`,
      `Caption: ${locale === "zh" ? block.caption_zh : block.caption_en}`,
    ].join("\n");
  }
  const exercise = lesson.exercises.find((e) => e.id === block.ref);
  return exercise ? `${prefix} exercise: ${exercisePrompt(exercise, locale)}` : "";
}

function nearbyBlockContext(lesson: Lesson, blockIndex: number, locale: Locale) {
  const start = Math.max(0, blockIndex - 1);
  const end = Math.min(lesson.blocks.length - 1, blockIndex + 2);
  const lines = [];
  for (let i = start; i <= end; i++) {
    const line = blockContextLine(lesson, i, locale);
    if (line) lines.push(line);
  }
  return lines.join("\n\n");
}

function contextSnapshot(
  lesson: Lesson,
  blockIndex: number,
  exercise: Exercise | undefined,
  body: LessonAssistantBody,
  locale: Locale
) {
  return {
    feature: body.feature,
    lesson_id: lesson.id,
    lesson_title: locale === "zh" ? lesson.title_zh : lesson.title_en,
    block_index: blockIndex,
    total_blocks: lesson.blocks.length,
    block_type: lesson.blocks[blockIndex]?.type,
    exercise_id: exercise?.id ?? null,
    locale,
    answered_exercise_ids: body.progress?.answeredExerciseIds ?? [],
  };
}

function learningSignal(
  role: "user" | "assistant",
  text: string,
  lesson: Lesson,
  blockIndex: number,
  locale: Locale
) {
  const normalized = text.toLowerCase();
  const topicTags = [
    ["terminal", ["terminal", "终端", "命令行"]],
    ["command", ["command", "命令"]],
    ["run-button", ["run button", "run 按钮", "运行按钮"]],
    ["location-prompt", ["forthree %", "prompt", "提示符", "位置"]],
    ["output", ["output", "输出"]],
    ["python", ["python", "python3"]],
  ]
    .filter(([, keywords]) => (keywords as string[]).some((keyword) => normalized.includes(keyword)))
    .map(([tag]) => tag);

  return {
    role,
    lesson_id: lesson.id,
    block_index: blockIndex,
    locale,
    topic_tags: topicTags,
    confusion_type:
      role === "user" && topicTags.some((tag) => tag === "terminal" || tag === "command")
        ? "artifact_mapping"
        : null,
    summary:
      text.length > 180 ? `${text.slice(0, 177).trim()}...` : text,
  };
}

async function compactExpiredAssistantMessages(supabase: SupabaseServerClient, userId: string) {
  await supabase
    .from("lesson_assistant_messages")
    .update({
      body: null,
      context_snapshot: { compacted: true },
      body_compacted_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .lt("body_retained_until", new Date().toISOString())
    .is("body_compacted_at", null);
}

async function ensureAssistantThread(
  supabase: SupabaseServerClient,
  userId: string,
  requestedThreadId: string | undefined,
  lesson: Lesson,
  blockIndex: number,
  locale: Locale
) {
  if (requestedThreadId) {
    const { data } = await supabase
      .from("lesson_assistant_threads")
      .select("id")
      .eq("id", requestedThreadId)
      .eq("user_id", userId)
      .maybeSingle<AssistantThreadRow>();

    if (data?.id) {
      await supabase
        .from("lesson_assistant_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", data.id)
        .eq("user_id", userId);
      return data.id;
    }
  }

  const { data } = await supabase
    .from("lesson_assistant_threads")
    .insert({
      user_id: userId,
      lesson_id: lesson.id,
      started_block_index: blockIndex,
      locale,
    })
    .select("id")
    .single<AssistantThreadRow>();

  return data?.id;
}

async function insertAssistantMessage(
  supabase: SupabaseServerClient,
  params: {
    threadId: string | undefined;
    userId: string;
    role: "user" | "assistant";
    body: string;
    contextSnapshot: Record<string, unknown>;
    learningSignal: Record<string, unknown>;
    provider?: string;
    model?: string;
    tokensIn?: number;
    tokensOut?: number;
    costUsd?: number;
    degradedReason?: string;
  }
) {
  if (!params.threadId) return;
  await supabase.from("lesson_assistant_messages").insert({
    thread_id: params.threadId,
    user_id: params.userId,
    role: params.role,
    body: params.body,
    context_snapshot: params.contextSnapshot,
    learning_signal: params.learningSignal,
    provider: params.provider,
    model: params.model,
    tokens_in: params.tokensIn ?? 0,
    tokens_out: params.tokensOut ?? 0,
    cost_usd: params.costUsd ?? 0,
    degraded_reason: params.degradedReason,
    body_retained_until: retainedUntilIso(),
  });
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
  const profile = await getLearnerProfile(supabase, user.id);
  if (!canEnterLearnerApp(user.email, profile)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
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

  await compactExpiredAssistantMessages(supabase, user.id);
  const threadId = await ensureAssistantThread(
    supabase,
    user.id,
    body.threadId,
    lesson,
    blockIndex,
    locale
  );
  const snapshot = contextSnapshot(lesson, blockIndex, exercise, body, locale);
  await insertAssistantMessage(supabase, {
    threadId,
    userId: user.id,
    role: "user",
    body: question,
    contextSnapshot: snapshot,
    learningSignal: learningSignal("user", question, lesson, blockIndex, locale),
  });

  if (!hasOpenRouterKey()) {
    await insertAssistantMessage(supabase, {
      threadId,
      userId: user.id,
      role: "assistant",
      body: fallback[locale],
      contextSnapshot: snapshot,
      learningSignal: learningSignal("assistant", fallback[locale], lesson, blockIndex, locale),
      degradedReason: "missing_key",
    });
    return NextResponse.json({
      text: fallback[locale],
      threadId,
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
    await insertAssistantMessage(supabase, {
      threadId,
      userId: user.id,
      role: "assistant",
      body: fallback[locale],
      contextSnapshot: snapshot,
      learningSignal: learningSignal("assistant", fallback[locale], lesson, blockIndex, locale),
      degradedReason: "cost_cap",
    });
    return NextResponse.json({
      text: fallback[locale],
      threadId,
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
            "Nearby lesson cards:",
            nearbyBlockContext(lesson, blockIndex, locale),
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

    await insertAssistantMessage(supabase, {
      threadId,
      userId: user.id,
      role: "assistant",
      body: completion.text,
      contextSnapshot: snapshot,
      learningSignal: learningSignal("assistant", completion.text, lesson, blockIndex, locale),
      provider: completion.provider,
      model: completion.model,
      tokensIn: completion.usage.tokensIn,
      tokensOut: completion.usage.tokensOut,
      costUsd: completion.usage.costUsd,
    });

    return NextResponse.json({
      text: completion.text,
      threadId,
      degraded: false,
      usageSaved: !usageError,
    });
  } catch (error) {
    console.error("lesson_assistant provider_error", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    await insertAssistantMessage(supabase, {
      threadId,
      userId: user.id,
      role: "assistant",
      body: fallback[locale],
      contextSnapshot: snapshot,
      learningSignal: learningSignal("assistant", fallback[locale], lesson, blockIndex, locale),
      degradedReason: "provider_error",
    });
    return NextResponse.json({
      text: fallback[locale],
      threadId,
      degraded: true,
      reason: "provider_error",
    });
  }
}
