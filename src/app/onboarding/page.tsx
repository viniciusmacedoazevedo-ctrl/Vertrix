import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { getSessionUser } from "@/lib/auth/context";
import { getI18n } from "@/lib/i18n/server";
import { COUNTRY_DEFAULTS, timeZoneOptions } from "@/lib/regional";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.onboarding.title };
}

export default async function OnboardingPage() {
  const [{ t, locale }, { supabase, user }] = await Promise.all([getI18n(), getSessionUser()]);
  if (!user) redirect("/login?next=/onboarding");

  const { count } = await supabase
    .from("organization_members")
    .select("organization_id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) > 0) redirect("/app");

  const country = locale === "pt-BR" ? "BR" : "CA";
  const d = COUNTRY_DEFAULTS[country]!;
  return (
    <div className="relative min-h-dvh">
      <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />
      <main id="main" className="relative mx-auto max-w-2xl px-4 py-10 sm:py-16">
        <Logo />
        <div className="mt-10 animate-rise rounded-2xl border border-border-strong bg-surface p-6 sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t.onboarding.title}</h1>
          <p className="mt-1.5 text-sm text-fg-muted">{t.onboarding.subtitle}</p>
          <div className="mt-8">
            <OnboardingForm
              timeZones={timeZoneOptions()}
              defaults={{ name: "", segment: "professional_services", country, locale, currency: d.currency, timezone: d.timezone, modules: ["sales"] }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
