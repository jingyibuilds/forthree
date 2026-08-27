-- 0002 — Phase 1 pragmatics (single-user MVP)
--
-- Decision (docs/DECISIONS.md): course content lives in the repo (/content,
-- the Tier-0 static spine) and ships with each deploy; the database stores
-- only learner state. So: drop foreign keys that point into the content
-- tables (content ids are validated at build time by scripts/validate-content
-- instead), and let the authenticated learner write their own progress rows.
-- When multi-user arrives, XP/usage writes move behind service-role routes.

alter table attempts   drop constraint attempts_exercise_id_fkey;
alter table srs_items  drop constraint srs_items_exercise_id_fkey;
alter table skip_debts drop constraint skip_debts_lesson_id_fkey;

create policy "insert own" on xp_events for insert to authenticated with check (user_id = auth.uid());
create policy "insert own" on llm_usage for insert to authenticated with check (user_id = auth.uid());
