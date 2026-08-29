import { cookies } from "next/headers";
import { dict, actionMessages, type Locale } from "./i18n-shared";

export { actionMessages, dict };
export type { Dict, Locale } from "./i18n-shared";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get("locale")?.value;
  return value === "zh" ? "zh" : "en";
}
