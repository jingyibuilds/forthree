import { NextResponse, type NextRequest } from "next/server";
import {
  compactProperties,
  isEventName,
  type DeviceClass,
  type EventPayload,
} from "@/lib/analytics";
import { getDevLocalUser } from "@/lib/dev-local-account";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseAuthCookieInList } from "@/lib/supabase/session-cookies";
import { createClient } from "@/lib/supabase/server";

const deviceClasses: DeviceClass[] = ["desktop", "mobile", "tablet", "unknown"];

function stringOrNull(value: unknown, max = 240) {
  return typeof value === "string" && value.length > 0 ? value.slice(0, max) : null;
}

function intOrNull(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as EventPayload | null;
  if (!body || !isEventName(body.eventName)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  if ((await getDevLocalUser()) || !hasSupabaseAuthCookieInList(request.cookies.getAll())) {
    return NextResponse.json({ ok: true, persisted: false });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: true, persisted: false });
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("app_events").insert({
      user_id: user.id,
      session_id: stringOrNull(body.sessionId, 160),
      client_event_id:
        stringOrNull(body.clientEventId, 180) ??
        `evt_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      event_name: body.eventName,
      route: stringOrNull(body.route),
      locale: body.locale === "zh" || body.locale === "en" ? body.locale : null,
      device_class:
        body.deviceClass && deviceClasses.includes(body.deviceClass)
          ? body.deviceClass
          : "unknown",
      lesson_id: stringOrNull(body.lessonId, 80),
      block_index: intOrNull(body.blockIndex),
      block_type: stringOrNull(body.blockType, 40),
      exercise_id: stringOrNull(body.exerciseId, 100),
      properties: compactProperties(body.properties ?? {}),
    });

    if (error && error.code !== "23505") {
      return NextResponse.json({ ok: false }, { status: 202 });
    }
  } catch {
    return NextResponse.json({ ok: false }, { status: 202 });
  }

  return NextResponse.json({ ok: true });
}
