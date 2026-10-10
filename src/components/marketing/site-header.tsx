import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { LinkButton } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";
import { LocaleSwitcher } from "./locale-switcher";

export function SiteHeader({ t, locale, signedIn }: { t: Messages; locale: Locale; signedIn: boolean }) {
  const links = [
    { href: "/#produto", label: t.landing.nav.product },
    { href: "/#como-funciona", label: t.landing.nav.howItWorks },
    { href: "/#exemplos", label: t.landing.nav.useCases },
    { href: "/#perguntas", label: t.landing.nav.faq },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="VELTRIX">
          <Logo />
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-fg-muted transition-colors hover:text-fg">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <LocaleSwitcher locale={locale} t={t} />
          </div>
          {signedIn ? (
            <LinkButton href="/app" size="sm">
              {t.nav.dashboard}
            </LinkButton>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost" size="sm">
                {t.landing.nav.login}
              </LinkButton>
              <LinkButton href="/signup" size="sm">
                {t.landing.nav.signup}
              </LinkButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
