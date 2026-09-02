"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Dict, Locale } from "@/lib/i18n-shared";
import type { Block, Exercise, Lesson, VisualKind } from "@/lib/content";
import { COURSE_PATH, lessonPath } from "@/lib/routes";
import { Seal } from "@/components/seal";
import { estimateMinuteRange, formatActiveMinutes } from "@/lib/study-time";

// Minimal markdown: **bold**, `code`, and fenced code blocks used by lessons.
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

function MarkdownText({ text, className = "" }: { text: string; className?: string }) {
  const segments = text.split(/```(\w+)?\n([\s\S]*?)```/g);
  return (
    <div className={className}>
      {segments.map((segment, index) => {
        if (index % 3 === 1) return null;
        if (index % 3 === 2) {
          const language = segments[index - 1];
          return (
            <pre
              key={index}
              className="my-5 overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-line bg-ink px-4 py-3 text-sm leading-6 text-on-primary shadow-sm"
            >
              {language && (
                <span className="mb-2 block text-xs uppercase text-on-primary/75">
                  {language}
                </span>
              )}
              <code>{segment.trim()}</code>
            </pre>
          );
        }
        return segment
          .split(/\n{2,}/)
          .filter((paragraph) => paragraph.length > 0)
          .map((paragraph, paragraphIndex) => (
            <p key={`${index}-${paragraphIndex}`} className="mb-4 last:mb-0">
              <Inline text={paragraph.replace(/\n/g, " ")} />
            </p>
          ));
      })}
    </div>
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

function sameOrder(a: number[], b: number[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function cacheKey(lessonId: string) {
  return `forthree:${lessonId}:correct-results`;
}

function readCachedResults(lessonId: string): ExerciseResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(cacheKey(lessonId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ExerciseResult => {
      if (!item || typeof item !== "object") return false;
      const result = item as Partial<ExerciseResult>;
      return (
        typeof result.exerciseId === "string" &&
        typeof result.response === "string" &&
        result.correct === true &&
        typeof result.firstTry === "boolean"
      );
    });
  } catch {
    return [];
  }
}

function writeCachedResults(lessonId: string, results: ExerciseResult[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(cacheKey(lessonId), JSON.stringify(results));
  } catch {
    // Browser storage is a convenience layer; database progress remains primary.
  }
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
  const [order, setOrder] = useState<number[]>([]);
  const [tries, setTries] = useState(0);
  const [lastResponse, setLastResponse] = useState("");
  const [verdict, setVerdict] = useState<"correct" | "wrong" | null>(
    completed ? "correct" : null
  );

  const prompt = locale === "zh" ? exercise.prompt_zh : exercise.prompt_en;
  const explain = locale === "zh" ? exercise.explain_zh : exercise.explain_en;
  const isTermDrill = exercise.type === "fill_in" && exercise.term_drill;
  const visibleVerdict = completed ? "correct" : verdict;

  // Grading is deterministic and instant (DESIGN.md §5). Answers ship to the
  // client — fine for a single-user app; revisit if it ever goes multi-user.
  function check() {
    let correct = false;
    let response = "";
    if (exercise.type === "mcq") {
      if (selected === null) return;
      correct = selected === exercise.answer;
      response = String(selected);
    } else if (exercise.type === "fill_in") {
      if (!text.trim()) return;
      correct = gradeFillIn(text, exercise.answer_spec);
      response = text.trim();
    } else {
      if (order.length !== exercise.answer.length) return;
      correct = sameOrder(order, exercise.answer);
      response = JSON.stringify(order);
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
      {exercise.advanced && (
        <span className="inline-block rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
          {t.advancedBadge}
        </span>
      )}
      <MarkdownText text={prompt} className="text-lg font-medium leading-8" />

      {exercise.type === "mcq" ? (
        <div className="space-y-3">
          {(locale === "zh" ? exercise.options_zh : exercise.options_en).map(
            (opt, i) => (
              <button
                key={i}
                type="button"
                disabled={visibleVerdict === "correct"}
                onClick={() => {
                  setSelected(i);
                  if (visibleVerdict === "wrong") setVerdict(null);
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
      ) : exercise.type === "drag_order" ? (
        <DragOrderInput
          exercise={exercise}
          locale={locale}
          t={t}
          order={order}
          disabled={visibleVerdict === "correct"}
          onOrderChange={(nextOrder) => {
            setOrder(nextOrder);
            if (visibleVerdict === "wrong") setVerdict(null);
          }}
        />
      ) : (
        <input
          type="text"
          value={text}
          disabled={visibleVerdict === "correct"}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          lang={isTermDrill ? "en" : locale}
          onChange={(e) => {
            setText(e.target.value);
            if (visibleVerdict === "wrong") setVerdict(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") check();
          }}
          placeholder={t.typeAnswer}
          className="w-full rounded-lg border border-line bg-surface px-4 py-3 font-mono text-base outline-none shadow-sm transition-colors focus:border-primary"
        />
      )}

      {visibleVerdict === "correct" && (
        <div className="rounded-lg bg-success-soft p-4 text-base text-success">
          <p className="font-medium">{t.correct} ✓</p>
          <p className="mt-2 leading-7">
            <Inline text={explain} />
          </p>
        </div>
      )}
      {visibleVerdict === "wrong" && (
        <div className="space-y-3">
          <p className="rounded-lg bg-warn-soft p-3 text-base leading-7 text-warn">
            {t.incorrect}
          </p>
          {tries >= 2 && (
            <div className="rounded-lg border border-warn/25 bg-warn-soft p-4 text-base leading-7 text-warn">
              <p className="font-medium">{t.staticHint}</p>
              <p className="mt-2">
                <Inline text={explain} />
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() =>
              onAskAssistant({
                exerciseId: exercise.id,
                response: lastResponse,
                question: t.assistantWrongQuestion,
              })
            }
            className="min-h-11 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink shadow-sm transition-colors hover:border-muted disabled:text-muted"
          >
            {t.assistantHint}
          </button>
        </div>
      )}

      {visibleVerdict !== "correct" && (
        <button
          type="button"
          onClick={check}
            className="min-h-12 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-on-primary shadow-sm transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-primary-hover active:translate-y-0"
        >
          {t.check}
        </button>
      )}
    </div>
  );
}

function DragOrderInput({
  exercise,
  locale,
  t,
  order,
  disabled,
  onOrderChange,
}: {
  exercise: Extract<Exercise, { type: "drag_order" }>;
  locale: Locale;
  t: Dict;
  order: number[];
  disabled: boolean;
  onOrderChange: (order: number[]) => void;
}) {
  const items = locale === "zh" ? exercise.items_zh : exercise.items_en;
  const remaining = items
    .map((_, index) => index)
    .filter((index) => !order.includes(index));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-line bg-background p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted">{t.dragOrderChosen}</p>
          {order.length > 0 && !disabled && (
            <button
              type="button"
              onClick={() => onOrderChange([])}
              className="rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-muted hover:text-ink"
            >
              {t.dragOrderClear}
            </button>
          )}
        </div>
        {order.length === 0 ? (
          <p className="rounded-md border border-dashed border-line bg-surface px-3 py-3 text-sm text-muted">
            {t.dragOrderEmpty}
          </p>
        ) : (
          <ol className="space-y-2">
            {order.map((itemIndex, sequenceIndex) => (
              <li key={itemIndex}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onOrderChange(order.filter((index) => index !== itemIndex))
                  }
                  className="grid w-full grid-cols-[2rem_1fr] items-start gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-3 text-left text-base leading-7 transition-colors hover:border-primary disabled:hover:border-primary/30"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-medium text-on-primary">
                    {sequenceIndex + 1}
                  </span>
                  <span>
                    <Inline text={items[itemIndex]} />
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-muted">{t.dragOrderPool}</p>
        <div className="grid gap-2">
          {remaining.map((itemIndex) => (
            <button
              key={itemIndex}
              type="button"
              disabled={disabled}
              onClick={() => onOrderChange([...order, itemIndex])}
              className="rounded-lg border border-line bg-surface px-4 py-3 text-left text-base leading-7 shadow-sm transition-colors hover:border-primary hover:bg-primary/5 disabled:text-muted"
            >
              <Inline text={items[itemIndex]} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

type AssistantMessage = {
  role: "user" | "assistant";
  text: string;
};

type TimeSource = "heartbeat" | "step" | "completion";

type ProgressResponse = {
  lessonActiveSeconds?: number;
  todayActiveSeconds?: number;
  timePersisted?: boolean;
};

const ACTIVE_IDLE_AFTER_MS = 90_000;
const ACTIVE_HEARTBEAT_MS = 30_000;

function localDayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { todayStartIso: start.toISOString(), todayEndIso: end.toISOString() };
}

function clientEventId(lessonId: string, source: TimeSource) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${lessonId}:${source}:${random}`;
}

function useActiveLessonTime({
  lessonId,
  blockIndex,
  enabled,
}: {
  lessonId: string;
  blockIndex: number;
  enabled: boolean;
}) {
  const activeMs = useRef(0);
  const pendingMs = useRef(0);
  const pendingEventId = useRef<string | null>(null);
  const pendingEventSeconds = useRef(0);
  const flushing = useRef(false);
  const lastTickMs = useRef<number | null>(null);
  const lastActivityMs = useRef(0);
  const blockIndexRef = useRef(blockIndex);
  const enabledRef = useRef(enabled);
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [summary, setSummary] = useState<ProgressResponse>({
    lessonActiveSeconds: 0,
    todayActiveSeconds: 0,
    timePersisted: true,
  });

  useEffect(() => {
    blockIndexRef.current = blockIndex;
  }, [blockIndex]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const collectActiveMs = useCallback(() => {
    if (typeof document === "undefined") return;
    const now = Date.now();
    const lastTick = lastTickMs.current ?? now;
    const delta = Math.min(Math.max(now - lastTick, 0), 5_000);
    lastTickMs.current = now;

    if (
      !enabledRef.current ||
      document.visibilityState !== "visible" ||
      now - lastActivityMs.current > ACTIVE_IDLE_AFTER_MS
    ) {
      return;
    }

    activeMs.current += delta;
    pendingMs.current += delta;
    const nextSeconds = Math.floor(activeMs.current / 1000);
    setDisplaySeconds((previous) => (previous === nextSeconds ? previous : nextSeconds));
  }, []);

  const flush = useCallback(
    async (source: TimeSource, keepalive = false) => {
      collectActiveMs();
      if (flushing.current) return null;
      const seconds = pendingEventSeconds.current || Math.floor(pendingMs.current / 1000);
      if (seconds <= 0) return null;

      flushing.current = true;
      const eventId = pendingEventId.current ?? clientEventId(lessonId, source);
      pendingEventId.current = eventId;
      pendingEventSeconds.current = seconds;
      try {
        const response = await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId,
            blockIndex: blockIndexRef.current,
            activeSeconds: seconds,
            clientEventId: eventId,
            source,
            timeSummary: true,
            ...localDayBounds(),
          }),
          keepalive,
        });
        if (!response.ok) return null;
        const data = (await response.json()) as ProgressResponse;
        if (data.timePersisted === false) return null;
        pendingMs.current = Math.max(0, pendingMs.current - pendingEventSeconds.current * 1000);
        pendingEventId.current = null;
        pendingEventSeconds.current = 0;
        setSummary(data);
        return data;
      } catch {
        return null;
      } finally {
        flushing.current = false;
      }
    },
    [collectActiveMs, lessonId]
  );

  const summarize = useCallback(async () => {
    const flushed = await flush("completion");
    if (flushed) return flushed;
    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          timeSummary: true,
          ...localDayBounds(),
        }),
      });
      if (!response.ok) return summary;
      const data = (await response.json()) as ProgressResponse;
      setSummary(data);
      return data;
    } catch {
      return summary;
    }
  }, [flush, lessonId, summary]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const markActivity = () => {
      lastActivityMs.current = Date.now();
      if (lastTickMs.current === null) lastTickMs.current = lastActivityMs.current;
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void flush("step", true);
      } else {
        markActivity();
        lastTickMs.current = Date.now();
      }
    };
    const onPageHide = () => {
      void flush("step", true);
    };

    markActivity();
    window.addEventListener("pointerdown", markActivity, { passive: true });
    window.addEventListener("keydown", markActivity);
    window.addEventListener("scroll", markActivity, { passive: true });
    window.addEventListener("focus", markActivity);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    const interval = window.setInterval(() => {
      collectActiveMs();
      if (pendingMs.current >= ACTIVE_HEARTBEAT_MS) {
        void flush("heartbeat", true);
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
      void flush("step", true);
      window.removeEventListener("pointerdown", markActivity);
      window.removeEventListener("keydown", markActivity);
      window.removeEventListener("scroll", markActivity);
      window.removeEventListener("focus", markActivity);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [collectActiveMs, flush]);

  return {
    activeSeconds: displaySeconds,
    getActiveSeconds: () => Math.floor(activeMs.current / 1000),
    flush,
    summarize,
    summary,
  };
}

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
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ block: "end" });
  }, [open, messages.length, loading]);

  if (!open) return null;

  const blockLabel =
    block.type === "exercise"
      ? t.assistantExerciseContext
      : block.type === "concept"
        ? locale === "zh"
          ? block.term_zh
          : block.term
        : block.type === "visual"
          ? locale === "zh"
            ? block.title_zh
            : block.title_en
        : t.assistantReadingContext;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/20 p-0 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-3">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-assistant-title"
        className="flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-lg border border-line bg-surface shadow-xl sm:max-h-[86dvh] sm:rounded-lg"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
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
            className="grid min-h-11 min-w-11 place-items-center rounded-md text-xl text-muted transition-colors hover:bg-background hover:text-ink"
            aria-label={t.close}
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
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
          <div ref={endRef} />
        </div>

        <form
          className="shrink-0 border-t border-line p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
          onSubmit={(event) => {
            event.preventDefault();
            onSend(draft);
          }}
        >
          <textarea
            value={draft}
            onChange={(event) => onDraft(event.target.value)}
            placeholder={t.assistantPlaceholder}
            rows={2}
            className="w-full resize-none rounded-lg border border-line bg-background px-3 py-2.5 text-base leading-7 outline-none transition-colors focus:border-primary"
          />
          <p className="mt-2 text-xs leading-5 text-muted">{t.assistantPrivacyNote}</p>
          <div className="mt-3 flex justify-between gap-3">
            <button
              type="button"
              onClick={() => onSend(t.assistantExplainCurrent)}
              disabled={loading}
              className="min-h-11 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-muted disabled:text-muted"
            >
              {t.assistantExplainCurrent}
            </button>
            <button
              type="submit"
              disabled={loading || !draft.trim()}
              className="min-h-11 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-primary-hover active:translate-y-0 disabled:translate-y-0 disabled:opacity-60"
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
      <MarkdownText
        text={locale === "zh" ? block.body_zh : block.body_en}
        className="text-lg leading-8"
      />
    );
  }
  if (block.type === "visual") {
    return <VisualBlockView block={block} locale={locale} />;
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

function VisualBlockView({
  block,
  locale,
}: {
  block: Extract<Block, { type: "visual" }>;
  locale: Locale;
}) {
  const title = locale === "zh" ? block.title_zh : block.title_en;
  const caption = locale === "zh" ? block.caption_zh : block.caption_en;
  const alt = locale === "zh" ? block.alt_zh : block.alt_en;

  return (
    <figure className="space-y-4" aria-label={alt}>
      <div className="rounded-lg border border-line bg-surface p-4 shadow-sm sm:p-5">
        <VisualIllustration kind={block.kind} locale={locale} />
      </div>
      <figcaption>
        <p className="font-serif text-2xl font-semibold leading-tight">{title}</p>
        <p className="mt-2 text-base leading-7 text-muted">
          <Inline text={caption} />
        </p>
      </figcaption>
    </figure>
  );
}

function VisualIllustration({ kind, locale }: { kind: VisualKind; locale: Locale }) {
  if (kind === "cs-scope-map") return <CsScopeMapIllustration locale={locale} />;
  if (kind === "source-code-file") return <SourceCodeFileIllustration />;
  if (kind === "terminal-command") return <TerminalCommandIllustration />;
  if (kind === "agent-command-log") return <AgentCommandLogIllustration locale={locale} />;
  if (kind === "pseudocode-vs-code") return <PseudocodeVsCodeIllustration locale={locale} />;
  if (kind === "failure-stage") return <FailureStageIllustration locale={locale} />;
  return <PythonOutputIllustration />;
}

function CsScopeMapIllustration({ locale }: { locale: Locale }) {
  const labels =
    locale === "zh"
      ? {
          center: "AI agent 协作",
          centerHint: "你先学会读工作痕迹",
          areas: [
            ["程序与语言", "代码怎样表达意图"],
            ["数据与算法", "信息怎样被处理"],
            ["系统与网络", "东西在哪里运行"],
            ["安全与可靠性", "哪里可能出风险"],
            ["图形/机器人/交互", "软件怎样进入现实"],
            ["理论与抽象", "复杂问题怎样被压缩"],
          ],
        }
      : {
          center: "AI-agent collaboration",
          centerHint: "start by reading the work trail",
          areas: [
            ["Programs & languages", "how code expresses intent"],
            ["Data & algorithms", "how information is processed"],
            ["Systems & networks", "where things run"],
            ["Security & reliability", "where risk enters"],
            ["Graphics, robotics, interaction", "how software meets reality"],
            ["Theory & abstraction", "how complexity gets compressed"],
          ],
        };

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_13rem]">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {labels.areas.map(([name, hint]) => (
          <div
            key={name}
            className="min-h-24 rounded-lg border border-line bg-background p-3"
          >
            <p className="text-sm font-semibold leading-5 text-ink">{name}</p>
            <p className="mt-2 text-xs leading-5 text-muted">{hint}</p>
          </div>
        ))}
      </div>
      <div className="flex min-h-40 flex-col justify-center rounded-lg border border-primary/25 bg-primary/5 p-4 text-center">
        <p className="font-serif text-2xl font-semibold leading-tight text-primary">
          {labels.center}
        </p>
        <p className="mt-3 text-sm leading-6 text-muted">{labels.centerHint}</p>
      </div>
    </div>
  );
}

function WindowShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-background">
      <div className="flex items-center gap-2 border-b border-line bg-line/35 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-accent" />
        <span className="h-2.5 w-2.5 rounded-full bg-warn" />
        <span className="h-2.5 w-2.5 rounded-full bg-success" />
        <span className="ml-2 font-mono text-xs text-muted">{title}</span>
      </div>
      {children}
    </div>
  );
}

function SourceCodeFileIllustration() {
  return (
    <WindowShell title="hello.py">
      <div className="grid gap-0 font-mono text-sm leading-7 text-ink">
        {[
          ["1", "print(\"hello\")"],
          ["2", "print(\"good morning\")"],
        ].map(([line, code]) => (
          <div key={line} className="grid grid-cols-[2.5rem_1fr] border-b border-line/60 last:border-0">
            <span className="bg-line/30 px-3 text-right text-muted">{line}</span>
            <code className="px-4 py-2">{code}</code>
          </div>
        ))}
      </div>
    </WindowShell>
  );
}

function TerminalCommandIllustration() {
  return (
    <WindowShell title="terminal">
      <div className="space-y-2 bg-ink px-4 py-4 font-mono text-sm leading-7 text-on-primary">
        <p>
          <span className="text-success">forthree %</span>{" "}
          <span>python3 hello.py</span>
        </p>
        <p className="text-on-primary/70">hello</p>
        <p>
          <span className="text-success">forthree %</span>{" "}
          <span className="text-on-primary/65">_</span>
        </p>
      </div>
    </WindowShell>
  );
}

function AgentCommandLogIllustration({ locale }: { locale: Locale }) {
  const labels =
    locale === "zh"
      ? {
          location: "位置提示符",
          locationHint: "终端站在哪个文件夹",
          command: "命令",
          commandHint: "你发出的请求",
          output: "输出",
          outputHint: "电脑回来的结果",
        }
      : {
          location: "location prompt",
          locationHint: "where the terminal is standing",
          command: "command",
          commandHint: "the request you send",
          output: "output",
          outputHint: "what came back",
        };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
      <WindowShell title="agent log">
        <div className="space-y-2 bg-ink px-4 py-4 font-mono text-sm leading-7 text-on-primary">
          <p>
            <span className="rounded bg-success/25 px-1.5 py-0.5 text-success">
              forthree %
            </span>{" "}
            <span className="rounded bg-primary/35 px-1.5 py-0.5">
              python3 hello.py
            </span>
          </p>
          <p>
            <span className="rounded bg-accent/30 px-1.5 py-0.5">hello</span>
          </p>
        </div>
      </WindowShell>
      <div className="space-y-2 text-sm leading-6">
        <div className="rounded-md border border-line bg-background px-3 py-2">
          <span className="font-medium text-success">{labels.location}</span>
          <span className="block text-muted">{labels.locationHint}</span>
        </div>
        <div className="rounded-md border border-line bg-background px-3 py-2">
          <span className="font-medium text-primary">{labels.command}</span>
          <span className="block text-muted">{labels.commandHint}</span>
        </div>
        <div className="rounded-md border border-line bg-background px-3 py-2">
          <span className="font-medium text-accent">{labels.output}</span>
          <span className="block text-muted">{labels.outputHint}</span>
        </div>
      </div>
    </div>
  );
}

function PseudocodeVsCodeIllustration({ locale }: { locale: Locale }) {
  const labels =
    locale === "zh"
      ? {
          plan: "伪代码：先检查逻辑",
          code: "正式代码：再交给 Python 运行",
          steps: ["对每个人", "如果这个人还没回复", "发送提醒"],
        }
      : {
          plan: "Pseudocode: check the logic first",
          code: "Production code: then Python can run it",
          steps: ["FOR EACH person", "IF they have not replied", "send reminder"],
        };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <WindowShell title="plan.txt">
        <div className="space-y-2 bg-background px-4 py-4 text-base leading-7 text-ink">
          <p className="text-sm font-medium text-accent">{labels.plan}</p>
          <ol className="list-decimal space-y-1 pl-5">
            {labels.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </WindowShell>
      <WindowShell title="reminders.py">
        <pre className="overflow-x-auto bg-ink px-4 py-4 font-mono text-sm leading-7 text-on-primary">
          <code>{'for person in people:\n    if not person.replied:\n        send_reminder(person)'}</code>
        </pre>
      </WindowShell>
    </div>
  );
}

function FailureStageIllustration({ locale }: { locale: Locale }) {
  const labels =
    locale === "zh"
      ? {
          steps: ["写好文件", "构建检查", "开始运行", "产生输出"],
          build: "build failed",
          runtime: "runtime crash",
          buildHint: "多半还没跑",
          runtimeHint: "先问改了什么",
        }
      : {
          steps: ["write file", "build check", "start running", "produce output"],
          build: "build failed",
          runtime: "runtime crash",
          buildHint: "likely did not run",
          runtimeHint: "ask what changed",
        };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {labels.steps.map((step, index) => (
          <div
            key={step}
            className="rounded-lg border border-line bg-background px-3 py-3 text-center"
          >
            <span className="font-mono text-xs text-primary">0{index + 1}</span>
            <p className="mt-1 text-sm font-medium leading-5">{step}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-warn/30 bg-warn-soft p-4">
          <p className="font-mono text-sm font-semibold text-warn">{labels.build}</p>
          <p className="mt-1 text-sm text-warn">{labels.buildHint}</p>
        </div>
        <div className="rounded-lg border border-accent/30 bg-accent-soft p-4">
          <p className="font-mono text-sm font-semibold text-accent">{labels.runtime}</p>
          <p className="mt-1 text-sm text-accent">{labels.runtimeHint}</p>
        </div>
      </div>
    </div>
  );
}

function PythonOutputIllustration() {
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
      <WindowShell title="hello.py">
        <div className="font-mono text-sm leading-7">
          <div className="grid grid-cols-[2.5rem_1fr]">
            <span className="bg-line/30 px-3 py-3 text-right text-muted">1</span>
            <code className="px-4 py-3 text-ink">{"print(\"hello\")"}</code>
          </div>
        </div>
      </WindowShell>
      <WindowShell title="output">
        <div className="bg-ink px-4 py-6 font-mono text-lg text-on-primary">
          hello
        </div>
      </WindowShell>
    </div>
  );
}

function CheckpointContext({
  block,
  locale,
  t,
}: {
  block: Extract<Block, { type: "reading" }>;
  locale: Locale;
  t: Dict;
}) {
  return (
    <details
      open
      className="mb-6 max-h-[36dvh] overflow-y-auto rounded-lg border border-line bg-surface p-4 shadow-sm"
    >
      <summary className="cursor-pointer text-sm font-medium text-primary">
        {t.checkpointMaterial}
      </summary>
      <MarkdownText
        text={locale === "zh" ? block.body_zh : block.body_en}
        className="mt-3 text-sm leading-6 text-ink"
      />
    </details>
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
  const [results, setResults] = useState<ExerciseResult[]>(() =>
    readCachedResults(lesson.id)
  );
  const [finished, setFinished] = useState(false);
  const [finishedLessonSeconds, setFinishedLessonSeconds] = useState(0);
  const [finishedTodaySeconds, setFinishedTodaySeconds] = useState(0);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantDraft, setAssistantDraft] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([]);
  const [assistantSeed, setAssistantSeed] = useState<AssistantSeed | null>(null);
  const [assistantThreadId, setAssistantThreadId] = useState<string | null>(null);
  const historyReady = useRef(false);
  const restoringHistory = useRef(false);
  const activeTime = useActiveLessonTime({
    lessonId: lesson.id,
    blockIndex: index,
    enabled: !finished,
  });

  const exercisesById = useMemo(
    () => new Map(lesson.exercises.map((e) => [e.id, e])),
    [lesson]
  );
  const completedExerciseIds = useMemo(
    () => new Set([...alreadyCorrect, ...results.map((result) => result.exerciseId)]),
    [alreadyCorrect, results]
  );
  const checkpointMaterial = useMemo(() => {
    if (!lesson.review_tags?.includes("module_checkpoint")) return null;
    return (
      lesson.blocks.find(
        (item): item is Extract<Block, { type: "reading" }> =>
          item.type === "reading" &&
          (item.body_en.includes("Transcript:") || item.body_zh.includes("工作记录"))
      ) ?? null
    );
  }, [lesson]);
  const firstExerciseIndex = lesson.blocks.findIndex((item) => item.type === "exercise");
  const block = lesson.blocks[index];
  const isExercise = block.type === "exercise";
  const last = index === lesson.blocks.length - 1;
  // Derived, so navigating back and forward keeps answered exercises done.
  const blockDone = !isExercise || completedExerciseIds.has(block.ref);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("step", String(index));
    if (!historyReady.current) {
      window.history.replaceState({ lessonId: lesson.id, step: index }, "", nextUrl);
      historyReady.current = true;
      return;
    }
    if (restoringHistory.current) {
      restoringHistory.current = false;
      return;
    }
    window.history.pushState({ lessonId: lesson.id, step: index }, "", nextUrl);
  }, [index, lesson.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPopState = () => {
      const url = new URL(window.location.href);
      const step = Number(url.searchParams.get("step"));
      if (Number.isInteger(step) && step >= 0 && step < lesson.blocks.length) {
        restoringHistory.current = true;
        setIndex(step);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [lesson.blocks.length]);

  function goToIndex(nextIndex: number) {
    void activeTime.flush("step", true);
    setIndex(nextIndex);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  async function persistProgress(all: ExerciseResult[], keepalive = false) {
    if (all.length === 0) return;
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id, results: all }),
        keepalive,
      });
      await res.json();
    } catch {
      // Progress failure should not block the learner from continuing.
    }
  }

  function recordCorrectResult(result: ExerciseResult) {
    setResults((prev) => {
      const next = [
        ...prev.filter((existing) => existing.exerciseId !== result.exerciseId),
        result,
      ];
      writeCachedResults(lesson.id, next);
      return next;
    });
    void persistProgress([result], true);
  }

  async function finish(all: ExerciseResult[]) {
    const time = await activeTime.summarize();
    const lessonSeconds = Math.max(
      time?.lessonActiveSeconds ?? 0,
      activeTime.getActiveSeconds()
    );
    setFinishedLessonSeconds(lessonSeconds);
    setFinishedTodaySeconds(Math.max(time?.todayActiveSeconds ?? 0, lessonSeconds));
    setFinished(true);
    void persistProgress(all);
  }

  function advance() {
    if (last) {
      void finish(results);
    } else {
      goToIndex(index + 1);
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
          threadId: assistantThreadId ?? undefined,
          lessonId: lesson.id,
          blockIndex: index,
          exerciseId: seed?.exerciseId ?? (isExercise ? block.ref : undefined),
          locale,
          response: seed?.response,
          question: trimmed,
          progress: {
            blockIndex: index,
            totalBlocks: lesson.blocks.length,
            answeredExerciseIds: [...completedExerciseIds],
          },
        }),
      });
      const data = (await res.json()) as { text?: string; threadId?: string };
      if (data.threadId) setAssistantThreadId(data.threadId);
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
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center p-6 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-lg border border-accent/25 bg-accent-soft shadow-sm">
          <Seal size={42} />
        </div>
        <h1 className="mt-4 font-serif text-2xl font-semibold">
          {t.lessonDone}
        </h1>
        <div className="mt-5 grid w-full grid-cols-2 gap-3 text-left">
          <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
            <p className="text-sm font-medium text-muted">{t.lessonLearned}</p>
            <p className="mt-1 font-serif text-3xl font-semibold text-primary">
              {formatActiveMinutes(finishedLessonSeconds, locale)}
            </p>
          </div>
          <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
            <p className="text-sm font-medium text-muted">{t.todayLearned}</p>
            <p className="mt-1 font-serif text-3xl font-semibold text-primary">
              {formatActiveMinutes(finishedTodaySeconds, locale)}
            </p>
          </div>
        </div>
        <Link
          href={COURSE_PATH}
          className="mt-8 rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-on-primary shadow-sm transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-primary-hover active:translate-y-0"
        >
          {t.backToPath}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pb-28 pt-3 sm:px-8 sm:pt-5">
      <div className="sticky top-0 z-30 -mx-5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-line/70 bg-background/95 px-5 py-2 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex items-center gap-2">
          <Link
            href={COURSE_PATH}
            aria-label={t.backToPath}
            className="grid min-h-11 min-w-11 place-items-center rounded-lg text-lg text-muted transition-colors hover:bg-surface hover:text-ink"
          >
            ✕
          </Link>
          <a
            href={`/locale?to=${locale === "zh" ? "en" : "zh"}&back=${encodeURIComponent(
              lessonPath(lesson.id, index)
            )}`}
            className="grid min-h-11 min-w-11 place-items-center rounded-lg border border-line bg-surface px-2 text-sm font-medium text-muted shadow-sm transition-colors hover:border-primary hover:text-primary"
          >
            {t.toggleLabel}
          </a>
        </div>
        <div className="h-2 min-w-0 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((index + 1) / lesson.blocks.length) * 100}%` }}
          />
        </div>
        <span className="text-sm text-muted">
          {index + 1} / {lesson.blocks.length}
        </span>
      </div>

      <button
        type="button"
        onClick={() => openAssistant()}
        className="fixed bottom-24 right-4 z-40 min-h-12 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink shadow-lg transition-colors hover:border-muted sm:bottom-8 sm:right-8"
      >
        {t.assistantButton}
      </button>

      <div className="flex flex-1 flex-col justify-center py-8 sm:py-14">
        {index === 0 && (
          <div className="mb-6">
            <h1 className="font-serif text-4xl font-semibold leading-tight">
              {locale === "zh" ? lesson.title_zh : lesson.title_en}
            </h1>
            <p className="mt-2 text-sm font-medium text-primary">
              {t.estimatedDuration} {estimateMinuteRange(lesson.est_minutes)}{" "}
              {t.minutes}
            </p>
            {lesson.why_en && lesson.why_zh && (
              <p className="mt-4 border-l-4 border-accent pl-4 text-base leading-7 text-muted">
                {locale === "zh" ? lesson.why_zh : lesson.why_en}
              </p>
            )}
            {lesson.resources && lesson.resources.length > 0 && (
              <div className="mt-5 rounded-lg border border-line bg-surface p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-primary">
                    {t.optionalResources}
                  </p>
                  <p className="text-xs text-muted">
                    +
                    {lesson.resources.reduce(
                      (sum, resource) => sum + resource.est_minutes,
                      0
                    )}{" "}
                    {t.minutes} {t.referenceTime}
                  </p>
                </div>
                <div className="mt-3 grid gap-2">
                  {lesson.resources.map((resource) => (
                    <a
                      key={resource.url}
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-line bg-background px-3 py-3 transition-colors hover:border-primary hover:bg-primary/5"
                    >
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium text-ink">
                          {locale === "zh" ? resource.title_zh : resource.title_en}
                        </span>
                        <span className="text-xs text-muted">
                          {resource.source} · {resource.est_minutes} {t.minutes}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted">
                        {locale === "zh" ? resource.note_zh : resource.note_en}
                      </span>
                    </a>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">
                  {t.resourceReturnHint}
                </p>
              </div>
            )}
            {firstExerciseIndex > 0 && (
              <button
                type="button"
                onClick={() => goToIndex(firstExerciseIndex)}
                className="mt-5 min-h-11 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink shadow-sm transition-colors hover:border-muted"
              >
                {t.skipToChecks}
              </button>
            )}
          </div>
        )}
        {isExercise ? (
          <>
            {checkpointMaterial && (
              <CheckpointContext block={checkpointMaterial} locale={locale} t={t} />
            )}
            <ExerciseCard
              key={block.ref}
              exercise={exercisesById.get(block.ref)!}
              locale={locale}
              t={t}
              completed={blockDone}
              onAskAssistant={openAssistant}
              onDone={recordCorrectResult}
            />
          </>
        ) : (
          <BlockView block={block} locale={locale} t={t} />
        )}
      </div>

      <div className="sticky bottom-0 z-30 -mx-5 flex gap-3 border-t border-line/70 bg-background/95 px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 backdrop-blur sm:-mx-8 sm:px-8">
        {index > 0 && (
          <button
            type="button"
            onClick={() => goToIndex(index - 1)}
            className="min-h-12 rounded-lg border border-line bg-surface px-5 py-3 text-base text-muted shadow-sm transition-colors hover:border-muted hover:text-ink"
          >
            ← {t.back}
          </button>
        )}
        {blockDone && (
          <button
            type="button"
            onClick={advance}
            className="min-h-12 flex-1 rounded-lg bg-primary px-5 py-3 text-base font-semibold text-on-primary shadow-sm transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-primary-hover active:translate-y-0"
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
