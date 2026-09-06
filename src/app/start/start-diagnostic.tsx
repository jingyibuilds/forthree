"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import type { Locale } from "@/lib/i18n-shared";
import { trackEvent } from "@/lib/analytics-client";
import {
  defaultDiagnosticMove,
  describeDiagnostic,
  describePain,
  diagnosticQuestions,
  expectationItems,
  getDiagnosticResult,
  labelFor,
  painChoices,
  routingQuestions,
  scoreDiagnostic,
  type AxisLevel,
  type DiagnosticAnswer,
  type PainType,
} from "@/lib/activation-diagnostic";
import { saveActivationDiagnostic, type StartState } from "./actions";

const initialState: StartState = {
  status: "idle",
  message: "",
};

const copy = {
  en: {
    kicker: "Before you decide",
    title: '"I thought I was being clear."',
    subtitle:
      "You give more detail. It sounds like it understood. Then the thing it hands back is still off.",
    start: "Take 3 minutes and decide",
    painKicker: "Start here",
    painTitle: "Which moment feels most familiar?",
    painSub:
      "Pick the closest one. This is not a profile; it only shapes the next few minutes.",
    quickCheck: "Quick check",
    resultKicker: "Your result",
    resultArea: "Measured signal",
    painReplay: "You came in with",
    moveLabel: "Use this today",
    resultNext: "One last check",
    startLesson: "Start the first lesson",
    saving: "Saving...",
    copyMove: "Copy line",
    copied: "Copied",
    back: "Back",
    skip: "Skip and start",
    expectationsKicker: "Before the lesson",
    expectationsTitle: "What this course is",
    expectationsSub: "No score. Just the boundary.",
    yes: "True",
    no: "Not true",
    answerLabel: "Answer",
    answerTrue: "Yes",
    answerFalse: "No",
    correctAnswer: "Correct. Answer",
    summaryTitle: "In short",
    summaryLines: [
      "It helps you judge whether AI's work holds up.",
      "It is not a credential, bootcamp, or job-tailored course.",
      "It fits if you already use AI for something that matters, or want to test that fit.",
    ],
    analogy:
      "It can sound fluent while operating on a hidden layer: what it sees, changes, remembers, and overwrites. Learn a little of that layer, and your instructions get sharper.",
  },
  zh: {
    kicker: "在决定要不要上之前",
    title: "「我不是已经说得很清楚了吗？」",
    subtitle: "你说得越细，它越像听懂了。可它交回来的东西，还是不对。",
    start: "花 3 分钟，看看这门课适不适合你",
    painKicker: "先从这里开始",
    painTitle: "哪一种时刻最像你遇到的卡点？",
    painSub: "选最接近的一项就好。这不是画像，只是帮后面几分钟对准问题。",
    quickCheck: "快速判断",
    resultKicker: "你的结果",
    resultArea: "测到的信号",
    painReplay: "你刚才选的卡点",
    moveLabel: "今天先用这一句",
    resultNext: "最后确认一下",
    startLesson: "进入第一课",
    saving: "保存中...",
    copyMove: "复制这句话",
    copied: "已复制",
    back: "返回",
    skip: "跳过，直接开始",
    expectationsKicker: "开始上课前",
    expectationsTitle: "这门课是什么",
    expectationsSub: "不打分，只先说清边界。",
    yes: "对",
    no: "不对",
    answerLabel: "答案",
    answerTrue: "对",
    answerFalse: "不对",
    correctAnswer: "你判断对了。答案",
    summaryTitle: "简单说",
    summaryLines: [
      "它教你判断 AI 交回来的东西靠不靠谱。",
      "它不是认证课、编程训练营，也不是职业定制课。",
      "适合已经在用 AI 做要紧事情，或愿意先试一节的人。",
    ],
    analogy:
      "它说话像听懂了，做事却发生在另一层：看见什么、改了什么、会不会记住或覆盖。懂一点那一层，你就能少绕路。",
  },
} as const;

const screenOrder = [
  "pain",
  "stakes",
  "friction",
  "d1",
  "d2",
  "d3",
  "result",
  "expectations",
] as const;

type ScreenKey = (typeof screenOrder)[number];
type Screen = "hook" | ScreenKey;

function Artifact({ text }: { text: string }) {
  return (
    <pre className="whitespace-pre-wrap break-words rounded-lg border border-ink/80 bg-ink px-4 py-3 font-mono text-xs leading-5 text-on-primary shadow-sm sm:text-sm sm:leading-6">
      {text}
    </pre>
  );
}

function screenIndex(screen: ScreenKey) {
  return screenOrder.indexOf(screen) + 1;
}

function answerLine(locale: Locale, answer: boolean) {
  const t = copy[locale];
  const value = answer ? t.answerTrue : t.answerFalse;
  return locale === "zh" ? `${t.answerLabel}：${value}` : `${t.answerLabel}: ${value}`;
}

function correctAnswerLine(locale: Locale, answer: boolean) {
  const t = copy[locale];
  const value = answer ? t.answerTrue : t.answerFalse;
  return locale === "zh"
    ? `${t.correctAnswer}：${value}。`
    : `${t.correctAnswer}: ${value}.`;
}

function Progress({ screen, locale }: { screen: ScreenKey; locale: Locale }) {
  const current = screenIndex(screen);
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div
        className="grid flex-1 grid-cols-8 gap-1"
        aria-label={locale === "zh" ? `进度 ${current}/8` : `Progress ${current}/8`}
      >
        {screenOrder.map((item, index) => (
          <span
            key={item}
            className={`h-1.5 rounded-full ${
              index < current ? "bg-primary" : "bg-line"
            }`}
          />
        ))}
      </div>
      <span className="font-mono text-xs font-medium text-muted">
        {current}/8
      </span>
    </div>
  );
}

function OptionButton({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-12 rounded-lg border px-4 py-3 text-left text-base leading-7 shadow-sm transition-[background-color,border-color,transform,box-shadow] hover:-translate-y-px hover:border-primary hover:bg-primary/5 hover:shadow-md active:translate-y-0 ${
        selected
          ? "border-primary bg-primary/10 text-ink"
          : "border-line bg-surface text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function NavRow({
  locale,
  onBack,
  showSkip = true,
}: {
  locale: Locale;
  onBack: () => void;
  showSkip?: boolean;
}) {
  const t = copy[locale];
  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onBack}
        className="min-h-11 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-ink"
      >
        {t.back}
      </button>
      {showSkip && (
        <button
          type="submit"
          name="skip_activation"
          value="1"
          className="min-h-11 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-primary"
        >
          {t.skip}
        </button>
      )}
    </div>
  );
}

function SummaryCard({ locale }: { locale: Locale }) {
  const t = copy[locale];
  return (
    <section className="rounded-lg border border-line bg-surface px-3 py-2 shadow-sm">
      <p className="text-xs font-semibold text-primary sm:text-sm">{t.summaryTitle}</p>
      <div className="mt-1 space-y-1 text-xs leading-5 text-muted sm:text-sm">
        {t.summaryLines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </section>
  );
}

export function StartDiagnostic({
  locale,
  preview = false,
}: {
  locale: Locale;
  preview?: boolean;
}) {
  const t = copy[locale];
  const [state, formAction, pending] = useActionState(
    saveActivationDiagnostic,
    initialState
  );
  const [screen, setScreen] = useState<Screen>("hook");
  const [painType, setPainType] = useState<PainType | null>(null);
  const [routing, setRouting] = useState<{
    stakes: AxisLevel | null;
    friction: AxisLevel | null;
  }>({ stakes: null, friction: null });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [expectations, setExpectations] = useState<Record<string, boolean | null>>(
    () => Object.fromEntries(expectationItems.map((item) => [item.id, null]))
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen]);

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
  const axes =
    answerList.length === diagnosticQuestions.length
      ? scoreDiagnostic(answerList)
      : null;
  const diagnosticResult = axes ? getDiagnosticResult(axes, locale) : null;
  const mechanismLine = axes ? describeDiagnostic(axes, locale, painType) : "";
  const move = diagnosticResult?.move ?? defaultDiagnosticMove[locale];
  const painLine = painType ? describePain(painType, locale) : "";

  function go(next: ScreenKey) {
    setScreen(next);
  }

  function backFrom(current: ScreenKey) {
    const index = screenOrder.indexOf(current);
    setScreen(index <= 0 ? "hook" : screenOrder[index - 1]);
  }

  function startDiagnostic() {
    if (!preview) {
      trackEvent({
        eventName: "activation_diagnostic_started",
        locale,
        route: "/start",
      });
    }
    go("pain");
  }

  function choosePain(nextPainType: PainType) {
    setPainType(nextPainType);
    go("stakes");
  }

  function chooseRouting(questionId: "stakes" | "friction", score: AxisLevel) {
    setRouting((prev) => ({ ...prev, [questionId]: score }));
    go(questionId === "stakes" ? "friction" : "d1");
  }

  function chooseDiagnostic(questionIndex: number, optionId: string) {
    const question = diagnosticQuestions[questionIndex];
    setAnswers((prev) => ({ ...prev, [question.id]: optionId }));
    if (questionIndex === diagnosticQuestions.length - 1) {
      go("result");
    } else {
      go(diagnosticQuestions[questionIndex + 1].id as ScreenKey);
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

  const hiddenFields = (
    <>
      <input type="hidden" name="pain_type" value={painType ?? ""} />
      <input type="hidden" name="stakes" value={routing.stakes ?? ""} />
      <input type="hidden" name="friction" value={routing.friction ?? ""} />
      {diagnosticQuestions.map((question) => (
        <input
          key={question.id}
          type="hidden"
          name={question.id}
          value={answers[question.id] ?? ""}
        />
      ))}
      {expectationItems.map((item) => {
        const value = expectations[item.id];
        return (
          <input
            key={item.id}
            type="hidden"
            name={`expectation_${item.id}`}
            value={value === null ? "" : String(value)}
          />
        );
      })}
    </>
  );

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
            onClick={startDiagnostic}
            className="min-h-12 rounded-lg bg-primary px-7 py-3 text-base font-semibold text-on-primary shadow-lg transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-primary-hover hover:shadow-xl active:translate-y-0"
          >
            {t.start}
          </button>
        </section>
      ) : (
        <form
          action={preview ? undefined : formAction}
          className="space-y-5"
          onSubmit={preview ? (event) => event.preventDefault() : undefined}
        >
          {hiddenFields}
          <Progress screen={screen} locale={locale} />

          {screen === "pain" && (
            <section className="space-y-5">
              <div>
                <p className="text-sm font-medium text-primary">{t.painKicker}</p>
                <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                  {t.painTitle}
                </h1>
                <p className="mt-3 text-base leading-7 text-muted">{t.painSub}</p>
              </div>
              <div className="grid gap-3">
                {painChoices.map((choice) => (
                  <OptionButton
                    key={choice.id}
                    selected={painType === choice.id}
                    onClick={() => choosePain(choice.id)}
                  >
                    {labelFor(choice, locale)}
                  </OptionButton>
                ))}
              </div>
              <NavRow locale={locale} onBack={() => setScreen("hook")} />
            </section>
          )}

          {(screen === "stakes" || screen === "friction") && (
            <section className="space-y-5">
              {(() => {
                const question = routingQuestions.find((item) => item.id === screen)!;
                const current = routing[question.id];
                return (
                  <>
                    <div>
                      <p className="text-sm font-medium text-primary">{t.quickCheck}</p>
                      <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                        {locale === "zh" ? question.title_zh : question.title_en}
                      </h1>
                    </div>
                    <div className="grid gap-3">
                      {question.options.map((option) => (
                        <OptionButton
                          key={option.id}
                          selected={current === option.score}
                          onClick={() => chooseRouting(question.id, option.score)}
                        >
                          {labelFor(option, locale)}
                        </OptionButton>
                      ))}
                    </div>
                    <NavRow locale={locale} onBack={() => backFrom(screen)} />
                  </>
                );
              })()}
            </section>
          )}

          {(screen === "d1" || screen === "d2" || screen === "d3") && (
            <section className="space-y-5">
              {(() => {
                const questionIndex = diagnosticQuestions.findIndex(
                  (item) => item.id === screen
                );
                const question = diagnosticQuestions[questionIndex];
                return (
                  <>
                    <div>
                      <p className="text-sm font-medium text-primary">{t.quickCheck}</p>
                      <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                        {locale === "zh" ? question.title_zh : question.title_en}
                      </h1>
                      <p className="mt-3 text-base leading-7 text-muted">
                        {locale === "zh" ? question.prompt_zh : question.prompt_en}
                      </p>
                    </div>
                    {question.artifact_en && (
                      <Artifact
                        text={
                          locale === "zh"
                            ? (question.artifact_zh ?? "")
                            : question.artifact_en
                        }
                      />
                    )}
                    <div className="grid gap-3">
                      {question.options.map((option) => (
                        <OptionButton
                          key={option.id}
                          selected={answers[question.id] === option.id}
                          onClick={() => chooseDiagnostic(questionIndex, option.id)}
                        >
                          {labelFor(option, locale)}
                        </OptionButton>
                      ))}
                    </div>
                    <NavRow locale={locale} onBack={() => backFrom(screen)} />
                  </>
                );
              })()}
            </section>
          )}

          {screen === "result" && (
            <section className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm font-medium text-primary">{t.resultKicker}</p>
                <h1 className="font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                  {diagnosticResult?.title}
                </h1>
                {diagnosticResult && (
                  <p className="text-base leading-7 text-muted">
                    {diagnosticResult.body}
                  </p>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                {diagnosticResult && (
                  <section className="rounded-lg border border-line bg-surface px-4 py-3 shadow-sm">
                    <p className="text-xs font-semibold text-primary">
                      {t.resultArea}
                    </p>
                    <p className="mt-1 text-base font-semibold leading-6 text-ink">
                      {diagnosticResult.area}
                    </p>
                  </section>
                )}
                <section className="rounded-lg border border-line bg-surface px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold text-primary">
                    {t.painReplay}
                  </p>
                  <p className="mt-1 text-sm font-medium leading-6 text-muted">
                    {painLine}
                  </p>
                </section>
              </div>
              {mechanismLine && (
                <p className="text-sm leading-6 text-muted">{mechanismLine}</p>
              )}
              <div className="rounded-lg border-l-4 border-accent bg-background px-4 py-3">
                <p className="text-sm font-medium text-accent">{t.moveLabel}</p>
                <p className="mt-2 text-base leading-7 text-ink">{move}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => go("expectations")}
                  className="min-h-12 rounded-lg bg-primary px-7 py-3 text-base font-semibold text-on-primary shadow-sm transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-primary-hover active:translate-y-0"
                >
                  {t.resultNext}
                </button>
                <button
                  type="button"
                  onClick={copyMove}
                  className="min-h-12 rounded-lg border border-line bg-background px-5 py-3 text-sm font-medium text-muted shadow-sm transition-[border-color,color,transform] hover:-translate-y-px hover:border-primary hover:text-primary active:translate-y-0"
                >
                  {copied ? t.copied : t.copyMove}
                </button>
              </div>
              <NavRow
                locale={locale}
                onBack={() => backFrom("result")}
                showSkip={false}
              />
            </section>
          )}

          {screen === "expectations" && (
            <section className="space-y-2.5">
              <div>
                <p className="text-sm font-medium text-primary">
                  {t.expectationsKicker}
                </p>
                <h1 className="mt-2 font-serif text-2xl font-semibold leading-tight text-ink sm:text-4xl">
                  {t.expectationsTitle}
                </h1>
                <p className="mt-3 text-base leading-7 text-muted">
                  {t.expectationsSub}
                </p>
              </div>

              <SummaryCard locale={locale} />

              <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
                {expectationItems.map((item) => {
                  const current = expectations[item.id];
                  const isCorrect = current === item.answer;
                  return (
                    <section
                      key={item.id}
                      className="px-2.5 py-1.5 sm:p-3"
                    >
                      <p className="text-sm font-semibold leading-5 text-ink sm:text-base sm:leading-6">
                        {locale === "zh" ? item.claim_zh : item.claim_en}
                      </p>
                      <div className="mt-2 grid grid-cols-2 overflow-hidden rounded-lg border border-line">
                        {[
                          { value: true, label: t.yes },
                          { value: false, label: t.no },
                        ].map((option) => (
                          <button
                            key={String(option.value)}
                            type="button"
                            onClick={() =>
                              setExpectations((prev) => ({
                                ...prev,
                                [item.id]: option.value,
                              }))
                            }
                            className={`min-h-11 px-3 py-1.5 text-sm font-medium transition-colors ${
                              current === option.value
                                ? "bg-primary text-on-primary"
                                : "bg-background text-muted hover:text-primary"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      {current !== null && (
                        <div
                          className={`mt-2 rounded-lg border px-3 py-2 ${
                            isCorrect
                              ? "border-primary/30 bg-primary/5"
                              : "border-line bg-background"
                          }`}
                        >
                          <p
                            className={`text-sm font-semibold ${
                              isCorrect ? "text-primary" : "text-ink"
                            }`}
                          >
                            {isCorrect
                              ? correctAnswerLine(locale, item.answer)
                              : answerLine(locale, item.answer)}
                          </p>
                          {!isCorrect && (
                            <p className="mt-1 text-sm font-medium leading-6 text-ink">
                              {locale === "zh" ? item.verdict_zh : item.verdict_en}
                            </p>
                          )}
                          <p className="mt-1 text-sm leading-6 text-muted">
                            {locale === "zh" ? item.body_zh : item.body_en}
                          </p>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>

              <button
                type="submit"
                disabled={pending}
                className="min-h-12 w-full rounded-lg bg-primary px-7 py-3 text-base font-semibold text-on-primary shadow-sm transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-primary-hover active:translate-y-0 disabled:translate-y-0 disabled:opacity-60"
              >
                {pending ? t.saving : t.startLesson}
              </button>
              <NavRow
                locale={locale}
                onBack={() => backFrom("expectations")}
                showSkip={false}
              />
            </section>
          )}

          {state.status === "error" && (
            <p className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
              {state.message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
