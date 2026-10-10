import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getSessionUser } from "@/lib/auth/context";
import { getI18n } from "@/lib/i18n/server";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [{ t, locale }, { user }] = await Promise.all([getI18n(), getSessionUser()]);
  return (
    <>
      <SiteHeader t={t} locale={locale} signedIn={Boolean(user)} />
      <main id="main">{children}</main>
      <SiteFooter t={t} locale={locale} />
    </>
  );
}
