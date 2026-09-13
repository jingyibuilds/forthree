import type { Locale } from "@/lib/i18n-shared";

export const eventNames = [
  "landing_cta_clicked",
  "auth_completed",
  "auth_friction_detected",
  "invite_redeemed",
  "activation_scenario_submitted",
  "activation_routing_answered",
  "activation_diagnostic_started",
  "activation_diagnostic_completed",
  "activation_route_assigned",
  "activation_expectations_answered",
  "activation_skipped",
  "onboarding_started",
  "onboarding_completed",
  "lesson_started",
  "lesson_step_viewed",
  "exercise_submitted",
  "hint_requested",
  "lesson_completed",
  "assistant_opened",
  "assistant_message_sent",
  "progress_save_failed",
  "locale_changed",
] as const;

export type EventName = (typeof eventNames)[number];

export type DeviceClass = "desktop" | "mobile" | "tablet" | "unknown";

export type EventPayload = {
  eventName: EventName;
  sessionId?: string;
  clientEventId?: string;
  route?: string;
  locale?: Locale;
  deviceClass?: DeviceClass;
  lessonId?: string;
  blockIndex?: number;
  blockType?: string;
  exerciseId?: string;
  properties?: Record<string, unknown>;
};

export function isEventName(value: unknown): value is EventName {
  return typeof value === "string" && eventNames.includes(value as EventName);
}

export function redactedString(value: string) {
  const trimmed = value.trim();
  if (trimmed.includes("@")) return "[redacted]";
  return trimmed.slice(0, 140);
}

export function compactProperties(value: unknown, depth = 0): unknown {
  if (value === null) return null;
  if (typeof value === "string") return redactedString(value);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => compactProperties(item, depth + 1));
  }
  if (typeof value === "object" && depth < 2) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 24)
        .map(([key, item]) => [key.slice(0, 64), compactProperties(item, depth + 1)])
    );
  }
  return null;
}
