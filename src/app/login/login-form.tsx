"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";
import { type Dict } from "@/lib/i18n";

const initialState: LoginState = { status: "idle", message: "" };

export function LoginForm({
  t,
  linkError,
}: {
  t: Dict;
  linkError: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    sendMagicLink,
    initialState
  );

  return (
    <div className="w-full max-w-sm space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t.tagline}</p>
      </div>

      {linkError && state.status === "idle" && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {t.linkInvalid}
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
              {t.email}
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
              {t.inviteCode}
              <span className="ml-1 font-normal text-neutral-400">
                {t.inviteHint}
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
            {pending ? t.sending : t.send}
          </button>
        </form>
      )}
    </div>
  );
}
