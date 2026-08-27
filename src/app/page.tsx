import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-semibold">forthree</h1>
        <p className="text-sm text-neutral-500">举一反三</p>

        {user ? (
          <div className="space-y-4">
            <p className="rounded-md bg-green-50 p-4 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
              Hello, authenticated world. 👋
              <br />
              <span className="font-mono">{user.email}</span>
            </p>
            <p className="text-sm text-neutral-500">
              Phase 0 完成。学习功能从 Phase 1 开始。
            </p>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                退出登录 / Sign out
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-block rounded-md bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
          >
            登录 / Sign in
          </Link>
        )}
      </div>
    </main>
  );
}
