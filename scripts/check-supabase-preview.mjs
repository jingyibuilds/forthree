import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envFile = resolve(".env.local");

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};

  const env = {};
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    env[key] = rawValue.trim().replace(/^['"]|['"]$/g, "");
  }
  return env;
}

const env = { ...parseEnvFile(envFile), ...process.env };
const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secretKey = env.SUPABASE_SECRET_KEY;

const tables = [
  {
    name: "modules",
    columns: ["id", "stage", "order", "title_en", "title_zh", "description_en", "description_zh", "refs"],
  },
  {
    name: "lessons",
    columns: ["id", "module_id", "order", "format", "content_ref", "est_minutes", "tag"],
  },
  {
    name: "exercises",
    columns: ["id", "lesson_id", "type", "prompt_en", "prompt_zh", "answer_spec", "difficulty", "xp_value"],
  },
  {
    name: "achievements",
    columns: ["id", "name_en", "name_zh", "criteria_json", "icon"],
  },
  {
    name: "learner_profiles",
    columns: [
      "user_id",
      "background",
      "preferences",
      "success_definition",
      "lang_pref",
      "weekly_budget_hours",
      "created_at",
      "updated_at",
    ],
  },
  {
    name: "attempts",
    columns: ["id", "user_id", "exercise_id", "response", "correct", "hints_used", "ts"],
  },
  {
    name: "lesson_time_events",
    columns: [
      "id",
      "user_id",
      "lesson_id",
      "block_index",
      "active_seconds",
      "source",
      "client_event_id",
      "created_at",
    ],
  },
  {
    name: "plans",
    columns: ["id", "user_id", "version", "plan_json", "created_by_checkpoint", "created_at"],
  },
  {
    name: "plan_changelog",
    columns: ["id", "plan_id", "diff_json", "rationale", "ts"],
  },
  {
    name: "xp_events",
    columns: ["id", "user_id", "amount", "source", "ts"],
  },
  {
    name: "user_achievements",
    columns: ["user_id", "achievement_id", "ts"],
  },
  {
    name: "srs_items",
    columns: ["user_id", "exercise_id", "ease", "interval_days", "due_at"],
  },
  {
    name: "streaks",
    columns: ["user_id", "current", "longest", "freezes_available", "last_active_date"],
  },
  {
    name: "llm_usage",
    columns: ["id", "user_id", "tier", "provider", "model", "tokens_in", "tokens_out", "cost_usd", "ts"],
  },
  {
    name: "pulse_checks",
    columns: ["id", "user_id", "trigger_reason", "response", "ts"],
  },
  {
    name: "skip_debts",
    columns: ["id", "user_id", "lesson_id", "created_ts", "cleared_ts"],
  },
  {
    name: "lesson_assistant_threads",
    columns: ["id", "user_id", "lesson_id", "started_block_index", "locale", "created_at", "updated_at"],
  },
  {
    name: "lesson_assistant_messages",
    columns: [
      "id",
      "thread_id",
      "user_id",
      "role",
      "body",
      "context_snapshot",
      "learning_signal",
      "provider",
      "model",
      "tokens_in",
      "tokens_out",
      "cost_usd",
      "degraded_reason",
      "body_retained_until",
      "body_compacted_at",
      "created_at",
    ],
  },
];

function tableUrl(table) {
  const params = new URLSearchParams({
    select: table.columns.join(","),
    limit: "0",
  });
  return `${baseUrl}/rest/v1/${table.name}?${params.toString()}`;
}

function isPlaceholder(value) {
  return !value || value.includes("YOUR-") || value.includes("CHOOSE-");
}

function authHeaders(key) {
  const headers = { apikey: key };

  // Legacy anon/service_role keys are JWTs and can act as the bearer token.
  // New sb_publishable/sb_secret keys are not JWTs; send them as apikey only.
  if (key.split(".").length === 3) {
    headers.Authorization = `Bearer ${key}`;
  }

  return headers;
}

async function checkTable(table, key, label) {
  const response = await fetch(tableUrl(table), {
    headers: authHeaders(key),
  });

  let error = "";
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    error = body?.message || body?.hint || response.statusText;
  }

  return {
    table: table.name,
    label,
    ok: response.ok,
    status: response.status,
    error,
  };
}

const failures = [];
if (isPlaceholder(baseUrl)) {
  failures.push("Missing real NEXT_PUBLIC_SUPABASE_URL in .env.local.");
}
if (isPlaceholder(anonKey)) {
  failures.push("Missing real NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.");
}
if (isPlaceholder(secretKey)) {
  failures.push(
    "Missing real SUPABASE_SECRET_KEY in .env.local; use a Supabase secret key or legacy service_role key."
  );
}

if (!isPlaceholder(baseUrl) && !isPlaceholder(anonKey)) {
  console.log("Supabase preview check");
  console.log(`Project: ${new URL(baseUrl).host}`);
  console.log(`Tables: ${tables.length}`);

  if (!isPlaceholder(secretKey)) {
    for (const table of tables) {
      const result = await checkTable(table, secretKey, "service");
      if (!result.ok) {
        failures.push(
          `${table.name}: service Data API check failed (${result.status}) ${result.error}`
        );
      }
    }
  }

  for (const table of tables) {
    const result = await checkTable(table, anonKey, "anon");
    if (result.ok) {
      failures.push(
        `${table.name}: signed-out anon key can reach this table; apply 0004_explicit_data_api_grants.sql.`
      );
    }
  }
}

if (failures.length > 0) {
  console.error("FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("OK");
console.log("Schema tables/columns are reachable with the server key.");
console.log("Signed-out anon access is blocked for app tables.");
