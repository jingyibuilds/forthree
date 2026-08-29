"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Dict, Locale } from "@/lib/i18n-shared";
import type { Block, Exercise, Lesson } from "@/lib/content";

// Minimal inline markdown: **bold** and `code`.
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**"))
          return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (p.startsWith("`"))
          return (
            <code
              key={i}
              className="rounded bg-line/60 px-1 py-0.5 font-mono text-[0.85em]"
            >
              {p.slice(1, -1)}
            </code>
          );
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

type ExerciseResult = {
  exerciseId: string;
  response: string;
  correct: boolean;
  firstTry: boolean;
};

type AssistantSeed = {
  exerciseId?: string;
  response?: string;
  question?: string;
};

function gradeFillIn(
  value: string,
  spec: { accept?: string[]; regex?: string; ignore_case?: boolean }
): boolean {
  const v = value.trim();
  if (spec.regex) {
    return new RegExp(spec.regex, spec.ignore_case ? "i" : undefined).test(v);
  }
  const norm = (s: string) => (spec.ignore_case === false ? s : s.toLowerCase());
  return (spec.accept ?? []).some((a) => norm(a) === norm(v));
}

function ExerciseCard({
  exercise,
  locale,
  t,
  completed,
  onDone,
  onAskAssistant,
}: {
  exercise: Exercise;
  locale: Locale;
  t: Dict;
  completed: boolean;
  onDone: (r: ExerciseResult) => void;
  onAskAssistant: (seed?: AssistantSeed) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [tries, setTries] = useState(0);
  const [lastResponse, setLastResponse] = useState("");
  const [verdict, setVerdict] = useState<"correct" | "wrong" | null>(
    completed ? "correct" : null
  );

  const prompt = locale === "zh" ? exercise.prompt_zh : exercise.prompt_en;
  const explain = locale === "zh" ? exercise.explain_zh : exercise.explain_en;
  const isTermDrill = exercise.type === "fill_in" && exercise.term_drill;

  // Grading is deterministic and instant (DESIGN.md §5). Answers ship to the
  // client — fine for a single-user app; revisit if it ever goes multi-user.
  function check() {
    let correct = false;
    let response = "";
    if (exercise.type === "mcq") {
      if (selected === null) return;
      correct = selected === exercise.answer;
      response = String(selected);
    } else {
      if (!text.trim()) return;
      correct = gradeFillIn(text, exercise.answer_spec);
      response = text.trim();
    }
    const nextTries = tries + 1;
    setLastResponse(response);
    setTries(nextTries);
    setVerdict(correct ? "correct" : "wrong");
    if (correct) {
      onDone({
        exerciseId: exercise.id,
        response,
        correct: true,
        firstTry: nextTries === 1,
      });
    }
  }

  return (
    <div className="space-y-4">
      {isTermDrill && (
        <span className="inline-block rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">
          {t.termBadge}
        </span>
      )}
      <p className="text-lg font-medium leading-8">
        <Inline text={prompt} />
      </p>

      {exercise.type === "mcq" ? (
        <div className="space-y-3">
          {(locale === "zh" ? exercise.options_zh : exercise.options_en).map(
            (opt, i) => (
              <button
                key={i}
                type="button"
                disabled={verdict === "correct"}
                onClick={() => {
                  setSelected(i);
                  if (verdict === "wrong") setVerdict(null);
                }}
                className={`block w-full rounded-lg border bg-surface px-4 py-3.5 text-left text-base leading-7 shadow-sm transition-colors ${
                  selected === i
                    ? "border-primary bg-primary/5"
                    : "border-line hover:border-muted"
                }`}
              >
                <Inline text={opt} />
              </button>
            )
          )}
        </div>
      ) : (
        <input
          type="text"
          value={text}
          disabled={verdict === "correct"}
          onChange={(e) => {
            setText(e.target.value);
            if (verdict === "wrong") setVerdict(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") check();
          }}
          placeholder={t.typeAnswer}
          className="w-full rounded-lg border border-line bg-surface px-4 py-3 font-mono text-base outline-none shadow-sm transition-colors focus:border-primary"
        />
      )}

      {verdict === "correct" && (
        <div className="rounded-lg bg-success-soft p-4 text-base text-success">
          <p className="font-medium">{t.correct} ✓</p>
          <p className="mt-2 leading-7">
            <Inline text={explain} />
          </p>
        </div>
      )}
      {verdict === "wrong" && (
        <div className="space-y-3">
          <p className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
            {t.incorrect}
          </p>
          <button
            type="button"
            onClick={() =>
              onAskAssistant({
                exerciseId: exercise.id,
                response: lastResponse,
                question: t.assistantWrongQuestion,
              })
            }
            className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink shadow-sm transition-colors hover:border-muted disabled:text-muted"
          >
            {t.assistantHint}
          </button>
        </div>
      )}

      {verdict !== "correct" && (
        <button
          type="button"
          onClick={check}
          className="rounded-lg bg-primary px-6 py-3 text-base font-medium text-on-primary shadow-sm transition-colors hover:bg-primary-hover"
        >
          {t.check}
        </button>
      )}
    </div>
  );
}

type AssistantMessage = {
  role: "user" | "assistant";
  text: string;
};

function AssistantDialog({
  lesson,
  block,
  blockIndex,
  locale,
  t,
  open,
  loading,
  messages,
  draft,
  onDraft,
  onClose,
  onSend,
}: {
  lesson: Lesson;
  block: Block;
  blockIndex: number;
  locale: Locale;
  t: Dict;
  open: boolean;
  loading: boolean;
  messages: AssistantMessage[];
  draft: string;
  onDraft: (value: string) => void;
  onClose: () => void;
  onSend: (question: string) => void;
}) {
  if (!open) return null;

  const blockLabel =
    block.type === "exercise"
      ? t.assistantExerciseContext
      : block.type === "concept"
        ? locale === "zh"
          ? block.term_zh
          : block.term
        : t.assistantReadingContext;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/20 p-3 backdrop-blur-[2px] sm:items-center sm:justify-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-assistant-title"
        className="w-full max-w-xl rounded-lg border border-line bg-surface shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 id="lesson-assistant-title" className="font-serif text-xl font-semibold">
              {t.assistantLabel}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {locale === "zh" ? lesson.title_zh : lesson.title_en} ·{" "}
              {blockIndex + 1}/{lesson.blocks.length} · {blockLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-muted transition-colors hover:bg-background hover:text-ink"
            aria-label={t.close}
          >
            ×
          </button>
        </div>

        <div className="max-h-[52vh] space-y-3 overflow-y-auto px-5 py-4">
          {messages.length === 0 && (
            <div className="rounded-lg bg-background p-4 text-base leading-7 text-muted">
              {t.assistantEmpty}
            </div>
          )}
          {messages.map((message, i) => (
            <div
              key={i}
              className={`rounded-lg p-3.5 text-base leading-7 ${
                message.role === "user"
                  ? "ml-8 bg-primary text-on-primary"
                  : "mr-8 border border-line bg-background text-ink"
              }`}
            >
              <Inline text={message.text} />
            </div>
          ))}
          {loading && (
            <div className="mr-8 rounded-lg border border-line bg-background p-3 text-base text-muted">
              {t.assistantLoading}
            </div>
          )}
        </div>

        <form
          className="border-t border-line p-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSend(draft);
          }}
        >
          <textarea
            value={draft}
            onChange={(event) => onDraft(event.target.value)}
            placeholder={t.assistantPlaceholder}
            rows={3}
            className="w-full resize-none rounded-lg border border-line bg-background px-3 py-2.5 text-base leading-7 outline-none transition-colors focus:border-primary"
          />
          <div className="mt-3 flex justify-between gap-3">
            <button
              type="button"
              onClick={() => onSend(t.assistantExplainCurrent)}
              disabled={loading}
              className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-muted disabled:text-muted"
            >
              {t.assistantExplainCurrent}
            </button>
            <button
              type="submit"
              disabled={loading || !draft.trim()}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {t.assistantSend}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function BlockView({
  block,
  locale,
  t,
}: {
  block: Exclude<Block, { type: "exercise" }>;
  locale: Locale;
  t: Dict;
}) {
  if (block.type === "reading") {
    return (
      <p className="text-lg leading-8">
        <Inline text={locale === "zh" ? block.body_zh : block.body_en} />
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <h2 className="font-serif text-3xl font-semibold leading-tight">
        {locale === "zh" ? block.term_zh : block.term}
      </h2>
      {/* 朱批 — the anchor as a teacher's vermilion margin note */}
      <div className="rounded-lg border-l-4 border-accent bg-accent-soft p-5 shadow-sm">
        <p className="mb-2 text-sm font-medium text-accent">
          {t.anchorLabel}
        </p>
        <p className="text-base leading-7">
          <Inline text={locale === "zh" ? block.anchor_zh : block.anchor_en} />
        </p>
      </div>
      <p className="text-lg leading-8 text-ink">
        <Inline text={locale === "zh" ? block.explain_zh : block.explain_en} />
      </p>
    </div>
  );
}

export function LessonPlayer({
  lesson,
  locale,
  t,
  alreadyCorrect,
  initialIndex,
}: {
  lesson: Lesson;
  locale: Locale;
  t: Dict;
  alreadyCorrect: string[];
  initialIndex: number;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [finished, setFinished] = useState(false);
  const [awardedXp, setAwardedXp] = useState<number | null>(null);
  const [xpWarning, setXpWarning] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantDraft, setAssistantDraft] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([]);
  const [assistantSeed, setAssistantSeed] = useState<AssistantSeed | null>(null);

  const exercisesById = useMemo(
    () => new Map(lesson.exercises.map((e) => [e.id, e])),
    [lesson]
  );
  const block = lesson.blocks[index];
  const isExercise = block.type === "exercise";
  const last = index === lesson.blocks.length - 1;
  // Derived, so navigating back and forward keeps answered exercises done.
  const blockDone =
    !isExercise ||
    results.some((r) => r.exerciseId === block.ref) ||
    alreadyCorrect.includes(block.ref);

  async function finish(all: ExerciseResult[]) {
    setFinished(true);
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id, results: all }),
      });
      const data = await res.json();
      setAwardedXp(data.awardedXp ?? 0);
      setXpWarning(!data.xpPersisted);
    } catch {
      setAwardedXp(0);
      setXpWarning(true);
    }
  }

  function advance() {
    if (last) {
      void finish(results);
    } else {
      setIndex(index + 1);
    }
  }

  function openAssistant(seed?: AssistantSeed) {
    setAssistantOpen(true);
    setAssistantSeed(seed ?? null);
    setAssistantDraft("");
    if (seed?.question) {
      void askAssistant(seed.question, seed);
    }
  }

  async function askAssistant(question: string, seed = assistantSeed) {
    const trimmed = question.trim();
    if (!trimmed || assistantLoading) return;

    setAssistantLoading(true);
    setAssistantDraft("");
    setAssistantMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    try {
      const res = await fetch("/api/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature: "lesson_assistant",
          lessonId: lesson.id,
          blockIndex: index,
          exerciseId: seed?.exerciseId ?? (isExercise ? block.ref : undefined),
          locale,
          response: seed?.response,
          question: trimmed,
          progress: {
            blockIndex: index,
            totalBlocks: lesson.blocks.length,
            answeredExerciseIds: [
              ...alreadyCorrect,
              ...results.map((result) => result.exerciseId),
            ],
          },
        }),
      });
      const data = (await res.json()) as { text?: string };
      setAssistantMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.text || t.assistantFallback },
      ]);
    } catch {
      setAssistantMessages((prev) => [
        ...prev,
        { role: "assistant", text: t.assistantFallback },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  }

  if (finished) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center p-6 text-center">
        <p className="text-4xl">🎉</p>
        <h1 className="mt-4 font-serif text-2xl font-semibold">
          {t.lessonDone}
        </h1>
        <p className="mt-3 font-serif text-3xl font-semibold text-primary">
          {awardedXp === null ? "…" : `+${awardedXp} XP`}
        </p>
        {xpWarning && <p className="mt-2 text-xs text-warn">{t.xpNotSaved}</p>}
        <Link
          href="/learn"
          className="mt-8 rounded-lg bg-primary px-8 py-3 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover"
        >
          {t.backToPath}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-5 sm:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/learn"
          className="text-sm text-muted transition-colors hover:text-ink"
        >
          ✕
        </Link>
        <div className="h-2 min-w-24 flex-1 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((index + 1) / lesson.blocks.length) * 100}%` }}
          />
        </div>
        <span className="text-sm text-muted">
          {index + 1} / {lesson.blocks.length}
        </span>
        <a
          href={`/locale?to=${locale === "zh" ? "en" : "zh"}&back=${encodeURIComponent(
            `/learn/${lesson.id}?step=${index}`
          )}`}
          className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-muted shadow-sm transition-colors hover:border-primary hover:text-primary"
        >
          {t.toggleLabel}
        </a>
        <button
          type="button"
          onClick={() => openAssistant()}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-sm transition-colors hover:border-muted"
        >
          {t.assistantButton}
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-center py-10 sm:py-14">
        {index === 0 && (
          <div className="mb-6">
            <h1 className="font-serif text-4xl font-semibold leading-tight">
              {locale === "zh" ? lesson.title_zh : lesson.title_en}
            </h1>
            {lesson.why_en && lesson.why_zh && (
              <p className="mt-4 border-l-4 border-accent pl-4 text-base leading-7 text-muted">
                {locale === "zh" ? lesson.why_zh : lesson.why_en}
              </p>
            )}
          </div>
        )}
        {isExercise ? (
          <ExerciseCard
            key={block.ref}
            exercise={exercisesById.get(block.ref)!}
            locale={locale}
            t={t}
            completed={blockDone}
            onAskAssistant={openAssistant}
            onDone={(r) => {
              setResults((prev) => [
                ...prev.filter((p) => p.exerciseId !== r.exerciseId),
                r,
              ]);
            }}
          />
        ) : (
          <BlockView block={block} locale={locale} t={t} />
        )}
      </div>

      <div className="flex gap-3">
        {index > 0 && (
          <button
            type="button"
            onClick={() => setIndex(index - 1)}
            className="rounded-lg border border-line bg-surface px-5 py-3 text-base text-muted shadow-sm transition-colors hover:border-muted hover:text-ink"
          >
            ← {t.back}
          </button>
        )}
        {blockDone && (
          <button
            type="button"
            onClick={advance}
            className="flex-1 rounded-lg bg-primary px-5 py-3 text-base font-medium text-on-primary shadow-sm transition-colors hover:bg-primary-hover"
          >
            {t.next}
          </button>
        )}
      </div>

      <AssistantDialog
        lesson={lesson}
        block={block}
        blockIndex={index}
        locale={locale}
        t={t}
        open={assistantOpen}
        loading={assistantLoading}
        messages={assistantMessages}
        draft={assistantDraft}
        onDraft={setAssistantDraft}
        onClose={() => setAssistantOpen(false)}
        onSend={(question) => void askAssistant(question)}
      />
    </main>
  );
}
