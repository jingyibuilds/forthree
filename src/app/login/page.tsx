import { dict, getLocale } from "@/lib/i18n";
import { LocaleToggle } from "@/components/locale-toggle";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const locale = await getLocale();
  const { error } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center p-6">
      <LocaleToggle locale={locale} />
      <LoginForm t={dict[locale]} linkError={Boolean(error)} />
    </main>
  );
}
