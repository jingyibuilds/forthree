import { cookies } from "next/headers";
import type { LearnerProfile } from "@/lib/profile";

export const DEV_LOCAL_USER_COOKIE = "forthree_dev_local_user";
export const DEV_LOCAL_STATE_COOKIE = "forthree_dev_local_state";

export const DEV_LOCAL_USER = {
  id: "dev-local-test-user",
  email: "local-test@forthree.dev",
} as const;

export type DevLocalState = "fresh" | "activated" | "onboarded";

export function isDevLocalAccountEnabled() {
  return process.env.NODE_ENV !== "production";
}

function normalizedState(value?: string): DevLocalState {
  if (value === "activated" || value === "onboarded") return value;
  return "fresh";
}

export async function getDevLocalUser() {
  if (!isDevLocalAccountEnabled()) return null;
  const cookieStore = await cookies();
  return cookieStore.get(DEV_LOCAL_USER_COOKIE)?.value === "1" ? DEV_LOCAL_USER : null;
}

export async function getDevLocalState() {
  if (!(await getDevLocalUser())) return null;
  const cookieStore = await cookies();
  return normalizedState(cookieStore.get(DEV_LOCAL_STATE_COOKIE)?.value);
}

export async function getDevLocalProfile(): Promise<LearnerProfile | null> {
  const state = await getDevLocalState();
  if (!state) return null;

  const activationCompleted = state === "activated" || state === "onboarded";
  const onboardingCompleted = state === "onboarded";
  return {
    user_id: DEV_LOCAL_USER.id,
    background: {
      invite: {
        redeemed: true,
        redeemed_at: "local-dev",
        version: 1,
      },
      ...(activationCompleted
        ? {
            activation_v2: {
              completed: true,
              completed_at: "local-dev",
              version: 4,
              skipped: false,
            },
            activation_diagnostic: {
              completed: true,
              completed_at: "local-dev",
              version: 1,
            },
          }
        : {}),
    },
    preferences: {
      ...(onboardingCompleted
        ? {
            onboarding: {
              completed: true,
              completed_at: "local-dev",
              version: 1,
            },
          }
        : {}),
    },
    success_definition: onboardingCompleted
      ? "Use AI better and verify technical work."
      : null,
    lang_pref: "en",
    weekly_budget_hours: onboardingCompleted ? 1.2 : null,
  };
}

export function setDevLocalCookies(
  responseCookies: Pick<Awaited<ReturnType<typeof cookies>>, "set">,
  state: DevLocalState
) {
  responseCookies.set(DEV_LOCAL_USER_COOKIE, "1", {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  responseCookies.set(DEV_LOCAL_STATE_COOKIE, state, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearDevLocalCookies(
  responseCookies: Pick<Awaited<ReturnType<typeof cookies>>, "delete">
) {
  responseCookies.delete(DEV_LOCAL_USER_COOKIE);
  responseCookies.delete(DEV_LOCAL_STATE_COOKIE);
}
