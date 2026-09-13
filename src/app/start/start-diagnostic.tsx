"use client";

import { useEffect, useMemo, useRef, useState, useActionState } from "react";
import type { Locale } from "@/lib/i18n-shared";
import { trackEvent } from "@/lib/analytics-client";
import {
  cleanScenarioText,
  describeDiagnostic,
  describeFrictionSignal,
  describeScenarioBridge,
  describeStakesSignal,
  diagnosticQuestions,
  expectationItems,
  getActivationReadiness,
  getDiagnosticResult,
  inferLocalActivationScenario,
  labelFor,
  routingQuestions,
  scenarioPresetChoices,
  scoreDiagnostic,
  truncateSlot,
  type ActivationScenarioSlots,
  type AxisLevel,
  type DiagnosticAnswer,
  type ScenarioPresetId,
  type ScenarioPainType,
} from "@/lib/activation-diagnostic";
import { saveActivationDiagnostic, type StartState } from "./actions";

const initialState: StartState = {
  status: "idle",
  message: "",
};

const copy = {
  en: {
    kicker: "To use AI better",
    title: '"I told AI exactly what I wanted."',
    subtitle:
      "It sounded like it understood. Then the handoff still made you check, redo, or guess.",
    start: "Try the 3-minute check",
    scenarioKicker: "Start with one real AI task",
    scenarioTitle: "The last thing I wanted AI to do for me was",
    scenarioPlaceholder: "A fragment is enough.",
    scenarioNote:
      "We'll reuse one or two words in the next examples. Leave private details out.",
    continue: "Continue",
    scenarioSkip: "Use the general example",
    quickCheck: "One small check",
    resultKicker: "What this shows",
    resultSignalsTitle: "Signals from your answers",
    resultStakesLabel: "If wrong",
    resultFrictionLabel: "Friction",
    resultFocusLabel: "Practice focus",
    resultArea: "Why computer basics help",
    scenarioReplay: "Your original line",
    scenarioGeneric: "General example",
    scenarioFallback:
      "You skipped the sentence, so this used a general AI task.",
    resultNext: "Continue",
    startLesson: "Start the first lesson",
    saving: "Saving...",
    back: "Back",
    skip: "Skip and start",
    expectationsKicker: "Before the lesson",
    expectationsTitle: "What you are starting",
    expectationsSub: "No score. Just the shape of the course.",
    yes: "True",
    no: "Not true",
    answerLabel: "Answer",
    answerTrue: "Yes",
    answerFalse: "No",
    correctAnswer: "Correct. Answer",
    summaryTitle: "In short",
    summaryLines: [
      "Learn: inspect AI work.",
      "Not: a credential or bootcamp.",
      "Bring: one real task.",
    ],
  },
  zh: {
    kicker: "想把 AI 用顺一点",
    title: "我不是已经跟AI说清楚了吗？",
    subtitle: "它听起来像懂了，交回来的东西却还得你判断、返工，或者硬着头皮猜。",
    start: "用 3 分钟试一下",
    scenarioKicker: "先拿一件真实用过 AI 的事",
    scenarioTitle: "最近一次我想让 AI 帮我做的事，是",
    scenarioPlaceholder: "半句也可以。",
    scenarioNote: "接下来会借里面的一两个词，放进后面的小例子里。别写隐私内容。",
    continue: "继续",
    scenarioSkip: "用通用例子继续",
    quickCheck: "一个小判断",
    resultKicker: "这说明什么",
    resultSignalsTitle: "为什么是这个结果",
    resultStakesLabel: "如果做错",
    resultFrictionLabel: "卡住频率",
    resultFocusLabel: "先补一块",
    resultArea: "为什么要学一点计算机基础",
    scenarioReplay: "你写的原句",
    scenarioGeneric: "通用场景",
    scenarioFallback: "你刚才跳过了原句，所以这里用了一个通用 AI 场景。",
    resultNext: "继续",
    startLesson: "进入第一课",
    saving: "保存中...",
    back: "返回",
    skip: "跳过，直接开始",
    expectationsKicker: "开始上课前",
    expectationsTitle: "你要开始的是什么",
    expectationsSub: "不打分，只先说清边界。",
    yes: "对",
    no: "不对",
    answerLabel: "答案",
    answerTrue: "对",
    answerFalse: "不对",
    correctAnswer: "你判断对了。答案",
    summaryTitle: "简单说",
    summaryLines: [
      "学什么：看清 AI 交付。",
      "不是什么：证书课、转码营。",
      "你带来：一件真实任务。",
    ],
  },
} as const;

const screenOrder = [
  "scenario",
  "stakes",
  "friction",
  "d1",
  "d2",
  "d3",
] as const;

type ScreenKey = (typeof screenOrder)[number];
type Screen = "hook" | ScreenKey | "result" | "expectations";

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

function clippedTask(
  verbatim: string,
  slots: ActivationScenarioSlots,
  locale: Locale
) {
  if (slots.task) return slots.task;
  const inferred = inferLocalActivationScenario(verbatim, locale);
  return inferred.task;
}

function clippedArtifact(
  verbatim: string,
  slots: ActivationScenarioSlots,
  locale: Locale
) {
  if (slots.artifact) return slots.artifact;
  const inferred = inferLocalActivationScenario(verbatim, locale);
  return inferred.artifact;
}

function diagnosticArtifact(
  questionId: string,
  locale: Locale,
  verbatim: string,
  slots: ActivationScenarioSlots
) {
  const task = clippedTask(verbatim, slots, locale);
  const artifact = clippedArtifact(verbatim, slots, locale);

  if (questionId === "d1") {
    if (locale === "zh") {
      return `你：请处理这件事：${task ?? "你上次让它做的那件事"}。\nAI：已经处理好了，都检查过，没问题。`;
    }
    return `You: Please handle this: ${task ?? "the thing I asked you to do"}.\nAI: All done — I went through it and it checks out.`;
  }

  if (questionId === "d3") {
    if (locale === "zh") {
      return [
        "- 统一了格式",
        "- 删掉了重复的部分",
        `- 把结果覆盖保存回原来那份${artifact ?? "东西"}`,
        "- 显示「已完成」",
      ].join("\n");
    }
    return [
      "- Normalized the formatting",
      "- Removed the duplicated parts",
      `- Saved the result back over the original ${artifact ?? "file"}`,
      '- Printed "Done"',
    ].join("\n");
  }

  return null;
}

function safeRoleContext(value: string | null) {
  return value ? truncateSlot(value, 24) : "";
}

function Progress({ screen, locale }: { screen: ScreenKey; locale: Locale }) {
  const current = screenIndex(screen);
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div
        className="grid flex-1 grid-cols-6 gap-1"
        aria-label={locale === "zh" ? `进度 ${current}/6` : `Progress ${current}/6`}
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
        {current}/6
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
  const isZh = locale === "zh";
  const [state, formAction, pending] = useActionState(
    saveActivationDiagnostic,
    initialState
  );
  const [screen, setScreen] = useState<Screen>("hook");
  const screenRef = useRef<Screen>("hook");
  const [scenarioText, setScenarioText] = useState("");
  const [scenarioSkipped, setScenarioSkipped] = useState(false);
  const [scenarioPreset, setScenarioPreset] =
    useState<ScenarioPresetId | null>(null);
  const [scenarioSlots, setScenarioSlots] = useState<ActivationScenarioSlots>({
    task: null,
    artifact: null,
  });
  const [scenarioPainType, setScenarioPainType] =
    useState<ScenarioPainType | null>(null);
  const [roleContext, setRoleContext] = useState<string | null>(null);
  const [routing, setRouting] = useState<{
    stakes: AxisLevel | null;
    friction: AxisLevel | null;
  }>({ stakes: null, friction: null });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [expectations, setExpectations] = useState<Record<string, boolean | null>>(
    () => Object.fromEntries(expectationItems.map((item) => [item.id, null]))
  );

  useEffect(() => {
    screenRef.current = screen;
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
  const readinessResult = axes ? getActivationReadiness(axes, locale) : null;
  const diagnosticResult = axes ? getDiagnosticResult(axes, locale) : null;
  const mechanismLine = axes ? describeDiagnostic(axes, locale) : "";
  const normalizedScenario = cleanScenarioText(scenarioText);
  const resultBridge = diagnosticResult
    ? describeScenarioBridge({
        axis: diagnosticResult.axis,
        locale,
        scenarioText: normalizedScenario,
        preset: scenarioPreset,
      })
    : "";
  const resultSignals =
    diagnosticResult && axes
      ? [
          {
            label: t.resultStakesLabel,
            value: describeStakesSignal(routing.stakes, locale),
          },
          {
            label: t.resultFrictionLabel,
            value: describeFrictionSignal(routing.friction, locale),
          },
          {
            label: t.resultFocusLabel,
            value: diagnosticResult.area,
          },
        ]
      : [];

  function go(next: Screen) {
    setScreen(next);
  }

  function backFrom(current: Screen) {
    if (current === "result") {
      setScreen("d3");
      return;
    }
    if (current === "expectations") {
      setScreen("result");
      return;
    }
    const index = screenOrder.indexOf(current as ScreenKey);
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
    go("scenario");
  }

  function requestScenarioExtraction(verbatim: string) {
    if (preview || !verbatim) return;
    void fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feature: "activation_scenario",
        locale,
        verbatim,
      }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: null | {
        slots?: ActivationScenarioSlots;
        roleContext?: string | null;
        painType?: ScenarioPainType | null;
      }) => {
        if (!data) return;
        const hasEnteredVisibleDiagnostic = ["d1", "d2", "d3", "result", "expectations"].includes(
          screenRef.current
        );
        if (data.slots && !hasEnteredVisibleDiagnostic) {
          setScenarioSlots({
            task: data.slots.task ?? null,
            artifact: data.slots.artifact ?? null,
          });
        }
        setRoleContext(data.roleContext ?? null);
        setScenarioPainType(data.painType ?? null);
      })
      .catch(() => {
        // The authored fallback is a complete flow; extraction only narrows nouns.
      });
  }

  function submitScenario(skip = false) {
    const cleaned = skip ? "" : cleanScenarioText(scenarioText);
    const fallback = inferLocalActivationScenario(cleaned, locale);
    setScenarioSkipped(skip || !cleaned);
    setScenarioText(cleaned);
    if (skip || !cleaned) setScenarioPreset(null);
    setScenarioSlots({ task: fallback.task, artifact: fallback.artifact });
    setRoleContext(fallback.roleContext);
    setScenarioPainType(fallback.painType);
    if (!preview) {
      trackEvent({
        eventName: "activation_scenario_submitted",
        locale,
        route: "/start",
        properties: {
          skipped: skip || !cleaned,
          has_text: Boolean(cleaned),
          scenario_preset: skip || !cleaned ? null : scenarioPreset,
          used_preset: Boolean(!skip && cleaned && scenarioPreset),
        },
      });
    }
    requestScenarioExtraction(cleaned);
    go("stakes");
  }

  function chooseRouting(questionId: "stakes" | "friction", score: AxisLevel) {
    setRouting((prev) => ({ ...prev, [questionId]: score }));
    if (questionId === "friction" && !preview) {
      trackEvent({
        eventName: "activation_routing_answered",
        locale,
        route: "/start",
        properties: {
          stakes: routing.stakes,
          friction: score,
        },
      });
    }
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

  const hiddenFields = (
    <>
      <input type="hidden" name="scenario_verbatim" value={normalizedScenario} />
      <input
        type="hidden"
        name="scenario_skipped"
        value={String(scenarioSkipped)}
      />
      <input type="hidden" name="scenario_preset" value={scenarioPreset ?? ""} />
      <input type="hidden" name="scenario_task" value={scenarioSlots.task ?? ""} />
      <input
        type="hidden"
        name="scenario_artifact"
        value={scenarioSlots.artifact ?? ""}
      />
      <input
        type="hidden"
        name="scenario_role_context"
        value={safeRoleContext(roleContext)}
      />
      <input
        type="hidden"
        name="scenario_pain_type"
        value={scenarioPainType ?? ""}
      />
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
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-3xl flex-col justify-start pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[clamp(3.5rem,12dvh,7rem)] sm:justify-center sm:pt-6">
      {screen === "hook" ? (
        <section
          className={`min-w-0 w-full space-y-7 border-l-4 border-accent pl-5 sm:space-y-8 sm:pl-6 ${
            isZh ? "max-w-[22rem] sm:max-w-[34rem]" : "max-w-[21rem] sm:max-w-xl"
          }`}
        >
          <div className="space-y-3">
            <p className="text-sm font-medium text-primary">{t.kicker}</p>
            <h1
              className={`max-w-full font-serif font-semibold text-ink text-balance ${
                isZh
                  ? "text-[clamp(2.15rem,7.4vw,3.35rem)] leading-[1.12]"
                  : "break-words text-[clamp(2rem,7.4vw,3.8rem)] leading-[1.08]"
              }`}
            >
              {isZh ? (
                <>
                  <span className="block whitespace-nowrap">我不是已经</span>
                  <span className="block whitespace-nowrap">
                    跟<span className="font-sans text-[0.9em] tracking-normal">AI</span>说清楚了吗？
                  </span>
                </>
              ) : (
                t.title
              )}
            </h1>
            <p className="max-w-xl break-words text-base leading-7 text-muted sm:text-lg sm:leading-8">
              {t.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={startDiagnostic}
            className="min-h-12 w-full break-words rounded-lg bg-primary px-7 py-3 text-center text-base font-semibold leading-6 text-on-primary shadow-lg transition-[background-color,transform,box-shadow] whitespace-normal hover:-translate-y-px hover:bg-primary-hover hover:shadow-xl active:translate-y-0 sm:w-auto"
          >
            {t.start}
          </button>
        </section>
      ) : (
        <form
          action={preview ? undefined : formAction}
          className="space-y-5 pb-20 sm:pb-0"
          onSubmit={preview ? (event) => event.preventDefault() : undefined}
        >
          {hiddenFields}
          {screenOrder.includes(screen as ScreenKey) && (
            <Progress screen={screen as ScreenKey} locale={locale} />
          )}

          {screen === "scenario" && (
            <section className="space-y-5">
              <div>
                <p className="text-sm font-medium text-primary">
                  {t.scenarioKicker}
                </p>
                <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                  {t.scenarioTitle}
                </h1>
              </div>
              <textarea
                value={scenarioText}
                onChange={(event) => {
                  setScenarioText(event.target.value);
                  setScenarioPreset(null);
                }}
                aria-label={t.scenarioTitle}
                placeholder={t.scenarioPlaceholder}
                rows={3}
                className="min-h-24 w-full resize-none rounded-lg border border-line bg-surface px-4 py-3 text-base leading-7 text-ink shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted focus:border-primary focus:shadow-md"
              />
              <div className="flex flex-wrap gap-2">
                {scenarioPresetChoices.map((preset) => {
                  const selected = scenarioPreset === preset.id;
                  const label = labelFor(preset, locale);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setScenarioText(label);
                        setScenarioPreset(preset.id);
                      }}
                      className={`min-h-11 rounded-full border px-3 py-2 text-left text-xs font-medium leading-5 transition-[border-color,background-color,color] ${
                        selected
                          ? "border-primary bg-accent-soft text-primary"
                          : "border-dashed border-line bg-background text-muted hover:border-primary hover:text-primary"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs leading-5 text-muted">{t.scenarioNote}</p>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => submitScenario(false)}
                  className="fixed inset-x-5 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 min-h-12 rounded-lg bg-primary px-7 py-3 text-base font-semibold text-on-primary shadow-lg transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-primary-hover active:translate-y-0 sm:static sm:w-full sm:shadow-sm"
                >
                  {t.continue}
                </button>
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setScreen("hook")}
                    className="min-h-11 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-ink"
                  >
                    {t.back}
                  </button>
                  <button
                    type="button"
                    onClick={() => submitScenario(true)}
                    className="min-h-11 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-primary"
                  >
                    {t.scenarioSkip}
                  </button>
                </div>
              </div>
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
                    {(() => {
                      const artifact =
                        diagnosticArtifact(
                          question.id,
                          locale,
                          normalizedScenario,
                          scenarioSlots
                        ) ??
                        (locale === "zh"
                          ? question.artifact_zh
                          : question.artifact_en);
                      return artifact ? <Artifact text={artifact} /> : null;
                    })()}
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
            <section className="space-y-4 pb-4 sm:pb-0">
              <div className="space-y-3">
                <p className="text-sm font-medium text-primary">{t.resultKicker}</p>
                {readinessResult && (
                  <p className="inline-flex rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-primary shadow-sm">
                    {readinessResult.label}
                  </p>
                )}
                <h1 className="font-serif text-2xl font-semibold leading-tight text-ink sm:text-4xl">
                  {readinessResult?.title}
                </h1>
                {readinessResult && (
                  <p className="text-base leading-7 text-muted">
                    {readinessResult.body}
                  </p>
                )}
              </div>
              {resultSignals.length > 0 && (
                <section className="rounded-lg border border-line bg-surface px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold text-primary">
                    {t.resultSignalsTitle}
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {resultSignals.map((signal) => (
                      <div
                        key={signal.label}
                        className="border-l-2 border-accent pl-3"
                      >
                        <p className="text-xs font-medium text-muted">
                          {signal.label}
                        </p>
                        <p className="mt-1 text-sm font-semibold leading-5 text-ink">
                          {signal.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              <section className="rounded-lg border border-line bg-surface px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold text-primary">
                  {normalizedScenario ? t.scenarioReplay : t.scenarioGeneric}
                </p>
                <p className="mt-1 text-sm font-medium leading-6 text-muted">
                  {normalizedScenario ? normalizedScenario : t.scenarioFallback}
                </p>
                {diagnosticResult && (
                  <p className="mt-3 border-t border-line pt-3 text-sm leading-6 text-ink">
                    {resultBridge}
                  </p>
                )}
              </section>
              {diagnosticResult && (
                <section className="rounded-lg border border-line bg-surface px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold text-primary">
                    {t.resultArea}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {diagnosticResult.body}
                  </p>
                  {mechanismLine && (
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {mechanismLine}
                    </p>
                  )}
                </section>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => go("expectations")}
                  className="fixed inset-x-5 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 min-h-12 rounded-lg bg-primary px-7 py-3 text-base font-semibold text-on-primary shadow-lg transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-primary-hover active:translate-y-0 sm:static sm:inset-auto sm:z-auto sm:shadow-sm"
                >
                  {t.resultNext}
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
                className="fixed inset-x-5 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 min-h-12 rounded-lg bg-primary px-7 py-3 text-base font-semibold text-on-primary shadow-lg transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-primary-hover active:translate-y-0 disabled:translate-y-0 disabled:opacity-60 sm:static sm:w-full sm:shadow-sm"
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
