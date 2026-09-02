-- 0004 — Explicit Data API grants
--
-- Supabase no longer guarantees that new public-schema tables are exposed to
-- the Data API automatically. Keep exposure intentional: no signed-out access,
-- authenticated users get only the operations the app uses, and service_role
-- remains available for trusted server-side maintenance.

-- Remove any implicit public/authenticated exposure that older projects may
-- have inherited from Supabase defaults.
revoke all on table modules from anon, authenticated;
revoke all on table lessons from anon, authenticated;
revoke all on table exercises from anon, authenticated;
revoke all on table achievements from anon, authenticated;
revoke all on table learner_profiles from anon, authenticated;
revoke all on table attempts from anon, authenticated;
revoke all on table plans from anon, authenticated;
revoke all on table plan_changelog from anon, authenticated;
revoke all on table xp_events from anon, authenticated;
revoke all on table user_achievements from anon, authenticated;
revoke all on table srs_items from anon, authenticated;
revoke all on table streaks from anon, authenticated;
revoke all on table llm_usage from anon, authenticated;
revoke all on table pulse_checks from anon, authenticated;
revoke all on table skip_debts from anon, authenticated;
revoke all on table lesson_assistant_threads from anon, authenticated;
revoke all on table lesson_assistant_messages from anon, authenticated;

-- Signed-in learner access. RLS policies still enforce user_id ownership.
grant select on table modules, lessons, exercises, achievements to authenticated;

grant select, insert, update on table learner_profiles to authenticated;
grant select, insert on table attempts to authenticated;
grant select on table plans, plan_changelog, user_achievements, skip_debts to authenticated;
grant select, insert on table xp_events to authenticated;
grant select, insert, update on table srs_items, streaks, pulse_checks to authenticated;
grant select, insert on table llm_usage to authenticated;
grant select, insert, update on table lesson_assistant_threads to authenticated;
grant select, insert, update on table lesson_assistant_messages to authenticated;

-- Identity sequences needed by authenticated inserts.
revoke all on sequence attempts_id_seq from anon, authenticated;
revoke all on sequence plans_id_seq from anon, authenticated;
revoke all on sequence plan_changelog_id_seq from anon, authenticated;
revoke all on sequence xp_events_id_seq from anon, authenticated;
revoke all on sequence pulse_checks_id_seq from anon, authenticated;
revoke all on sequence skip_debts_id_seq from anon, authenticated;
revoke all on sequence lesson_assistant_messages_id_seq from anon, authenticated;

grant usage, select on sequence attempts_id_seq to authenticated;
grant usage, select on sequence xp_events_id_seq to authenticated;
grant usage, select on sequence pulse_checks_id_seq to authenticated;
grant usage, select on sequence lesson_assistant_messages_id_seq to authenticated;

-- Trusted server-side maintenance and future seed scripts.
grant all privileges on table
  modules,
  lessons,
  exercises,
  achievements,
  learner_profiles,
  attempts,
  plans,
  plan_changelog,
  xp_events,
  user_achievements,
  srs_items,
  streaks,
  llm_usage,
  pulse_checks,
  skip_debts,
  lesson_assistant_threads,
  lesson_assistant_messages
to service_role;

grant all privileges on sequence
  attempts_id_seq,
  plans_id_seq,
  plan_changelog_id_seq,
  xp_events_id_seq,
  pulse_checks_id_seq,
  skip_debts_id_seq,
  lesson_assistant_messages_id_seq
to service_role;

-- Future tables/functions/sequences must opt in explicitly in their migration.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;
