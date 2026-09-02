function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getTestAccountEmails() {
  return (process.env.TEST_ACCOUNT_EMAILS ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

export function isTestResetEnabled() {
  if (getTestAccountEmails().length === 0) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.TEST_ACCOUNT_RESET_ENABLED === "true";
}

export function canResetTestAccount(email?: string | null) {
  if (!email || !isTestResetEnabled()) return false;
  return getTestAccountEmails().includes(normalizeEmail(email));
}
