import type { User } from "@supabase/supabase-js";

export const ONBOARDING_PATH = "/onboarding";

type ProfileQueryClient = {
  from: (table: "learner_profiles") => {
    select: (columns: string) => {
      eq: (column: "user_id", value: string) => {
        maybeSingle: () => PromiseLike<{ data: LearnerProfile | null; error: unknown }>;
      };
    };
  };
};

export type LearnerProfile = {
  user_id: string;
  background: Record<string, unknown> | null;
  preferences: Record<string, unknown> | null;
  success_definition: string | null;
  lang_pref: "zh" | "en";
  weekly_budget_hours: number | null;
};

export function learningId(user: Pick<User, "id">) {
  return `FT-${user.id.slice(0, 8).toUpperCase()}`;
}

export function hasCompletedOnboarding(profile?: LearnerProfile | null) {
  const onboarding = profile?.preferences?.onboarding;
  return (
    typeof onboarding === "object" &&
    onboarding !== null &&
    "completed" in onboarding &&
    onboarding.completed === true
  );
}

export async function getLearnerProfile(
  supabase: unknown,
  userId: string
) {
  const profileClient = supabase as ProfileQueryClient;
  const { data, error } = await profileClient
    .from("learner_profiles")
    .select(
      "user_id, background, preferences, success_definition, lang_pref, weekly_budget_hours"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
