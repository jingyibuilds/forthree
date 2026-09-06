"use client";

import type { EventPayload } from "@/lib/analytics";

const SESSION_KEY = "forthree_event_session";

function randomId(prefix: string) {
  const cryptoId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${cryptoId}`;
}

function sessionId() {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const next = randomId("ses");
    window.sessionStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return randomId("ses");
  }
}

function deviceClass() {
  if (typeof window === "undefined") return "unknown";
  const width = window.innerWidth;
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function trackEvent(payload: EventPayload, keepalive = false) {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({
    ...payload,
    sessionId: payload.sessionId ?? sessionId(),
    clientEventId: payload.clientEventId ?? randomId("evt"),
    route: payload.route ?? `${window.location.pathname}${window.location.search}`,
    deviceClass: payload.deviceClass ?? deviceClass(),
  });

  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive,
  }).catch(() => {
    // Product analytics should never interrupt the learning path.
  });
}
