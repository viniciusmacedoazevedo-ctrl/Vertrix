import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/marketing/locale-switcher";
import { getI18n } from "@/lib/i18n/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t, locale } = await getI18n();
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-72 max-w-xl rounded-full bg-accent/15 blur-3xl" aria-hidden />
      <header className="relative flex items-center justify-between px-4 py-5 sm:px-8">
        <Link href="/" aria-label="VELTRIX">
          <Logo />
        </Link>
        <LocaleSwitcher locale={locale} t={t} />
      </header>
      <main id="main" className="relative flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">
        <div className="w-full max-w-md animate-rise">{children}</div>
      </main>
    </div>
  );
}
