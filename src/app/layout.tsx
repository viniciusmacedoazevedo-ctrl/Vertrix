import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { getI18n } from "@/lib/i18n/server";
import { I18nProvider } from "@/components/i18n-provider";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: { default: t.landing.meta.title, template: "%s · VELTRIX" },
    description: t.landing.meta.description,
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    icons: { icon: "/icon.svg" },
  };
}

export const viewport: Viewport = { themeColor: "#05070d", colorScheme: "dark" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getI18n();
  return (
    <html lang={locale} className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh bg-bg text-fg antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:text-white"
        >
          {t.common.skipToContent}
        </a>
        <I18nProvider locale={locale} messages={t}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
