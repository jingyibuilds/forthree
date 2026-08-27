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
              className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[0.85em] dark:bg-neutral-800"
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
  onDone,
}: {
  exercise: Exercise;
  locale: Locale;
  t: Dict;
  onDone: (r: ExerciseResult) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [tries, setTries] = useState(0);
  const [verdict, setVerdict] = useState<"correct" | "wrong" | null>(null);

  const prompt = locale === "zh" ? exercise.prompt_zh : exercise.prompt_en;
  const explain = locale === "zh" ? exercise.explain_zh : exercise.explain_en;

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
      <p className="font-medium">
        <Inline text={prompt} />
      </p>

      {exercise.type === "mcq" ? (
        <div className="space-y-2">
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
                className={`block w-full rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                  selected === i
                    ? "border-neutral-900 bg-neutral-100 dark:border-white dark:bg-neutral-800"
                    : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
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
          className="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
      )}

      {verdict === "correct" && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          <p className="font-medium">{t.correct} ✓</p>
          <p className="mt-1">
            <Inline text={explain} />
          </p>
        </div>
      )}
      {verdict === "wrong" && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {t.incorrect}
        </p>
      )}

      {verdict !== "correct" && (
        <button
          type="button"
          onClick={check}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
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
}: {
  block: Exclude<Block, { type: "exercise" }>;
  locale: Locale;
}) {
  if (block.type === "reading") {
    return (
      <p className="leading-relaxed">
        <Inline text={locale === "zh" ? block.body_zh : block.body_en} />
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">
        {locale === "zh" ? block.term_zh : block.term}
      </h2>
      <div className="rounded-md border-l-4 border-neutral-900 bg-neutral-50 p-4 text-sm dark:border-white dark:bg-neutral-900">
        <Inline text={locale === "zh" ? block.anchor_zh : block.anchor_en} />
      </div>
      <p className="text-sm leading-relaxed">
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
}: {
  lesson: Lesson;
  locale: Locale;
  t: Dict;
  alreadyCorrect: string[];
}) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [currentDone, setCurrentDone] = useState(false);
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
      setCurrentDone(false);
    }
  }

  if (finished) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center p-6 text-center">
        <p className="text-3xl">🎉</p>
        <h1 className="mt-4 text-xl font-semibold">{t.lessonDone}</h1>
        <p className="mt-2 text-2xl font-semibold">
          {awardedXp === null ? "…" : `+${awardedXp} XP`}
        </p>
        {xpWarning && (
          <p className="mt-2 text-xs text-amber-600">{t.xpNotSaved}</p>
        )}
        <Link
          href="/learn"
          className="mt-6 rounded-md bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
        >
          {t.backToPath}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col p-6">
      <div className="flex items-center gap-4">
        <Link href="/learn" className="text-sm text-neutral-400 hover:text-neutral-600">
          ✕
        </Link>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          <div
            className="h-full rounded-full bg-neutral-900 transition-all dark:bg-white"
            style={{ width: `${((index + 1) / lesson.blocks.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-neutral-400">
          {index + 1} / {lesson.blocks.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-center py-10">
        {isExercise ? (
          <ExerciseCard
            key={block.ref}
            exercise={exercisesById.get(block.ref)!}
            locale={locale}
            t={t}
            onDone={(r) => {
              setResults((prev) => [...prev.filter((p) => p.exerciseId !== r.exerciseId), r]);
              setCurrentDone(true);
            }}
          />
        ) : (
          <BlockView block={block} locale={locale} />
        )}
      </div>

      {(!isExercise || currentDone) && (
        <button
          type="button"
          onClick={advance}
          className="w-full rounded-md bg-neutral-900 px-4 py-3 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
        >
          {t.next}
        </button>
      )}
    </main>
  );
}
