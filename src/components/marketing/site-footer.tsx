import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";
import { LocaleSwitcher } from "./locale-switcher";

export function SiteFooter({ t, locale }: { t: Messages; locale: Locale }) {
  return (
    <footer className="border-t border-border bg-bg-elevated">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-fg-subtle">{t.landing.footer.tagline}</p>
          <div className="mt-5">
            <LocaleSwitcher locale={locale} t={t} />
          </div>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">{t.landing.footer.product}</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link className="text-fg-muted hover:text-fg" href="/#produto">{t.landing.nav.product}</Link></li>
            <li><Link className="text-fg-muted hover:text-fg" href="/#como-funciona">{t.landing.nav.howItWorks}</Link></li>
            <li><Link className="text-fg-muted hover:text-fg" href="/#perguntas">{t.landing.nav.faq}</Link></li>
            <li><Link className="text-fg-muted hover:text-fg" href="/signup">{t.landing.nav.signup}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">{t.landing.footer.legal}</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link className="text-fg-muted hover:text-fg" href="/privacy">{t.landing.footer.privacy}</Link></li>
            <li><Link className="text-fg-muted hover:text-fg" href="/terms">{t.landing.footer.terms}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-fg-subtle sm:px-6">
          © {new Date().getFullYear()} VELTRIX. {t.landing.footer.rights}
        </p>
      </div>
    </footer>
  );
}
