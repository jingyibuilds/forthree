"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";
import { type Dict } from "@/lib/i18n-shared";
import { Seal } from "@/components/seal";

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
      <div className="flex items-center gap-3">
        <Seal size={44} />
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-wide">
            {t.name}
          </h1>
          <p className="mt-0.5 text-sm text-muted">{t.tagline}</p>
        </div>
      </div>

      {linkError && state.status === "idle" && (
        <p className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
          {t.linkInvalid}
        </p>
      )}

      {state.status === "sent" ? (
        <p className="rounded-lg bg-success-soft p-3 text-sm text-success">
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
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="invite" className="block text-sm font-medium">
              {t.inviteCode}
              <span className="ml-1 font-normal text-muted">
                {t.inviteHint}
              </span>
            </label>
            <input
              id="invite"
              name="invite"
              type="text"
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
            />
          </div>
          {state.status === "error" && (
            <p className="text-sm text-accent">{state.message}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {pending ? t.sending : t.send}
          </button>
        </form>
      )}
    </div>
  );
}
