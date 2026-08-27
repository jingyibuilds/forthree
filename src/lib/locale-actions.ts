"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function flipLocale() {
  const store = await cookies();
  const current = store.get("locale")?.value === "zh" ? "zh" : "en";
  store.set("locale", current === "zh" ? "en" : "zh", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
