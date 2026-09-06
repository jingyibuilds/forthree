-- 0007 — Lightweight product learning events
--
-- Captures sparse, decision-oriented product signals: attraction, activation,
-- friction, language switching, assistant discovery, and lesson-loop movement.
-- Event text is intentionally compact; private free-form learning data stays
-- in learner-owned profile/assistant tables.

create table app_events (
  id              bigint generated always as identity primary key,
  user_id         uuid references auth.users(id) on delete set null,
  session_id      text,
  client_event_id text not null unique,
  event_name      text not null check (
    event_name in (
      'landing_cta_clicked',
      'auth_completed',
      'auth_friction_detected',
      'invite_redeemed',
      'activation_diagnostic_started',
      'activation_diagnostic_completed',
      'activation_route_assigned',
      'activation_expectations_answered',
      'activation_skipped',
      'onboarding_started',
      'onboarding_completed',
      'lesson_started',
      'lesson_step_viewed',
      'exercise_submitted',
      'hint_requested',
      'lesson_completed',
      'assistant_opened',
      'assistant_message_sent',
      'progress_save_failed',
      'locale_changed'
    )
  ),
  route        text,
  locale       text check (locale in ('zh', 'en')),
  device_class text not null default 'unknown'
               check (device_class in ('desktop', 'mobile', 'tablet', 'unknown')),
  lesson_id    text,
  block_index  int,
  block_type   text,
  exercise_id  text,
  properties   jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index app_events_user_created_idx
  on app_events (user_id, created_at desc);

create index app_events_name_created_idx
  on app_events (event_name, created_at desc);

create index app_events_lesson_created_idx
  on app_events (lesson_id, created_at desc)
  where lesson_id is not null;

alter table app_events enable row level security;

revoke all on table app_events from anon, authenticated;
revoke all on sequence app_events_id_seq from anon, authenticated;

grant select on table app_events to authenticated;

create policy "own app events" on app_events
  for select to authenticated
  using (user_id = (select auth.uid()));

grant all privileges on table app_events to service_role;
grant all privileges on sequence app_events_id_seq to service_role;
