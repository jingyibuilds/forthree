-- Server-owned learner profile writes.
-- Learners may read their own profile through RLS, but profile creation and
-- onboarding completion are written by trusted server code after invite checks.

revoke insert, update on table learner_profiles from authenticated;
grant select on table learner_profiles to authenticated;
