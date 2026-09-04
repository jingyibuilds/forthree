"use server";

import { redirect } from "next/navigation";
import { canEnterLearnerApp, hasRememberedInvite } from "@/lib/access";
import {
  describeDiagnostic,
  diagnosticQuestions,
  scoreDiagnostic,
  type DiagnosticAnswer,
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
    canEnterLearnerApp(user.email, profile) || (await hasRememberedInvite(user.email));
  if (!canSave) {
    return {
      status: "error",
      message:
        locale === "zh"
          ? "首次进入需要有效邀请码。"
          : "First entry requires a valid invite.",
    };
  }

  const answers: DiagnosticAnswer[] = diagnosticQuestions.map((question) => ({
    questionId: question.id,
    optionId: String(formData.get(question.id) ?? ""),
  }));
  const axes = scoreDiagnostic(answers);
  if (!axes) {
    return {
      status: "error",
      message:
        locale === "zh"
          ? "请完成三道判断题。"
          : "Please complete the three quick checks.",
    };
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.from("learner_profiles").upsert({
    user_id: user.id,
    background: {
      ...(profile?.background ?? {}),
      activation_diagnostic: {
        completed: true,
        completed_at: new Date().toISOString(),
        version: 1,
        axes,
        answers,
        profile_line: describeDiagnostic(axes, locale),
      },
    },
    preferences: {
      ...(profile?.preferences ?? {}),
      activation: {
        completed: true,
        version: 1,
      },
    },
    lang_pref: profile?.lang_pref ?? locale,
    success_definition: profile?.success_definition ?? null,
    weekly_budget_hours: profile?.weekly_budget_hours ?? null,
    updated_at: new Date().toISOString(),
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

  redirect(hasCompletedOnboarding(profile) ? "/" : lessonPath("m00-l01"));
}

