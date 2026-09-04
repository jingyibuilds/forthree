"use client";

import { useMemo, useState, useActionState } from "react";
import type { Locale } from "@/lib/i18n-shared";
import {
  defaultDiagnosticMove,
  describeDiagnostic,
  diagnosticQuestions,
  labelFor,
  scoreDiagnostic,
  type DiagnosticAnswer,
} from "@/lib/activation-diagnostic";
import { saveActivationDiagnostic, type StartState } from "./actions";

const initialState: StartState = {
  status: "idle",
  message: "",
};

const copy = {
  en: {
    kicker: "Before the course",
    title: "AI sets your floor. Understanding sets your ceiling.",
    subtitle:
      "You can already ship things. But once they get complicated, it gets hard to tell what went wrong.",
    start: "90 seconds: see what you can inspect now",
    step: "Quick check",
    resultKicker: "Your current pattern",
    moveLabel: "Use this today",
    continue: "Start the first incident",
    saving: "Saving...",
    copyMove: "Copy line",
    copied: "Copied",
    back: "Back",
  },
  zh: {
    kicker: "进入课程前",
    title: "AI 决定你的下限，理解力决定你的上限。",
    subtitle: "你已经能做出东西了。但一旦复杂起来，就不容易说清到底哪里不对。",
    start: "90 秒，看看你现在能检查到哪一层",
    step: "快速判断",
    resultKicker: "你现在的判断习惯",
    moveLabel: "今天先用这一句",
    continue: "先看第一场小事故",
    saving: "保存中...",
    copyMove: "复制这句话",
    copied: "已复制",
    back: "返回",
  },
} as const;

function Artifact({ text }: { text: string }) {
  return (
    <pre className="whitespace-pre-wrap break-words rounded-lg border border-line bg-ink px-4 py-3 font-mono text-xs leading-5 text-on-primary shadow-sm sm:text-sm sm:leading-6">
      {text}
    </pre>
  );
}

export function StartDiagnostic({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const [state, formAction, pending] = useActionState(
    saveActivationDiagnostic,
    initialState
  );
  const [screen, setScreen] = useState<"hook" | number | "result">("hook");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const answerList = useMemo<DiagnosticAnswer[]>(
    () =>
      diagnosticQuestions
        .filter((question) => answers[question.id])
        .map((question) => ({
          questionId: question.id,
          optionId: answers[question.id],
        })),
    [answers]
  );
  const axes = answerList.length === diagnosticQuestions.length
    ? scoreDiagnostic(answerList)
    : null;
  const profileLine = axes ? describeDiagnostic(axes, locale) : "";
  const move = defaultDiagnosticMove[locale];

  function choose(questionIndex: number, optionId: string) {
    const question = diagnosticQuestions[questionIndex];
    setAnswers((prev) => ({ ...prev, [question.id]: optionId }));
    if (questionIndex === diagnosticQuestions.length - 1) {
      setScreen("result");
    } else {
      setScreen(questionIndex + 1);
    }
  }

  async function copyMove() {
    try {
      await navigator.clipboard.writeText(move);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-3xl flex-col justify-center pb-[calc(2rem+env(safe-area-inset-bottom))] pt-6">
      {screen === "hook" ? (
        <section className="space-y-8 border-l-4 border-accent pl-5 sm:pl-6">
          <div className="space-y-3">
            <p className="text-sm font-medium text-primary">{t.kicker}</p>
            <h1 className="font-serif text-[clamp(2rem,8vw,4rem)] font-semibold leading-[1.08] text-ink">
              {t.title}
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
              {t.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setScreen(0)}
            className="min-h-12 rounded-lg bg-primary px-7 py-3 text-base font-semibold text-on-primary shadow-lg transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-primary-hover hover:shadow-xl active:translate-y-0"
          >
            {t.start}
          </button>
        </section>
      ) : screen === "result" && axes ? (
        <form action={formAction} className="space-y-6">
          {diagnosticQuestions.map((question) => (
            <input
              key={question.id}
              type="hidden"
              name={question.id}
              value={answers[question.id] ?? ""}
            />
          ))}
          <section className="rounded-lg border border-line bg-surface p-5 shadow-lg sm:p-6">
            <p className="text-sm font-medium text-primary">{t.resultKicker}</p>
            <p className="mt-3 max-w-2xl font-serif text-2xl font-semibold leading-snug text-ink sm:text-3xl">
              {profileLine}
            </p>
            <div className="mt-6 rounded-lg border-l-4 border-accent bg-background px-4 py-3">
              <p className="text-sm font-medium text-accent">{t.moveLabel}</p>
              <p className="mt-2 text-base leading-7 text-ink">{move}</p>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={pending}
                className="min-h-12 rounded-lg bg-primary px-7 py-3 text-base font-semibold text-on-primary shadow-sm transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-primary-hover active:translate-y-0 disabled:translate-y-0 disabled:opacity-60"
              >
                {pending ? t.saving : t.continue}
              </button>
              <button
                type="button"
                onClick={copyMove}
                className="min-h-12 rounded-lg border border-line bg-background px-5 py-3 text-sm font-medium text-muted shadow-sm transition-[border-color,color,transform] hover:-translate-y-px hover:border-primary hover:text-primary active:translate-y-0"
              >
                {copied ? t.copied : t.copyMove}
              </button>
              <button
                type="button"
                onClick={() => setScreen(diagnosticQuestions.length - 1)}
                className="min-h-12 rounded-lg px-5 py-3 text-sm font-medium text-muted transition-colors hover:text-ink"
              >
                {t.back}
              </button>
            </div>
            {state.status === "error" && (
              <p className="mt-4 rounded-lg bg-warn-soft p-3 text-sm text-warn">
                {state.message}
              </p>
            )}
          </section>
        </form>
      ) : typeof screen === "number" ? (
        <section className="space-y-5">
          {(() => {
            const question = diagnosticQuestions[screen];
            return (
              <>
                <div>
                  <p className="text-sm font-medium text-primary">
                    {t.step} {screen + 1}/{diagnosticQuestions.length}
                  </p>
                  <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                    {locale === "zh" ? question.title_zh : question.title_en}
                  </h1>
                  <p className="mt-3 text-base leading-7 text-muted">
                    {locale === "zh" ? question.prompt_zh : question.prompt_en}
                  </p>
                </div>
                {question.artifact_en && (
                  <Artifact
                    text={locale === "zh" ? question.artifact_zh ?? "" : question.artifact_en}
                  />
                )}
                <div className="grid gap-3">
                  {question.options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => choose(screen, option.id)}
                      className="min-h-12 rounded-lg border border-line bg-surface px-4 py-3 text-left text-base leading-7 shadow-sm transition-[background-color,border-color,transform,box-shadow] hover:-translate-y-px hover:border-primary hover:bg-primary/5 hover:shadow-md"
                    >
                      {labelFor(option, locale)}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setScreen(screen > 0 ? screen - 1 : "hook")}
                  className="min-h-11 self-start rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-ink"
                >
                  {t.back}
                </button>
              </>
            );
          })()}
        </section>
      ) : null}
    </div>
  );
}
