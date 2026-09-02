-- 0006 — Active lesson time
--
-- Records active learning time as a separate learner-owned event stream.
-- This is not seat time: the client only reports visible, recently active
-- lesson interaction, and the server clamps each event to a small interval.

create table lesson_time_events (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  lesson_id       text not null,
  block_index     int,
  active_seconds  int not null check (active_seconds between 1 and 600),
  source          text not null default 'heartbeat'
                  check (source in ('heartbeat', 'step', 'completion')),
  client_event_id text not null,
  created_at      timestamptz not null default now(),
  unique (user_id, client_event_id)
);

create index lesson_time_events_user_created_idx
  on lesson_time_events (user_id, created_at desc);

create index lesson_time_events_user_lesson_idx
  on lesson_time_events (user_id, lesson_id);

alter table lesson_time_events enable row level security;

revoke all on table lesson_time_events from anon, authenticated;
revoke all on sequence lesson_time_events_id_seq from anon, authenticated;

grant select on table lesson_time_events to authenticated;

create policy "own lesson time events" on lesson_time_events
  for select to authenticated
  using (user_id = (select auth.uid()));

grant all privileges on table lesson_time_events to service_role;
grant all privileges on sequence lesson_time_events_id_seq to service_role;
