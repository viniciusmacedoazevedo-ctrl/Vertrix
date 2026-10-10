import type { Metadata } from "next";
import { Download } from "lucide-react";
import { getAppContext, hasModule } from "@/lib/auth/context";
import { getReport, REPORT_PERIODS, resolveRange } from "@/lib/services/reports";
import { formatCalendarDate, formatMoney, formatNumber } from "@/lib/domain/format";
import { param } from "@/lib/page";
import { PageHeader } from "@/components/ui/page-header";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { inputClasses } from "@/components/ui/styles";
import { BarList } from "@/components/charts/bar-list";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAppContext();
  return { title: t.reports.title };
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-4">
      <p className="text-[13px] text-fg-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await getAppContext();
  const { t, locale, org } = ctx;
  const sp = await searchParams;
  const range = resolveRange({ period: param(sp.period), from: param(sp.from), to: param(sp.to) }, org.timezone);
  const report = await getReport(ctx, range);
  const r = t.reports;
  const money = (v: number) => formatMoney(v, org.currency, locale);
  const n = (v: number) => formatNumber(v, locale);
  const qs = new URLSearchParams({ period: range.period, from: range.from, to: range.to }).toString();
  const exports = [
    { entity: "customers", label: r.exports.customers, show: true },
    { entity: "opportunities", label: r.exports.opportunities, show: hasModule(org, "sales") },
    { entity: "tasks", label: r.exports.tasks, show: true },
    { entity: "appointments", label: r.exports.appointments, show: hasModule(org, "scheduling") },
  ].filter((e) => e.show);

  return (
    <>
      <PageHeader title={r.title} description={r.subtitle} />
      <Card className="mb-5">
        <CardBody>
          <form action="/app/reports" className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-fg-muted">
              {r.period}
              <select name="period" defaultValue={range.period} className={`${inputClasses()} sm:w-48`}>
                {REPORT_PERIODS.map((p) => <option key={p} value={p}>{r.periods[p]}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-fg-muted">
              {r.from}
              <input type="date" name="from" defaultValue={range.from} className={`${inputClasses()} sm:w-44`} />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-fg-muted">
              {r.to}
              <input type="date" name="to" defaultValue={range.to} className={`${inputClasses()} sm:w-44`} />
            </label>
            <Button type="submit" variant="secondary">{r.apply}</Button>
            <p className="text-xs text-fg-subtle sm:ml-auto">
              {formatCalendarDate(range.from, locale)} – {formatCalendarDate(range.to, locale)}
            </p>
          </form>
        </CardBody>
      </Card>

      <div className="space-y-5">
        {report.sales && (
          <Card>
            <CardHeader title={r.sales.title} />
            <CardBody className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label={r.sales.openValue} value={money(report.sales.openValue)} hint={`${n(report.sales.openCount)} · ${r.sales.openValueHint}`} />
                <Metric label={r.sales.wonValue} value={money(report.sales.wonValue)} hint={`${r.sales.count}: ${n(report.sales.wonCount)}`} />
                <Metric label={r.sales.followUps} value={n(report.sales.followUps)} hint={r.sales.followUpsHint} />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{r.sales.byStage}</h3>
                <p className="mb-4 text-xs text-fg-subtle">{r.sales.byStageHint}</p>
                {report.sales.createdCount === 0 ? (
                  <p className="py-4 text-center text-sm text-fg-subtle">{r.insufficient}</p>
                ) : (
                  <BarList
                    caption={r.sales.byStage}
                    items={report.sales.byStage.map((s) => ({ label: t.opportunities.stages[s.stage], value: s.count, detail: s.value ? money(s.value) : undefined }))}
                  />
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {report.scheduling && (
          <Card>
            <CardHeader title={r.scheduling.title} />
            <CardBody className="space-y-6">
              {report.scheduling.total === 0 ? (
                <p className="py-4 text-center text-sm text-fg-subtle">{r.insufficient}</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                    <Metric label={r.scheduling.total} value={n(report.scheduling.total)} />
                    <Metric label={r.scheduling.completed} value={n(report.scheduling.completed)} />
                    <Metric label={r.scheduling.cancelled} value={n(report.scheduling.cancelled)} hint={`${r.scheduling.cancellationRate}: ${new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(report.scheduling.cancellationRate)}`} />
                    <Metric label={r.scheduling.noShow} value={n(report.scheduling.noShow)} />
                    <Metric label={r.scheduling.revenue} value={money(report.scheduling.revenue)} />
                  </div>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <h3 className="mb-4 text-sm font-semibold">{r.scheduling.byService}</h3>
                      <BarList caption={r.scheduling.byService} items={report.scheduling.byService.map((s) => ({ label: s.name, value: s.total, detail: s.cancelled ? `${s.cancelled} ✕` : undefined }))} />
                    </div>
                    <div>
                      <h3 className="mb-4 text-sm font-semibold">{r.scheduling.byProfessional}</h3>
                      <BarList caption={r.scheduling.byProfessional} items={report.scheduling.byProfessional.map((s) => ({ label: s.name, value: s.total, detail: s.cancelled ? `${s.cancelled} ✕` : undefined }))} />
                    </div>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title={r.tasks.title} />
            <CardBody>
              <div className="grid grid-cols-2 gap-3">
                <Metric label={r.tasks.completed} value={n(report.tasks.completed)} />
                <Metric label={r.tasks.created} value={n(report.tasks.created)} />
                <Metric label={r.tasks.pending} value={n(report.tasks.pending)} />
                <Metric label={r.tasks.overdue} value={n(report.tasks.overdue)} />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={r.customers.title} description={r.customers.hint} />
            <CardBody>
              {report.customers.total === 0 ? (
                <p className="py-4 text-center text-sm text-fg-subtle">{r.insufficient}</p>
              ) : (
                <>
                  <p className="mb-4 text-sm text-fg-muted">{r.customers.total}: <span className="font-semibold tabular-nums text-fg">{n(report.customers.total)}</span></p>
                  <BarList
                    caption={r.customers.title}
                    items={report.customers.series.map((b) => ({
                      label: formatCalendarDate(b.bucket, locale, report.customers.monthly ? { month: "short", year: "numeric", dateStyle: undefined } : { day: "2-digit", month: "short", dateStyle: undefined }),
                      value: b.count,
                    }))}
                  />
                </>
              )}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader title={r.exports.title} description={r.exports.hint} />
          <CardBody className="flex flex-wrap gap-2">
            {exports.map((e) => (
              <LinkButton key={e.entity} href={`/api/export/${e.entity}?${qs}`} variant="outline" size="sm" prefetch={false}>
                <Download className="size-4" aria-hidden /> {e.label}
              </LinkButton>
            ))}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
