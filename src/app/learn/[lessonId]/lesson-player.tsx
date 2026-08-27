"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Dict, Locale } from "@/lib/i18n";
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
}: {
  exercise: Exercise;
  locale: Locale;
  t: Dict;
  completed: boolean;
  onDone: (r: ExerciseResult) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [tries, setTries] = useState(0);
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
      <p className="font-medium">
        <Inline text={prompt} />
      </p>

      {exercise.type === "mcq" ? (
        <div className="space-y-2.5">
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
                className={`block w-full rounded-lg border bg-surface px-4 py-3 text-left text-sm transition-colors ${
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
          className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 font-mono text-sm outline-none transition-colors focus:border-primary"
        />
      )}

      {verdict === "correct" && (
        <div className="rounded-lg bg-success-soft p-4 text-sm text-success">
          <p className="font-medium">{t.correct} ✓</p>
          <p className="mt-1 leading-relaxed">
            <Inline text={explain} />
          </p>
        </div>
      )}
      {verdict === "wrong" && (
        <p className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
          {t.incorrect}
        </p>
      )}

      {verdict !== "correct" && (
        <button
          type="button"
          onClick={check}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover"
        >
          {t.check}
        </button>
      )}
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
      <p className="leading-relaxed">
        <Inline text={locale === "zh" ? block.body_zh : block.body_en} />
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-semibold">
        {locale === "zh" ? block.term_zh : block.term}
      </h2>
      {/* 朱批 — the anchor as a teacher's vermilion margin note */}
      <div className="rounded-lg border-l-4 border-accent bg-accent-soft p-4">
        <p className="mb-1 text-xs font-medium tracking-wide text-accent">
          {t.anchorLabel}
        </p>
        <p className="text-sm leading-relaxed">
          <Inline text={locale === "zh" ? block.anchor_zh : block.anchor_en} />
        </p>
      </div>
      <p className="text-sm leading-relaxed text-ink">
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
  toggle,
}: {
  lesson: Lesson;
  locale: Locale;
  t: Dict;
  alreadyCorrect: string[];
  toggle?: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [finished, setFinished] = useState(false);
  const [awardedXp, setAwardedXp] = useState<number | null>(null);
  const [xpWarning, setXpWarning] = useState(false);

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
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col p-6">
      <div className="flex items-center gap-4">
        <Link
          href="/learn"
          className="text-sm text-muted transition-colors hover:text-ink"
        >
          ✕
        </Link>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((index + 1) / lesson.blocks.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted">
          {index + 1} / {lesson.blocks.length}
        </span>
        {toggle}
      </div>

      <div className="flex flex-1 flex-col justify-center py-10">
        {index === 0 && (
          <div className="mb-6">
            <h1 className="font-serif text-2xl font-semibold">
              {locale === "zh" ? lesson.title_zh : lesson.title_en}
            </h1>
            {lesson.why_en && lesson.why_zh && (
              <p className="mt-2 text-xs leading-relaxed text-muted">
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
            className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted transition-colors hover:border-muted hover:text-ink"
          >
            ← {t.back}
          </button>
        )}
        {blockDone && (
          <button
            type="button"
            onClick={advance}
            className="flex-1 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover"
          >
            {t.next}
          </button>
        )}
      </div>
    </main>
  );
}
