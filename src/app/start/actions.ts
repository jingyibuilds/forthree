"use server";

import { redirect } from "next/navigation";
import { canEnterFirstRun, hasRememberedInvite } from "@/lib/access";
import { recordEvent } from "@/lib/analytics-server";
import {
  describeDiagnostic,
  diagnosticQuestions,
  expectationItems,
  getDiagnosticResult,
  isPainType,
  routeActivation,
  scoreDiagnostic,
  type AxisLevel,
  type DiagnosticAnswer,
  type PainType,
} from "@/lib/activation-diagnostic";
import { getLocale } from "@/lib/i18n";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      message: locale === "zh" ? "请先登录。" : "Please sign in first.",
    };
  }

  const profile = await getLearnerProfile(supabase, user.id);
  const canSave =
    canEnterFirstRun(user.email, profile) || (await hasRememberedInvite(user.email));
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
  const painValue = String(formData.get("pain_type") ?? "");
  const painType: PainType | null = isPainType(painValue) ? painValue : null;
  const stakes = parseLevel(formData.get("stakes"));
  const friction = parseLevel(formData.get("friction"));

  const answers: DiagnosticAnswer[] = skipped
    ? []
    : diagnosticQuestions.map((question) => ({
        questionId: question.id,
        optionId: String(formData.get(question.id) ?? ""),
      }));
  const axes = skipped ? null : scoreDiagnostic(answers);
  if (!skipped && (!painType || stakes === null || friction === null || !axes)) {
    return {
      status: "error",
      message:
        locale === "zh"
          ? "请完成这几个快速判断。"
          : "Please complete the quick checks.",
    };
  }

  const route = skipped ? "skip" : routeActivation(stakes, friction);
  const diagnosticResult = axes ? getDiagnosticResult(axes, locale) : null;
  const expectations = Object.fromEntries(
    expectationItems.map((item) => [
      item.id,
      parseExpectation(formData.get(`expectation_${item.id}`)),
    ])
  );
  const hasExpectations = Object.values(expectations).some((value) => value !== null);

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.from("learner_profiles").upsert({
    user_id: user.id,
    background: {
      ...(profile?.background ?? {}),
      activation_v2: {
        completed: true,
        completed_at: now,
        version: 2,
        skipped,
        pain_type: painType,
        stakes,
        friction,
        route,
        axes,
        answers,
        mechanism_line: axes ? describeDiagnostic(axes, locale, painType) : null,
        result_axis: diagnosticResult?.axis ?? null,
        result_title: diagnosticResult?.title ?? null,
        result_move: diagnosticResult?.move ?? null,
        expectations: hasExpectations ? expectations : null,
      },
      activation_diagnostic: {
        completed: true,
        completed_at: now,
        version: 1,
        axes: axes ?? { evidence: 0, precheck: 0, diff: 0 },
        answers,
        profile_line: axes ? describeDiagnostic(axes, locale, painType) : "",
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
      pain_type: painType,
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
      pain_type: painType,
      weakest_axis: diagnosticResult?.axis ?? null,
      evidence: axes?.evidence,
      precheck: axes?.precheck,
      diff: axes?.diff,
    },
  });

  redirect(hasCompletedOnboarding(profile) ? "/" : lessonPath("m00-l01"));
}
