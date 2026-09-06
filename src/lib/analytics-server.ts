import { compactProperties, isEventName, type EventPayload } from "@/lib/analytics";
import { createAdminClient } from "@/lib/supabase/admin";

export async function recordEvent(
  payload: EventPayload & { userId?: string | null }
) {
  if (!isEventName(payload.eventName)) return;

  try {
    const admin = createAdminClient();
    await admin.from("app_events").insert({
      user_id: payload.userId ?? null,
      session_id: payload.sessionId ?? null,
      client_event_id:
        payload.clientEventId ?? `srv_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      event_name: payload.eventName,
      route: payload.route ?? null,
      locale: payload.locale ?? null,
      device_class: payload.deviceClass ?? "unknown",
      lesson_id: payload.lessonId ?? null,
      block_index:
        typeof payload.blockIndex === "number" && Number.isInteger(payload.blockIndex)
          ? payload.blockIndex
          : null,
      block_type: payload.blockType ?? null,
      exercise_id: payload.exerciseId ?? null,
      properties: compactProperties(payload.properties ?? {}),
    });
  } catch {
    // Missing migrations or env vars should not block auth, learning, or progress.
  }
}
