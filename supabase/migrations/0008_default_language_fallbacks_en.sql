-- 0008 — Default new language fallbacks to English

alter table learner_profiles
  alter column lang_pref set default 'en';

alter table lesson_assistant_threads
  alter column locale set default 'en';
