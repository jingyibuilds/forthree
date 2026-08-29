-- 0003 — Private lesson assistant history
--
-- Assistant conversations are learner data, not course content. Full message
-- bodies are kept for 30 days by default; compact learning signals remain for
-- longer-term pattern review.

create table lesson_assistant_threads (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  lesson_id           text not null,
  started_block_index int not null default 0,
  locale              text not null default 'zh' check (locale in ('zh', 'en')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table lesson_assistant_messages (
  id                  bigint generated always as identity primary key,
  thread_id           uuid not null references lesson_assistant_threads(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  role                text not null check (role in ('user', 'assistant')),
  body                text,
  context_snapshot    jsonb not null default '{}'::jsonb,
  learning_signal     jsonb not null default '{}'::jsonb,
  provider            text,
  model               text,
  tokens_in           int not null default 0,
  tokens_out          int not null default 0,
  cost_usd            numeric not null default 0,
  degraded_reason     text,
  body_retained_until timestamptz not null default (now() + interval '30 days'),
  body_compacted_at   timestamptz,
  created_at          timestamptz not null default now()
);

create index lesson_assistant_threads_user_updated_idx
  on lesson_assistant_threads (user_id, updated_at desc);

create index lesson_assistant_messages_user_created_idx
  on lesson_assistant_messages (user_id, created_at desc);

create index lesson_assistant_messages_thread_created_idx
  on lesson_assistant_messages (thread_id, created_at asc);

alter table lesson_assistant_threads enable row level security;
alter table lesson_assistant_messages enable row level security;

revoke all on table lesson_assistant_threads from anon, authenticated;
revoke all on table lesson_assistant_messages from anon, authenticated;

grant select, insert, update on table lesson_assistant_threads to authenticated;
grant select, insert, update on table lesson_assistant_messages to authenticated;
grant usage, select on sequence lesson_assistant_messages_id_seq to authenticated;

create policy "own assistant threads" on lesson_assistant_threads
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own assistant messages" on lesson_assistant_messages
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
