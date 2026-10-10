import type { Metadata } from "next";
import { I18nProvider } from "@/components/i18n-provider";
import { MobileNav, Sidebar, type ShellInfo } from "@/components/app/nav";
import { getAppContext } from "@/lib/auth/context";
import { PLANS, type Plan } from "@/lib/plans";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAppContext();
  const info: ShellInfo = {
    orgName: ctx.org.name,
    userName: ctx.profile?.full_name ?? "",
    userEmail: ctx.user.email,
    plan: (PLANS as readonly string[]).includes(ctx.org.plan) ? (ctx.org.plan as Plan) : "free",
    modules: ctx.org.modules,
  };
  return (
    <I18nProvider locale={ctx.locale} messages={ctx.t}>
      <div className="min-h-dvh">
        <Sidebar info={info} />
        <MobileNav info={info} />
        <main id="main" className="lg:pl-64">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
    </I18nProvider>
  );
}
