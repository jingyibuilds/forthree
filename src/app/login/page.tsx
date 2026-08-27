"use client";

import { Suspense } from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { sendMagicLink, type LoginState } from "./actions";

const initialState: LoginState = { status: "idle", message: "" };

function LoginForm() {
  const [state, formAction, pending] = useActionState(
    sendMagicLink,
    initialState
  );
  const searchParams = useSearchParams();
  const linkError = searchParams.get("error");

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">反三</h1>
          <p className="mt-1 text-sm text-neutral-500">举一反三</p>
        </div>

        {linkError && state.status === "idle" && (
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            登录链接无效或已失效。请重新发送一个,并注意:邮件里的链接要在
            <strong>发起登录的同一个浏览器</strong>里打开(如果邮箱在别的浏览器,
            可以右键复制链接地址,粘贴到这边的地址栏)。
          </p>
        )}

        {state.status === "sent" ? (
          <p className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
            {state.message}
          </p>
        ) : (
          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                邮箱
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="invite" className="block text-sm font-medium">
                邀请码
                <span className="ml-1 font-normal text-neutral-400">
                  (仅首次注册需要)
                </span>
              </label>
              <input
                id="invite"
                name="invite"
                type="text"
                autoComplete="off"
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>
            {state.status === "error" && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {state.message}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900"
            >
              {pending ? "发送中…" : "发送登录链接"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
