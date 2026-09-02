import type { Locale } from "@/lib/i18n-shared";

export function estimateMinuteRange(minutes: number) {
  const center = Math.max(1, Math.round(minutes));
  const low = Math.max(1, center - 1);
  const high = center + 1;
  return low === high ? String(center) : `${low}-${high}`;
}

export function activeMinutes(seconds: number) {
  if (seconds <= 0) return 0;
  return Math.max(1, Math.round(seconds / 60));
}

export function formatActiveMinutes(seconds: number, locale: Locale) {
  const minutes = activeMinutes(seconds);
  return locale === "zh" ? `${minutes} 分钟` : `${minutes} min`;
}
