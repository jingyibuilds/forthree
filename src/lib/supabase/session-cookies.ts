import { cookies } from "next/headers";

export type CookieLike = {
  name: string;
};

export function hasSupabaseAuthCookieInList(cookieList: CookieLike[]) {
  return cookieList.some(
    ({ name }) => name.startsWith("sb-") && name.includes("-auth-token")
  );
}

export async function hasSupabaseAuthCookie() {
  return hasSupabaseAuthCookieInList((await cookies()).getAll());
}
