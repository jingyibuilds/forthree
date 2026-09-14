import { createAdminClient } from "@/lib/supabase/admin";

const USER_SCOPED_TABLES = [
  "lesson_assistant_messages",
  "lesson_assistant_threads",
  "lesson_time_events",
  "app_events",
  "attempts",
  "xp_events",
  "user_achievements",
  "srs_items",
  "streaks",
  "pulse_checks",
  "skip_debts",
  "llm_usage",
  "plans",
  "learner_profiles",
] as const;

const OPTIONAL_USER_SCOPED_TABLES = new Set<(typeof USER_SCOPED_TABLES)[number]>([
  "lesson_assistant_messages",
  "lesson_assistant_threads",
  "lesson_time_events",
  "app_events",
  "llm_usage",
]);

function isMissingTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { code?: unknown; message?: unknown };
  const code = typeof maybe.code === "string" ? maybe.code : "";
  const message = typeof maybe.message === "string" ? maybe.message : "";
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    /relation .* does not exist/i.test(message) ||
    /could not find the table/i.test(message)
  );
}

export async function resetLearnerOwnedState(userId: string) {
  const admin = createAdminClient();
  const skippedTables: string[] = [];

  for (const table of USER_SCOPED_TABLES) {
    const { error } = await admin.from(table).delete().eq("user_id", userId);
    if (error) {
      if (isMissingTableError(error) && OPTIONAL_USER_SCOPED_TABLES.has(table)) {
        skippedTables.push(table);
        continue;
      }
      throw new Error(`test reset failed on ${table}`);
    }
  }

  return { skippedTables };
}
