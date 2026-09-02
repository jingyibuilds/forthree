import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { LearnerProfile } from "@/lib/profile";
import { hasCompletedOnboarding } from "@/lib/profile";
import { canResetTestAccount } from "@/lib/test-account";

const INVITE_COOKIE = "forthree_invite";
const INVITE_TTL_SECONDS = 60 * 60 * 24 * 7;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function inviteSecret() {
  const dedicatedSecret = process.env.AUTH_INVITE_COOKIE_SECRET;
  if (dedicatedSecret) return dedicatedSecret;
  if (process.env.NODE_ENV !== "production") {
    return process.env.INVITE_CODE || "local-dev-invite-cookie-secret";
  }
  return "";
}

export function isInviteCookieSigningConfigured() {
  return Boolean(inviteSecret());
}

function sign(payload: string) {
  return createHmac("sha256", inviteSecret()).update(payload).digest("base64url");
}

function timingSafeStringEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

function encodeInvite(email: string) {
  const payload = Buffer.from(
    JSON.stringify({
      email: normalizeEmail(email),
      exp: Math.floor(Date.now() / 1000) + INVITE_TTL_SECONDS,
    })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readInviteEmail(token?: string) {
  if (!token || !inviteSecret()) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !timingSafeStringEqual(signature, sign(payload))) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      email?: string;
      exp?: number;
    };
    if (!data.email || !data.exp || data.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return normalizeEmail(data.email);
  } catch {
    return null;
  }
}

export async function rememberInviteForEmail(email: string) {
  (await cookies()).set(INVITE_COOKIE, encodeInvite(email), {
    httpOnly: true,
    maxAge: INVITE_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearRememberedInvite() {
  (await cookies()).delete(INVITE_COOKIE);
}

export async function hasRememberedInvite(email?: string | null) {
  if (!email) return false;
  const token = (await cookies()).get(INVITE_COOKIE)?.value;
  return readInviteEmail(token) === normalizeEmail(email);
}

export function canEnterLearnerApp(
  email: string | null | undefined,
  profile: LearnerProfile | null
) {
  return hasCompletedOnboarding(profile) || canResetTestAccount(email);
}
