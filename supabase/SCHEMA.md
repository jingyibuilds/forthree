# Supabase Schema Ledger

This file is the human-readable ledger for the current target database shape.
Migration SQL remains the source that changes the database; this ledger exists
so an agent can compare app expectations, migrations, and preview checks at a
glance.

## Migration Order

| Migration | Purpose |
| --- | --- |
| `0001_init.sql` | Phase 0 base tables, RLS policies, and original content/user-state schema. |
| `0002_phase1_content_in_repo.sql` | Removes DB foreign keys to repo-authored content ids and lets the authenticated learner write progress/usage rows. |
| `0003_lesson_assistant_history.sql` | Adds private in-lesson assistant threads/messages with 30-day body retention fields. |
| `0004_explicit_data_api_grants.sql` | Makes Supabase Data API grants explicit for the 2026 default-grant change. |
| `0005_server_owned_learner_profiles.sql` | Removes direct authenticated profile writes; onboarding profile writes now go through trusted server code after invite checks. |
| `0006_active_lesson_time.sql` | Adds learner-owned active lesson time events for real study-minute feedback. |

Apply migrations in order through the Supabase SQL Editor until the CLI is
adopted for this project.

## Runtime Tables

| Table | Scope | Current app access |
| --- | --- | --- |
| `attempts` | Learner-owned progress history | `select`, `insert` by authenticated user. |
| `lesson_time_events` | Learner-owned active learning time events | `select` by authenticated user; `insert` only from trusted server code. |
| `learner_profiles` | Learner-owned onboarding profile and preferences | `select` by authenticated user; `insert`/`update` only from trusted server code. |
| `xp_events` | Learner-owned XP event stream | `select`, `insert` by authenticated user. |
| `llm_usage` | Learner-owned LLM cost ledger | `select`, `insert` by authenticated user. |
| `lesson_assistant_threads` | Learner-owned assistant conversation thread | `select`, `insert`, `update` by authenticated user. |
| `lesson_assistant_messages` | Learner-owned assistant messages and compact learning signals | `select`, `insert`, `update` by authenticated user. |

The app currently reads lesson/module/exercise content from `/content`, not from
the database. The original content tables remain in the schema so the design can
grow into seeded content later.

## Privacy Rules

- Signed-out (`anon`) requests should not reach any app table through the Data
  API.
- Every learner-owned table has RLS enabled and uses `user_id = auth.uid()` or
  an ownership check through the parent plan/thread.
- `lesson_time_events.active_seconds` records active, visible lesson
  interaction, not raw page-open time. The client reports small intervals and
  the server clamps each event before insert.
- `lesson_assistant_messages.body` is private learner data. Bodies are retained
  for 30 days by default; `learning_signal` stays as the compact long-term
  record.
- `service_role` may access all tables only from trusted server-side scripts or
  maintenance tasks. Never expose it to browser code.

## Preview Check

Run this after applying migrations to a local, preview, or production Supabase
project:

```bash
npm run check:supabase
```

The check reads `.env.local`, verifies the expected tables/columns through the
Data API using `SUPABASE_SECRET_KEY`, and confirms the signed-out anon key cannot
reach private app tables. It does not insert, update, delete, or print secrets.
