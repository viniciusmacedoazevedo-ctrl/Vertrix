import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle, Bot, CalendarDays, CalendarPlus, CalendarX2, CheckSquare, Circle, CheckCircle2, Plus, Target, UserPlus, Users,
} from "lucide-react";
import { getAppContext } from "@/lib/auth/context";
import { getDashboard } from "@/lib/services/dashboard";
import { format } from "@/lib/i18n/config";
import { formatCalendarDate, formatMoney, formatNumber, formatTime } from "@/lib/domain/format";
import { localMinutesOf } from "@/lib/domain/datetime";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { AppointmentStatusBadge, StageBadge } from "@/components/shared/badges";
import { FollowUpBadge } from "@/components/opportunities/follow-up-badge";
import { TaskList } from "@/components/tasks/task-list";
import { WeeklyBars } from "@/components/charts/weekly-bars";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAppContext();
  return { title: t.nav.dashboard };
}

export default async function DashboardPage() {
  const ctx = await getAppContext();
  const { t, locale, org } = ctx;
  const data = await getDashboard(ctx);
  const minutes = localMinutesOf(new Date(), org.timezone);
  const greetingKey = minutes < 12 * 60 ? "morning" : minutes < 18 * 60 ? "afternoon" : "evening";
  const firstName = (ctx.profile?.full_name ?? "").split(" ")[0] || ctx.user.email.split("@")[0]!;
  const d = t.dashboard;

  const quick = [
    { href: "/app/customers/new", label: d.quick.newCustomer, icon: UserPlus, show: true },
    { href: "/app/opportunities/new", label: d.quick.newOpportunity, icon: Target, show: Boolean(data.sales) },
    { href: "/app/tasks/new", label: d.quick.newTask, icon: CheckSquare, show: true },
    { href: "/app/schedule/appointments/new", label: d.quick.newAppointment, icon: CalendarPlus, show: Boolean(data.scheduling?.ready) },
    { href: "/app/assistant", label: d.quick.askAssistant, icon: Bot, show: true },
  ].filter((q) => q.show);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{format(d.greeting[greetingKey], { name: firstName })}</h1>
          <p className="mt-1 text-sm text-fg-muted">{d.subtitle}</p>
        </div>
        <nav aria-label={d.quick.title} className="flex flex-wrap gap-2">
          {quick.map((q) => (
            <LinkButton key={q.href} href={q.href} variant="outline" size="sm">
              <q.icon className="size-4 text-accent" aria-hidden /> {q.label}
            </LinkButton>
          ))}
        </nav>
      </header>

      {data.isEmpty && (
        <Card className="relative overflow-hidden border-accent/30">
          <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-accent/15 blur-3xl" aria-hidden />
          <CardBody className="relative p-6">
            <h2 className="text-lg font-semibold">{d.welcome.title}</h2>
            <p className="mt-1 max-w-2xl text-sm text-fg-muted">{d.welcome.body}</p>
            <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { href: "/app/customers/new", label: d.welcome.stepCustomer, show: true },
                { href: "/app/opportunities/new", label: d.welcome.stepOpportunity, show: Boolean(data.sales) },
                { href: "/app/schedule/services", label: d.welcome.stepService, show: Boolean(data.scheduling) },
                { href: "/app/schedule/booking", label: d.welcome.stepBooking, show: Boolean(data.scheduling) },
              ]
                .filter((s) => s.show)
                .map((s, i) => (
                  <li key={s.href}>
                    <Link href={s.href} className="flex items-center gap-3 rounded-lg border border-border-strong bg-surface-2 px-3 py-3 text-sm transition-colors hover:border-accent/50">
                      <span className="grid size-6 place-items-center rounded-full bg-accent-soft font-mono text-xs text-accent">{i + 1}</span>
                      {s.label}
                    </Link>
                  </li>
                ))}
            </ol>
          </CardBody>
        </Card>
      )}

      <section aria-label={t.nav.dashboard} className={`grid grid-cols-2 gap-3 ${data.sales && data.scheduling ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
        <Stat label={d.stats.customers} value={formatNumber(data.customerCount, locale)} icon={Users} href="/app/customers" />
        {data.sales && (
          <>
            <Stat
              label={d.stats.openOpportunities}
              value={formatNumber(data.sales.openCount, locale)}
              hint={format(d.stats.openValue, { value: formatMoney(data.sales.openValue, org.currency, locale) })}
              icon={Target}
              href="/app/opportunities"
            />
            <Stat
              label={d.stats.needsFollowUp}
              value={formatNumber(data.sales.followUpCount, locale)}
              hint={format(d.stats.needsFollowUpHint, { days: org.followup_stale_days })}
              icon={AlertTriangle}
              tone={data.sales.followUpCount > 0 ? "warning" : "default"}
              href="/app/opportunities?followup=1"
            />
            <Stat
              label={d.stats.pendingTasks}
              value={formatNumber(data.sales.pendingTasks, locale)}
              hint={format(d.stats.overdue, { count: data.sales.overdueTasks })}
              icon={CheckSquare}
              href="/app/tasks"
            />
          </>
        )}
        {data.scheduling && (
          <>
            <Stat
              label={d.stats.appointmentsToday}
              value={formatNumber(data.scheduling.today.length, locale)}
              hint={format(d.stats.appointmentsWeek, { count: data.scheduling.weekCount })}
              icon={CalendarDays}
              href="/app/schedule"
            />
            {!data.sales && (
              <Stat label={d.stats.cancellations} value={formatNumber(data.scheduling.cancellations30d, locale)} icon={CalendarX2} href="/app/reports" />
            )}
          </>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          {data.scheduling && (
            <Card>
              <CardHeader
                title={d.todayAppointments.title}
                action={<LinkButton href="/app/schedule" variant="ghost" size="sm">{t.common.viewAll}</LinkButton>}
              />
              {data.scheduling.today.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-fg-subtle">{d.todayAppointments.empty}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.scheduling.today.map((a) => (
                    <li key={a.id}>
                      <Link href={`/app/schedule/appointments/${a.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-2">
                        <span className="w-14 shrink-0 font-mono text-sm tabular-nums text-fg">{formatTime(a.starts_at, locale, org.timezone)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{a.customer?.full_name}</span>
                          <span className="block truncate text-xs text-fg-subtle">{a.service?.name} · {a.professional?.name}</span>
                        </span>
                        <AppointmentStatusBadge status={a.status} t={t} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {data.sales && (
            <Card>
              <CardHeader
                title={d.followUps.title}
                action={<LinkButton href="/app/opportunities?followup=1" variant="ghost" size="sm">{t.common.viewAll}</LinkButton>}
              />
              {data.sales.followUps.length === 0 ? (
                <p className="flex items-center justify-center gap-2 px-5 py-8 text-sm text-fg-subtle">
                  <CheckCircle2 className="size-4 text-success" aria-hidden /> {d.followUps.empty}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.sales.followUps.map((o) => (
                    <li key={o.id}>
                      <Link href={`/app/opportunities/${o.id}`} className="flex flex-col gap-2 px-5 py-3 hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{o.title}</span>
                          <span className="block truncate text-xs text-fg-subtle">
                            {o.customer?.full_name}
                            {o.next_action ? ` · ${o.next_action}` : ""}
                            {o.follow_up_on ? ` · ${formatCalendarDate(o.follow_up_on, locale)}` : ""}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <FollowUpBadge opportunity={o} staleDays={org.followup_stale_days} timeZone={org.timezone} t={t} />
                          <StageBadge stage={o.stage} t={t} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {data.sales && (
            <Card>
              <CardHeader title={d.chart.title} description={d.chart.subtitle} />
              <CardBody>
                {data.sales.chart ? (
                  <WeeklyBars
                    caption={d.chart.subtitle}
                    seriesA={d.chart.created}
                    seriesB={d.chart.won}
                    points={data.sales.chart.map((w) => ({
                      label: formatCalendarDate(w.week, locale, { day: "2-digit", month: "2-digit", dateStyle: undefined }),
                      a: w.created,
                      b: w.won,
                    }))}
                  />
                ) : (
                  <p className="py-6 text-center text-sm text-fg-subtle">{d.chart.insufficient}</p>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title={d.upcomingTasks.title}
              action={
                <LinkButton href="/app/tasks/new" variant="ghost" size="sm">
                  <Plus className="size-4" aria-hidden /> {t.tasks.new}
                </LinkButton>
              }
            />
            <TaskList tasks={data.upcomingTasks} t={t} locale={locale} timeZone={org.timezone} emptyLabel={d.upcomingTasks.empty} />
          </Card>
          <Card>
            <CardHeader title={d.recentActivity.title} />
            <CardBody>
              {data.activity.length === 0 ? (
                <p className="flex items-center justify-center gap-2 py-6 text-sm text-fg-subtle">
                  <Circle className="size-3" aria-hidden /> {d.recentActivity.empty}
                </p>
              ) : (
                <ActivityTimeline items={data.activity} t={t} locale={locale} timeZone={org.timezone} currentUserId={ctx.user.id} emptyLabel="" />
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
