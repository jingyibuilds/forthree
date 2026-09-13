-- 0009 — Activation scenario event names
--
-- Activation v3 restores the sentence-first entry and emits two additional
-- compact product signals. Free-form scenario text still never enters
-- app_events.

alter table app_events
  drop constraint if exists app_events_event_name_check;

alter table app_events
  add constraint app_events_event_name_check check (
    event_name in (
      'landing_cta_clicked',
      'auth_completed',
      'auth_friction_detected',
      'invite_redeemed',
      'activation_scenario_submitted',
      'activation_routing_answered',
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
  );
