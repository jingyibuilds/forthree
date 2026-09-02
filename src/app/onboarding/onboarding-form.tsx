"use client";

import { useActionState } from "react";
import { type Dict } from "@/lib/i18n-shared";
import { saveOnboarding, type OnboardingState } from "./actions";

const initialState: OnboardingState = {
  status: "idle",
  message: "",
};

function ChoiceCard({
  name,
  type,
  value,
  label,
  required = false,
  defaultChecked = false,
}: {
  name: string;
  type: "checkbox" | "radio";
  value: string;
  label: string;
  required?: boolean;
  defaultChecked?: boolean;
}) {
  return (
    <label className="group block cursor-pointer">
      <input
        name={name}
        type={type}
        value={value}
        required={required}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="flex min-h-11 items-center gap-3 rounded-lg border border-line bg-background px-3 py-2 text-sm shadow-sm transition-[background-color,border-color,box-shadow,transform] group-hover:-translate-y-px group-hover:border-primary/45 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:shadow-md peer-checked:[&>span:first-child]:border-primary peer-checked:[&>span:first-child]:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30">
        <span
          aria-hidden="true"
          className={`h-3.5 w-3.5 shrink-0 border border-muted/45 bg-surface ${
            type === "radio" ? "rounded-full" : "rounded-[4px]"
          }`}
        />
        <span>{label}</span>
      </span>
    </label>
  );
}

export function OnboardingForm({ t }: { t: Dict }) {
  const [state, formAction, pending] = useActionState(saveOnboarding, initialState);

  return (
    <form action={formAction} className="space-y-8">
      <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
        <h2 className="font-serif text-2xl font-semibold">{t.onboardingProfileTitle}</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            {t.onboardingRole}
            <select
              name="role"
              required
              defaultValue=""
              className="mt-2 min-h-11 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none shadow-sm transition-colors focus:border-primary"
            >
              <option value="" disabled>
                {t.chooseOne}
              </option>
              {t.onboardingRoleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium">
            {t.weeklyBudget}
            <input
              name="weekly_budget"
              type="number"
              min={1}
              max={8}
              step={0.5}
              required
              defaultValue={2.5}
              className="mt-2 min-h-11 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none shadow-sm transition-colors focus:border-primary"
            />
          </label>
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm font-medium">{t.knownTools}</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {t.knownToolOptions.map((option) => (
              <ChoiceCard
                key={option.value}
                name="known_tools"
                type="checkbox"
                value={option.value}
                label={option.label}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="text-sm font-medium">{t.confidenceNow}</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {t.confidenceOptions.map((option) => (
              <ChoiceCard
                key={option.value}
                name="confidence"
                type="radio"
                value={option.value}
                label={option.label}
                required
              />
            ))}
          </div>
        </fieldset>
      </section>

      <section className="rounded-lg border border-line bg-surface p-5 shadow-sm">
        <h2 className="font-serif text-2xl font-semibold">{t.onboardingGoalTitle}</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            {t.motivation}
            <textarea
              name="motivation"
              required
              rows={4}
              className="mt-2 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none shadow-sm transition-colors focus:border-primary"
              placeholder={t.motivationPlaceholder}
            />
          </label>
          <label className="block text-sm font-medium">
            {t.successDefinition}
            <textarea
              name="success_definition"
              required
              rows={4}
              className="mt-2 w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none shadow-sm transition-colors focus:border-primary"
              placeholder={t.successPlaceholder}
            />
          </label>
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm font-medium">{t.learningMode}</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {t.learningModeOptions.map((option) => (
              <ChoiceCard
                key={option.value}
                name="learning_mode"
                type="radio"
                value={option.value}
                label={option.label}
                required
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="text-sm font-medium">{t.contentExamples}</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {t.contentExampleOptions.map((option) => (
              <ChoiceCard
                key={option.value}
                name="content_examples"
                type="checkbox"
                value={option.value}
                label={option.label}
              />
            ))}
          </div>
        </fieldset>
      </section>

      <section className="rounded-lg border border-primary/30 bg-surface p-5 shadow-sm">
        <fieldset>
          <legend className="text-sm font-medium">{t.langPref}</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {t.langPrefOptions.map((option) => (
              <ChoiceCard
                key={option.value}
                name="lang_pref"
                type="radio"
                value={option.value}
                label={option.label}
                required
                defaultChecked={option.value === "zh"}
              />
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={pending}
          className="mt-5 min-h-12 w-full rounded-lg bg-primary px-5 py-3 text-base font-semibold text-on-primary shadow-sm transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-primary-hover active:translate-y-0 disabled:translate-y-0 disabled:opacity-50"
        >
          {pending ? t.savingProfile : t.finishOnboarding}
        </button>
        <div className="mt-3 min-h-12" aria-live="polite">
          {state.status === "error" && (
            <p className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
              {state.message}
            </p>
          )}
        </div>
      </section>
    </form>
  );
}
