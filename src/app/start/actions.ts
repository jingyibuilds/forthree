"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { canEnterFirstRun, hasRememberedInvite } from "@/lib/access";
import { recordEvent } from "@/lib/analytics-server";
import {
  describeDiagnostic,
  diagnosticQuestions,
  expectationItems,
  getActivationReadiness,
  getDiagnosticResult,
  isScenarioPresetId,
  routeActivation,
  scenarioDetailsForPreset,
  scoreDiagnostic,
  type AxisLevel,
  type DiagnosticAnswer,
} from "@/lib/activation-diagnostic";
import { getLocale } from "@/lib/i18n";
import {
  getDevLocalProfile,
  getDevLocalUser,
  setDevLocalCookies,
} from "@/lib/dev-local-account";
import { getLearnerProfile, hasCompletedOnboarding } from "@/lib/profile";
import { lessonPath } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type StartState = {
  status: "idle" | "error";
  message: string;
};

function parseLevel(value: FormDataEntryValue | null): AxisLevel | null {
  if (value !== "0" && value !== "1" && value !== "2" && value !== "3") {
    return null;
  }
  const score = Number(value);
  return score === 0 || score === 1 || score === 2 || score === 3
    ? (score as AxisLevel)
    : null;
}

function parseExpectation(value: FormDataEntryValue | null) {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export async function saveActivationDiagnostic(
  _prev: StartState,
  formData: FormData
): Promise<StartState> {
  const locale = await getLocale();
  const devUser = await getDevLocalUser();
  const supabase = devUser ? null : await createClient();
  const {
    data: { user: supabaseUser },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const user = devUser ?? supabaseUser;

  if (!user) {
    return {
      status: "error",
      message: locale === "zh" ? "请先登录。" : "Please sign in first.",
    };
  }

  const profile = devUser
    ? await getDevLocalProfile()
    : supabase
      ? await getLearnerProfile(supabase, user.id)
      : null;
  const canSave =
    canEnterFirstRun(user.email, profile) ||
    Boolean(devUser) ||
    (await hasRememberedInvite(user.email));
  if (!canSave) {
    return {
      status: "error",
      message:
        locale === "zh"
          ? "首次进入需要有效邀请码。"
          : "First entry requires a valid invite.",
    };
  }

  const now = new Date().toISOString();
  const skipped = formData.get("skip_activation") === "1";
  const presetValue = String(formData.get("scenario_preset") ?? "");
  const scenarioPreset = isScenarioPresetId(presetValue) ? presetValue : null;
  const scenarioDetails = scenarioDetailsForPreset(scenarioPreset, locale);
  const stakes = parseLevel(formData.get("stakes"));
  const friction = parseLevel(formData.get("friction"));

  const answers: DiagnosticAnswer[] = skipped
    ? []
    : diagnosticQuestions.map((question) => ({
        questionId: question.id,
        optionId: String(formData.get(question.id) ?? ""),
      }));
  const axes = skipped ? null : scoreDiagnostic(answers);
  if (!skipped && (stakes === null || friction === null || !axes)) {
    return {
      status: "error",
      message:
        locale === "zh"
          ? "请完成这几个快速判断。"
          : "Please complete the quick checks.",
    };
  }

  const route = skipped ? "skip" : routeActivation(stakes, friction);
  const readinessResult = axes ? getActivationReadiness(axes, locale) : null;
  const diagnosticResult = axes ? getDiagnosticResult(axes, locale) : null;
  const expectations = Object.fromEntries(
    expectationItems.map((item) => [
      item.id,
      parseExpectation(formData.get(`expectation_${item.id}`)),
    ])
  );
  const hasExpectations = Object.values(expectations).some((value) => value !== null);

  if (devUser) {
    setDevLocalCookies(await cookies(), "activated");
    redirect(lessonPath("m00-l01"));
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.from("learner_profiles").upsert({
    user_id: user.id,
    background: {
      ...(profile?.background ?? {}),
      activation_v2: {
        completed: true,
        completed_at: now,
        version: 5,
        skipped,
        verbatim: scenarioDetails?.label ?? null,
        slots: scenarioDetails
          ? {
              task: scenarioDetails.task,
              artifact: scenarioDetails.artifact,
            }
          : null,
        scenario_preset: scenarioPreset,
        stakes,
        friction,
        route,
        axes,
        answers,
        mechanism_line: axes ? describeDiagnostic(axes, locale) : null,
        readiness_level: readinessResult?.level ?? null,
        readiness_score: readinessResult?.score ?? null,
        readiness_title: readinessResult?.title ?? null,
        result_axis: diagnosticResult?.axis ?? null,
        result_title: diagnosticResult?.title ?? null,
        expectations: hasExpectations ? expectations : null,
      },
      activation_diagnostic: {
        completed: true,
        completed_at: now,
        version: 1,
        axes: axes ?? { evidence: 0, precheck: 0, diff: 0 },
        answers,
        profile_line: axes ? describeDiagnostic(axes, locale) : "",
      },
    },
    preferences: {
      ...(profile?.preferences ?? {}),
      activation: {
        completed: true,
        version: 2,
      },
    },
    lang_pref: profile?.lang_pref ?? locale,
    success_definition: profile?.success_definition ?? null,
    weekly_budget_hours: profile?.weekly_budget_hours ?? null,
    updated_at: now,
  });

  if (error) {
    return {
      status: "error",
      message:
        locale === "zh"
          ? "诊断结果暂时保存失败，请再试一次。"
          : "We could not save this yet. Try once more.",
    };
  }

  if (skipped) {
    await recordEvent({
      eventName: "activation_skipped",
      userId: user.id,
      locale,
      route: "/start",
      properties: { surface: "start_flow" },
    });
    redirect(lessonPath("m00-l01"));
  }

  await recordEvent({
    eventName: "activation_route_assigned",
    userId: user.id,
    locale,
    route: "/start",
    properties: {
      assigned_route: route,
      scenario_preset: scenarioPreset,
      stakes,
      friction,
    },
  });

  if (hasExpectations) {
    await recordEvent({
      eventName: "activation_expectations_answered",
      userId: user.id,
      locale,
      route: "/start",
      properties: expectations,
    });
  }

  await recordEvent({
    eventName: "activation_diagnostic_completed",
    userId: user.id,
    locale,
    route: "/start",
    properties: {
      assigned_route: route,
      scenario_preset: scenarioPreset,
      weakest_axis: diagnosticResult?.axis ?? null,
      readiness_level: readinessResult?.level ?? null,
      readiness_score: readinessResult?.score ?? null,
      evidence: axes?.evidence,
      precheck: axes?.precheck,
      diff: axes?.diff,
    },
  });

  redirect(hasCompletedOnboarding(profile) ? "/" : lessonPath("m00-l01"));
}
