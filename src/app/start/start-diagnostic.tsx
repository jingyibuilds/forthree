"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import type { Locale } from "@/lib/i18n-shared";
import { trackEvent } from "@/lib/analytics-client";
import {
  describeDiagnostic,
  describeFrictionSignal,
  describeScenarioBridge,
  describeStakesSignal,
  diagnosticQuestions,
  expectationItems,
  getActivationReadiness,
  getDiagnosticResult,
  isScenarioPresetId,
  labelFor,
  routingQuestions,
  scenarioPresetChoices,
  scenarioDetailsForPreset,
  scoreDiagnostic,
  type AxisLevel,
  type DiagnosticAnswer,
  type ScenarioPresetId,
} from "@/lib/activation-diagnostic";
import { saveActivationDiagnostic, type StartState } from "./actions";

const initialState: StartState = {
  status: "idle",
  message: "",
};

const copy = {
  en: {
    kicker: "A 3-minute check first",
    title: "When AI hands work back, how do you judge it?",
    subtitle:
      "No prep, no score. Pick a few everyday moments and see where this course can help you use AI with steadier judgment.",
    start: "Start the check",
    scenarioKicker: "Start with how you use AI",
    scenarioTitle: "Choose the closest kind of task.",
    quickCheck: "One small check",
    resultKicker: "Your result",
    resultSignalsTitle: "Your answers point to",
    resultStakesLabel: "If wrong",
    resultFrictionLabel: "Friction",
    resultFocusLabel: "First practice",
    resultArea: "Why computer basics help",
    scenarioReplay: "Closest task",
    scenarioMissing: "Task not recorded",
    scenarioFallback: "The check still works, but the task choice was not saved.",
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
    rightTrue: "Right. This is true.",
    rightFalse: "Right. This is not true.",
    actualTrue: "This is true.",
    actualFalse: "This is not true.",
    summaryTitle: "In short",
    summaryLines: [
      "Learn: inspect AI work.",
      "Not: a credential or bootcamp.",
      "Bring: one real task.",
    ],
  },
  zh: {
    kicker: "先做个 3 分钟小检查",
    title: "AI 交回来的东西，你通常怎么判断？",
    subtitle: "不用准备，也不打分。选几个日常情境，看看这门课会在哪一步帮你把 AI 用得更稳。",
    start: "开始小检查",
    scenarioKicker: "先从日常用法开始",
    scenarioTitle: "选一个最接近的任务。",
    quickCheck: "一个小判断",
    resultKicker: "你的结果",
    resultSignalsTitle: "刚才的几个判断指向",
    resultStakesLabel: "如果做错",
    resultFrictionLabel: "卡住频率",
    resultFocusLabel: "先练哪一步",
    resultArea: "为什么这里会讲一点计算机基础",
    scenarioReplay: "刚才选择的任务",
    scenarioMissing: "任务未记录",
    scenarioFallback: "这次小检查仍然有效，只是没有保存任务类型。",
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
    rightTrue: "对，这句话成立。",
    rightFalse: "对，这句话不成立。",
    actualTrue: "这里其实成立。",
    actualFalse: "这里其实不成立。",
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
type PersistedStartState = {
  version: 1;
  screen: Screen;
  scenarioPreset: ScenarioPresetId | null;
  routing: {
    stakes: AxisLevel | null;
    friction: AxisLevel | null;
  };
  answers: Record<string, string>;
  expectations: Record<string, boolean | null>;
};

const storageKey = "forthree:start:v5";

function isScreen(value: unknown): value is Screen {
  return (
    value === "hook" ||
    value === "result" ||
    value === "expectations" ||
    screenOrder.includes(value as ScreenKey)
  );
}

function parseStoredLevel(value: unknown): AxisLevel | null {
  return value === 0 || value === 1 || value === 2 || value === 3
    ? value
    : null;
}

function parsePersistedStartState(value: string | null): PersistedStartState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<PersistedStartState>;
    const preset =
      typeof parsed.scenarioPreset === "string" &&
      isScenarioPresetId(parsed.scenarioPreset)
        ? parsed.scenarioPreset
        : null;
    return {
      version: 1,
      screen: isScreen(parsed.screen) ? parsed.screen : "hook",
      scenarioPreset: preset,
      routing: {
        stakes: parseStoredLevel(parsed.routing?.stakes),
        friction: parseStoredLevel(parsed.routing?.friction),
      },
      answers:
        parsed.answers && typeof parsed.answers === "object"
          ? Object.fromEntries(
              Object.entries(parsed.answers).filter(
                ([key, answer]) =>
                  diagnosticQuestions.some((question) => question.id === key) &&
                  typeof answer === "string"
              )
            )
          : {},
      expectations:
        parsed.expectations && typeof parsed.expectations === "object"
          ? Object.fromEntries(
              expectationItems.map((item) => {
                const stored = parsed.expectations?.[item.id];
                return [
                  item.id,
                  typeof stored === "boolean" ? stored : null,
                ];
              })
            )
          : Object.fromEntries(expectationItems.map((item) => [item.id, null])),
    };
  } catch {
    return null;
  }
}

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
  return answer ? t.actualTrue : t.actualFalse;
}

function correctAnswerLine(locale: Locale, answer: boolean) {
  const t = copy[locale];
  return answer ? t.rightTrue : t.rightFalse;
}

function diagnosticArtifact(
  questionId: string,
  locale: Locale,
  preset: ScenarioPresetId | null
) {
  const scenario = scenarioDetailsForPreset(preset, locale);

  if (questionId === "d1") {
    if (locale === "zh") {
      return `你：请帮我${scenario?.task ?? "处理这件事"}。\nAI：好了，我都检查过了，没问题。`;
    }
    return `You: Please ${scenario?.task ?? "handle this"}.\nAI: All done — I checked it and it looks good.`;
  }

  if (questionId === "d3") {
    if (locale === "zh") {
      return [
        "- 统一了格式",
        "- 删掉了重复的部分",
        `- ${scenario?.overwriteLine ?? "保存新版本时，覆盖了原文件"}`,
        "- 显示「已完成」",
      ].join("\n");
    }
    return [
      "- Normalized the formatting",
      "- Removed the duplicated parts",
      `- ${scenario?.overwriteLine ?? "Saved the new version over the original file"}`,
      '- Printed "Done"',
    ].join("\n");
  }

  return null;
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
  const [scenarioPreset, setScenarioPreset] =
    useState<ScenarioPresetId | null>(null);
  const [routing, setRouting] = useState<{
    stakes: AxisLevel | null;
    friction: AxisLevel | null;
  }>({ stakes: null, friction: null });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [expectations, setExpectations] = useState<Record<string, boolean | null>>(
    () => Object.fromEntries(expectationItems.map((item) => [item.id, null]))
  );
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get("fresh") === "1") {
          window.sessionStorage.removeItem(storageKey);
          params.delete("fresh");
          const nextSearch = params.toString();
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`
          );
          setRestored(true);
          return;
        }
        const persisted = parsePersistedStartState(
          window.sessionStorage.getItem(storageKey)
        );
        if (persisted) {
          setScenarioPreset(persisted.scenarioPreset);
          setRouting(persisted.routing);
          setAnswers(persisted.answers);
          setExpectations(persisted.expectations);
          setScreen(persisted.screen);
        }
      } catch {
        // Language switching should never block the activation flow.
      }
      setRestored(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      const payload: PersistedStartState = {
        version: 1,
        screen,
        scenarioPreset,
        routing,
        answers,
        expectations,
      };
      window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // Best-effort only; Supabase/profile persistence happens on completion.
    }
  }, [answers, expectations, restored, routing, scenarioPreset, screen]);

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
  const selectedScenario = scenarioDetailsForPreset(scenarioPreset, locale);
  const normalizedScenario = selectedScenario?.label ?? "";
  const resultBridge = diagnosticResult
    ? describeScenarioBridge({
        axis: diagnosticResult.axis,
        locale,
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
    setScenarioPreset(null);
    setRouting({ stakes: null, friction: null });
    setAnswers({});
    setExpectations(Object.fromEntries(expectationItems.map((item) => [item.id, null])));
    if (!preview) {
      trackEvent({
        eventName: "activation_diagnostic_started",
        locale,
        route: "/start",
      });
    }
    go("scenario");
  }

  function chooseScenario(preset: ScenarioPresetId | null) {
    setScenarioPreset(preset);
    if (!preview) {
      trackEvent({
        eventName: "activation_scenario_submitted",
        locale,
        route: "/start",
        properties: {
          scenario_preset: preset,
        },
      });
    }
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
      <input type="hidden" name="scenario_preset" value={scenarioPreset ?? ""} />
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
                  <span className="block whitespace-nowrap">AI 交回来的东西</span>
                  <span className="block whitespace-nowrap">
                    你通常怎么判断？
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
          onSubmit={
            preview
              ? (event) => event.preventDefault()
              : () => {
                  window.sessionStorage.removeItem(storageKey);
                }
          }
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
              <div className="grid gap-3">
                {scenarioPresetChoices.map((preset) => {
                  const selected = scenarioPreset === preset.id;
                  const label = labelFor(preset, locale);
                  return (
                    <OptionButton
                      key={preset.id}
                      selected={selected}
                      onClick={() => chooseScenario(preset.id)}
                    >
                      {label}
                    </OptionButton>
                  );
                })}
              </div>
              <NavRow
                locale={locale}
                onBack={() => setScreen("hook")}
                showSkip={false}
              />
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
                          scenarioPreset
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
              <section className="rounded-lg border border-line bg-surface px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold text-primary">
                  {normalizedScenario ? t.scenarioReplay : t.scenarioMissing}
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
                  className="min-h-12 w-full rounded-lg bg-primary px-7 py-3 text-base font-semibold text-on-primary shadow-sm transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-primary-hover hover:shadow-md active:translate-y-0 sm:w-auto"
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
                className="min-h-12 w-full rounded-lg bg-primary px-7 py-3 text-base font-semibold text-on-primary shadow-sm transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-primary-hover hover:shadow-md active:translate-y-0 disabled:translate-y-0 disabled:opacity-60"
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
