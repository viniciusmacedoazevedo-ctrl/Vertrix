import type { Metadata } from "next";
import { Bot, CalendarDays, CreditCard, Mail, MessageCircle } from "lucide-react";
import { canManage, getAppContext } from "@/lib/auth/context";
import { isAiConfigured, getAiClient } from "@/lib/ai/client";
import { messagesUsedToday } from "@/lib/services/conversations";
import { planLimits, PLANS, type Plan } from "@/lib/plans";
import { todayInTimeZone, zonedDayRange } from "@/lib/domain/datetime";
import { format } from "@/lib/i18n/config";
import { getServerEnv } from "@/lib/env";
import { timeZoneOptions } from "@/lib/regional";
import { param } from "@/lib/page";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { DeleteOrganizationForm, OrganizationSettingsForm, ProfileForm } from "@/components/settings/forms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAppContext();
  return { title: t.settings.title };
}

const TABS = ["organization", "profile", "plan", "integrations", "privacy"] as const;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await getAppContext();
  const { t, org } = ctx;
  const s = t.settings;
  const requested = param((await searchParams).tab);
  const tab = TABS.find((x) => x === requested) ?? "organization";
  const plan: Plan = (PLANS as readonly string[]).includes(org.plan) ? (org.plan as Plan) : "free";

  return (
    <>
      <PageHeader title={s.title} description={s.subtitle} />
      <FilterTabs
        className="mb-5"
        label={s.title}
        items={TABS.map((x) => ({ href: x === "organization" ? "/app/settings" : `/app/settings?tab=${x}`, label: s.tabs[x], active: x === tab }))}
      />
      <div className="max-w-3xl">
        {tab === "organization" && (
          <Card>
            <CardHeader title={s.organization.title} description={`${s.organization.publicLink}: ${getServerEnv().siteUrl}/book/${org.slug}`} />
            <CardBody className="p-5 sm:p-6">
              <OrganizationSettingsForm
                readOnly={!canManage(ctx)}
                timeZones={timeZoneOptions()}
                staleDays={org.followup_stale_days}
                defaults={{
                  name: org.name,
                  segment: org.segment,
                  country: org.country === "ZZ" ? "OTHER" : org.country,
                  locale: org.locale,
                  currency: org.currency,
                  timezone: org.timezone,
                  modules: org.modules,
                }}
              />
            </CardBody>
          </Card>
        )}

        {tab === "profile" && (
          <Card>
            <CardHeader title={s.profile.title} />
            <CardBody className="p-5 sm:p-6">
              <ProfileForm
                email={ctx.user.email}
                role={s.profile.roles[ctx.role]}
                defaults={{
                  fullName: ctx.profile?.full_name ?? "",
                  locale: ctx.profile?.locale ?? ctx.locale,
                  emailDigest: Boolean((ctx.profile?.preferences as { emailDigest?: boolean } | null)?.emailDigest),
                }}
              />
            </CardBody>
          </Card>
        )}

        {tab === "plan" && <PlanTab ctx={ctx} plan={plan} />}

        {tab === "integrations" && (
          <Card>
            <CardHeader title={s.integrations.title} description={s.integrations.body} />
            <ul className="divide-y divide-border">
              {[
                { key: "ai", icon: Bot, status: isAiConfigured() ? "configured" : "not_configured" },
                { key: "email", icon: Mail, status: "planned" },
                { key: "whatsapp", icon: MessageCircle, status: "planned" },
                { key: "calendar", icon: CalendarDays, status: "planned" },
                { key: "payments", icon: CreditCard, status: "planned" },
              ].map((i) => {
                const item = s.integrations.items[i.key as keyof typeof s.integrations.items];
                return (
                  <li key={i.key} className="flex items-center gap-4 px-5 py-4">
                    <i.icon className="size-5 shrink-0 text-fg-subtle" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-fg-subtle">{item.body}</p>
                    </div>
                    <Badge tone={i.status === "configured" ? "success" : i.status === "planned" ? "neutral" : "warning"}>
                      {i.status === "configured" ? s.integrations.statusConfigured : i.status === "planned" ? s.integrations.statusPlanned : s.integrations.statusNotConfigured}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {tab === "privacy" && (
          <div className="space-y-5">
            <Card>
              <CardHeader title={s.privacy.title} />
              <CardBody className="space-y-3 text-sm leading-relaxed text-fg-muted">
                <p>{s.privacy.body}</p>
                <p>{s.privacy.retention}</p>
                <p className="text-fg-subtle">{s.privacy.accountDeletion}</p>
              </CardBody>
            </Card>
            <Card className="border-danger/30">
              <CardHeader title={<span className="text-danger">{s.privacy.deleteTitle}</span>} description={s.privacy.deleteBody} />
              <CardBody>
                {ctx.role === "owner" ? <DeleteOrganizationForm orgName={org.name} /> : <p className="text-sm text-fg-subtle">{s.privacy.ownerOnly}</p>}
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

async function PlanTab({ ctx, plan }: { ctx: Awaited<ReturnType<typeof getAppContext>>; plan: Plan }) {
  const { t, org } = ctx;
  const s = t.settings.plan;
  const limits = planLimits(plan);
  const ai = getAiClient();
  const aiLimit = ai ? Math.min(limits.aiMessagesPerDay, ai.dailyLimit) : limits.aiMessagesPerDay;
  const used = ai ? await messagesUsedToday(ctx, zonedDayRange(todayInTimeZone(org.timezone), org.timezone).start) : 0;
  return (
    <Card>
      <CardHeader title={s.title} />
      <CardBody className="space-y-5">
        <p className="text-sm">{format(s.current, { plan: t.options.plans[plan] })}</p>
        <p className="rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-[13px] text-fg-muted">{s.billingNotice}</p>
        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-3">
            <dt className="text-xs text-fg-subtle">{s.aiMessages}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{aiLimit}</dd>
          </div>
          <div className="rounded-lg border border-border p-3">
            <dt className="text-xs text-fg-subtle">{s.usageToday}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{used}</dd>
          </div>
          <div className="rounded-lg border border-border p-3">
            <dt className="text-xs text-fg-subtle">{s.members}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{limits.members}</dd>
          </div>
        </dl>
      </CardBody>
    </Card>
  );
}
