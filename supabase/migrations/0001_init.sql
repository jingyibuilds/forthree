-- forthree — initial schema (Phase 0)
-- Multi-user-ready from day one; single-user MVP in practice.
-- Every user-scoped table enforces RLS: user_id = auth.uid().

-- ============ Content tables (authored offline, seeded via service role) ============

create table modules (
  id          text primary key,          -- e.g. 'm01'
  stage       int not null,
  "order"     int not null,
  title_en    text not null,
  title_zh    text not null,
  description_en text,
  description_zh text,
  refs        jsonb not null default '[]'::jsonb  -- external references (CS50 links, docs)
);

create table lessons (
  id          text primary key,          -- e.g. 'm01-l03'
  module_id   text not null references modules(id),
  "order"     int not null,
  format      text not null,             -- drill | socratic | code | reading | scenario | video
  content_ref text not null,             -- path into /content
  est_minutes int not null,
  tag         text not null default 'core' check (tag in ('core', 'elective'))
);

create table exercises (
  id          text primary key,
  lesson_id   text not null references lessons(id),
  type        text not null,             -- mcq | fill_in | drag_order | code | open
  prompt_en   text not null,
  prompt_zh   text not null,
  answer_spec jsonb not null,            -- deterministic grading spec (exact/regex/tests)
  difficulty  int not null default 1,
  xp_value    int not null default 10
);

create table achievements (
  id            text primary key,
  name_en       text not null,
  name_zh       text not null,
  criteria_json jsonb not null,
  icon          text
);

-- ============ User-scoped tables ============

create table learner_profiles (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  background         jsonb not null default '{}'::jsonb,
  preferences        jsonb not null default '{}'::jsonb,
  success_definition text,
  lang_pref          text not null default 'zh' check (lang_pref in ('zh', 'en')),
  weekly_budget_hours numeric,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table attempts (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null references exercises(id),
  response    jsonb,
  correct     boolean,
  hints_used  int not null default 0,
  ts          timestamptz not null default now()
);

create table plans (
  id                    bigint generated always as identity primary key,
  user_id               uuid not null references auth.users(id) on delete cascade,
  version               int not null,
  plan_json             jsonb not null,
  created_by_checkpoint text,
  created_at            timestamptz not null default now(),
  unique (user_id, version)
);

create table plan_changelog (
  id        bigint generated always as identity primary key,
  plan_id   bigint not null references plans(id) on delete cascade,
  diff_json jsonb not null,
  rationale text,
  ts        timestamptz not null default now()
);

create table xp_events (
  id      bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount  int not null,
  source  text not null,
  ts      timestamptz not null default now()
);

create table user_achievements (
  user_id        uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null references achievements(id),
  ts             timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table srs_items (
  user_id       uuid not null references auth.users(id) on delete cascade,
  exercise_id   text not null references exercises(id),
  ease          numeric not null default 2.5,
  interval_days numeric not null default 0,
  due_at        timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

create table streaks (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  current           int not null default 0,
  longest           int not null default 0,
  freezes_available int not null default 0,
  last_active_date  date
);

create table llm_usage (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users(id) on delete set null,
  tier       text not null check (tier in ('micro', 'planner')),
  provider   text not null,
  model      text not null,
  tokens_in  int not null default 0,
  tokens_out int not null default 0,
  cost_usd   numeric not null default 0,
  ts         timestamptz not null default now()
);

create table pulse_checks (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  trigger_reason text not null,
  response       text,                    -- too_easy | too_hard | not_interesting | useful | dismissed
  ts             timestamptz not null default now()
);

create table skip_debts (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  lesson_id  text not null references lessons(id),
  created_ts timestamptz not null default now(),
  cleared_ts timestamptz
);

-- ============ Row Level Security ============

-- Content tables: readable by any signed-in user; writes only via service role (bypasses RLS).
alter table modules      enable row level security;
alter table lessons      enable row level security;
alter table exercises    enable row level security;
alter table achievements enable row level security;

create policy "content readable by authenticated" on modules      for select to authenticated using (true);
create policy "content readable by authenticated" on lessons      for select to authenticated using (true);
create policy "content readable by authenticated" on exercises    for select to authenticated using (true);
create policy "content readable by authenticated" on achievements for select to authenticated using (true);

-- User-scoped tables: owner-only.
alter table learner_profiles  enable row level security;
alter table attempts          enable row level security;
alter table plans             enable row level security;
alter table plan_changelog    enable row level security;
alter table xp_events         enable row level security;
alter table user_achievements enable row level security;
alter table srs_items         enable row level security;
alter table streaks           enable row level security;
alter table llm_usage         enable row level security;
alter table pulse_checks      enable row level security;
alter table skip_debts        enable row level security;

create policy "own rows" on learner_profiles  for all    to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on attempts          for all    to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on plans             for select to authenticated using (user_id = auth.uid());
create policy "own rows" on plan_changelog    for select to authenticated
  using (exists (select 1 from plans p where p.id = plan_id and p.user_id = auth.uid()));
create policy "own rows" on xp_events         for select to authenticated using (user_id = auth.uid());
create policy "own rows" on user_achievements for select to authenticated using (user_id = auth.uid());
create policy "own rows" on srs_items         for all    to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on streaks           for all    to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on llm_usage         for select to authenticated using (user_id = auth.uid());
create policy "own rows" on pulse_checks      for all    to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own rows" on skip_debts        for select to authenticated using (user_id = auth.uid());

-- Server-owned writes (plans, xp_events, plan_changelog, user_achievements, llm_usage,
-- skip_debts) go through API routes using the service-role key, which bypasses RLS.
