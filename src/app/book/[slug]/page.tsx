import type { Metadata } from "next";
import Link from "next/link";
import { CalendarX2 } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { I18nProvider } from "@/components/i18n-provider";
import { BookingFlow } from "@/components/booking/booking-flow";
import { bookableDates, getBookingPage } from "@/lib/services/public/booking";
import { getI18n } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = await getBookingPage((await params).slug).catch(() => null);
  const { t } = await getI18n(page?.organization.locale);
  return { title: { absolute: page ? format(t.booking.metaTitle, { name: page.organization.name }) : t.booking.unavailableTitle }, robots: { index: false } };
}

export default async function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = await getBookingPage((await params).slug);
  const { t, locale } = await getI18n(page?.organization.locale);
  const dates = page ? bookableDates(page) : null;
  return (
    <I18nProvider locale={locale} messages={t}>
      <div className="relative min-h-dvh">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-64 max-w-2xl rounded-full bg-accent/10 blur-3xl" aria-hidden />
        <main id="main" className="relative mx-auto max-w-2xl px-4 py-10 sm:py-14">
          {page && dates ? (
            <>
              <header className="mb-8">
                <p className="text-xs font-medium uppercase tracking-wider text-accent">{t.nav.scheduling}</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{page.organization.name}</h1>
              </header>
              <BookingFlow page={page} firstDate={dates.first} lastDate={dates.last} />
            </>
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-10 text-center">
              <CalendarX2 className="mx-auto size-10 text-fg-subtle" aria-hidden />
              <h1 className="mt-4 text-xl font-semibold">{t.booking.unavailableTitle}</h1>
              <p className="mt-2 text-fg-muted">{t.booking.unavailableBody}</p>
            </div>
          )}
          <footer className="mt-12 flex flex-col items-center gap-2 text-xs text-fg-subtle">
            <Link href="/" aria-label="VELTRIX"><Logo compact /></Link>
            <span>{t.booking.poweredBy}</span>
            <Link href="/privacy" className="hover:text-fg">{t.landing.footer.privacy}</Link>
          </footer>
        </main>
      </div>
    </I18nProvider>
  );
}
