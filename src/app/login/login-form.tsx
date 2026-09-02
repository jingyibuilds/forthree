"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";

export type LoginCopy = {
  email: string;
  inviteHint: string;
  firstSignupInvite: string;
  send: string;
  sending: string;
  linkInvalid: string;
  notAuthorizedLogin: string;
};

const initialState: LoginState = {
  status: "idle",
  message: "",
  email: "",
  needsInvite: false,
};

export function LoginForm({
  t,
  linkError,
  accessError,
}: {
  t: LoginCopy;
  linkError: boolean;
  accessError: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    sendMagicLink,
    initialState
  );

  return (
    <div className="w-full space-y-5">
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
            defaultValue={state.email}
            className="mt-1 min-h-11 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none shadow-sm transition-colors focus:border-primary"
            placeholder="you@example.com"
          />
        </div>

        <div
          className={
            state.needsInvite
              ? "rounded-lg border border-warn bg-warn-soft p-3"
              : ""
          }
        >
          <label htmlFor="invite" className="block text-sm font-medium">
            {t.firstSignupInvite}
            <span className="ml-1 font-normal text-muted">{t.inviteHint}</span>
          </label>
          <input
            id="invite"
            name="invite"
            type="text"
            autoComplete="off"
            className="mt-1 min-h-11 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none shadow-sm transition-colors focus:border-primary"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="min-h-12 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-primary-hover active:translate-y-0 disabled:translate-y-0 disabled:opacity-50"
        >
          {pending ? t.sending : t.send}
        </button>
        <div className="min-h-16" aria-live="polite">
          {state.status === "sent" && (
            <p className="rounded-lg bg-success-soft p-3 text-sm text-success">
              {state.message}
            </p>
          )}
          {state.status === "error" && (
            <p className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
              {state.message}
            </p>
          )}
          {linkError && state.status === "idle" && (
            <p className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
              {t.linkInvalid}
            </p>
          )}
          {accessError && state.status === "idle" && (
            <p className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
              {t.notAuthorizedLogin}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
