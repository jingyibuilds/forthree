import { dict, getLocale } from "@/lib/i18n";
import { LocaleToggle } from "@/components/locale-toggle";
import { LoginForm } from "./login-form";
import { Seal } from "@/components/seal";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const locale = await getLocale();
  const t = dict[locale];
  const { error } = await searchParams;

  return (
    <main className="relative min-h-dvh overflow-x-hidden px-5 py-10 sm:px-8">
      <LocaleToggle locale={locale} />
      <div className="mx-auto grid min-w-0 w-full max-w-5xl gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center">
        <section className="min-w-0 space-y-8">
          <div className="flex items-center gap-3">
            <Seal size={48} />
            <div>
              <p className="font-serif text-2xl font-semibold">{t.name}</p>
              <p className="mt-0.5 text-sm text-muted">{t.tagline}</p>
            </div>
          </div>

          <div className="max-w-2xl border-l-4 border-accent pl-5">
            <h1 className="whitespace-pre-line break-words font-serif text-3xl font-semibold leading-tight text-ink sm:text-5xl">
              {t.loginPitchTitle}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted">
              {t.loginAdaptiveNote}
            </p>
          </div>

          <p className="max-w-lg text-sm font-medium leading-6 text-primary">
            {t.loginValueLine}
          </p>
        </section>

        <aside className="min-w-0 rounded-lg border border-line bg-surface p-5 shadow-lg">
          <LoginForm
            t={{
              email: t.email,
              inviteHint: t.inviteHint,
              firstSignupInvite: t.firstSignupInvite,
              send: t.send,
              sending: t.sending,
              linkInvalid: t.linkInvalid,
              notAuthorizedLogin: t.notAuthorizedLogin,
            }}
            linkError={error === "invalid_link"}
            accessError={error === "not_authorized"}
          />
          <p className="mt-4 border-t border-line pt-4 text-sm leading-6 text-muted">
            {t.loginInviteNote}
          </p>
        </aside>
      </div>
    </main>
  );
}
