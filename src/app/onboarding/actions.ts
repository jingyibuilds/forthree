"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { canEnterLearnerApp, clearRememberedInvite, hasRememberedInvite } from "@/lib/access";
import { actionMessages, getLocale } from "@/lib/i18n";
import { getLearnerProfile } from "@/lib/profile";
import { COURSE_PATH } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = {
  status: "idle" | "error";
  message: string;
};

const calibrationAnswers = {
  c1: "interpreter",
  c2: "terminal",
  c3: "input",
  c4: "pseudocode",
  c5: "test",
} as const;

function getAll(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .map((value) => String(value).trim())
    .filter(Boolean);
}

export async function saveOnboarding(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const locale = await getLocale();
  const messages = actionMessages[locale];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: messages.loginRequired };
  }

  const existingProfile = await getLearnerProfile(supabase, user.id);
  const canCreateProfile =
    canEnterLearnerApp(user.email, existingProfile) || (await hasRememberedInvite(user.email));
  if (!canCreateProfile) {
    return { status: "error", message: messages.inviteRequired };
  }

  const role = String(formData.get("role") ?? "").trim();
  const motivation = String(formData.get("motivation") ?? "").trim();
  const successDefinition = String(formData.get("success_definition") ?? "").trim();
  const weeklyBudget = Number(formData.get("weekly_budget"));
  const langPref = formData.get("lang_pref") === "en" ? "en" : "zh";
  const confidence = String(formData.get("confidence") ?? "").trim();
  const learningMode = String(formData.get("learning_mode") ?? "").trim();

  if (!role || !motivation || !successDefinition || !confidence || !learningMode) {
    return { status: "error", message: messages.onboardingRequired };
  }

  if (!Number.isFinite(weeklyBudget) || weeklyBudget < 1 || weeklyBudget > 8) {
    return { status: "error", message: messages.weeklyBudgetInvalid };
  }

  const calibration = Object.keys(calibrationAnswers).map((key) => {
    const answer = String(formData.get(key) ?? "");
    return {
      id: key,
      answer,
      correct: answer === calibrationAnswers[key as keyof typeof calibrationAnswers],
    };
  });
  const calibrationAttempted = calibration.some((item) => item.answer);
  const score = calibration.filter((item) => item.correct).length;
  const level = calibrationAttempted
    ? score >= 4
      ? "skip_early_when_proven"
      : score >= 2
        ? "standard"
        : "gentle"
    : "gentle";

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.from("learner_profiles").upsert({
    user_id: user.id,
    background: {
      role,
      known_tools: getAll(formData, "known_tools"),
      confidence,
      motivation,
      calibration: {
        attempted: calibrationAttempted,
        score,
        total: calibration.length,
        level,
        answers: calibration,
      },
    },
    preferences: {
      onboarding: {
        completed: true,
        completed_at: new Date().toISOString(),
        version: 1,
      },
      learning_mode: learningMode,
      content_examples: getAll(formData, "content_examples"),
    },
    success_definition: successDefinition,
    lang_pref: langPref,
    weekly_budget_hours: weeklyBudget,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { status: "error", message: messages.profileSaveFailed };
  }

  const cookieStore = await cookies();
  cookieStore.set("locale", langPref, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  await clearRememberedInvite();

  redirect(COURSE_PATH);
}
