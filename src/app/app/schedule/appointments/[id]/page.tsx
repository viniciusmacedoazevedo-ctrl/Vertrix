import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Pencil } from "lucide-react";
import { getAppContext } from "@/lib/auth/context";
import { getAppointment } from "@/lib/services/scheduling/appointments";
import { listActivities } from "@/lib/services/activities";
import { orNotFound, requireUuid } from "@/lib/page";
import { isEditable } from "@/lib/domain/appointments";
import { formatDateTime, formatMoney } from "@/lib/domain/format";
import { format } from "@/lib/i18n/config";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { AppointmentStatusBadge } from "@/components/shared/badges";
import { AppointmentStatusActions } from "@/components/schedule/status-actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAppContext();
  return { title: t.scheduling.appointment.title };
}

export default async function AppointmentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; updated?: string }> }) {
  const ctx = await getAppContext();
  const { t, locale, org } = ctx;
  const id = requireUuid((await params).id);
  const sp = await searchParams;
  const a = await orNotFound(getAppointment(ctx, id));
  const history = (await listActivities(ctx, { customerId: a.customer_id, limit: 100 })).filter((x) => x.appointment_id === id);
  const l = t.scheduling.appointment;
  const minutes = Math.round((new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) / 60000);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <nav aria-label="breadcrumb" className="text-[13px] text-fg-subtle">
        <Link href="/app/schedule" className="hover:text-fg">{t.scheduling.title}</Link>
        <span aria-hidden> / </span>
        <span className="text-fg-muted">{l.title}</span>
      </nav>
      <PageHeader
        title={<span className="flex flex-wrap items-center gap-2">{a.service?.name} <AppointmentStatusBadge status={a.status} t={t} /></span>}
        description={formatDateTime(a.starts_at, locale, org.timezone)}
        actions={
          isEditable(a.status) ? (
            <LinkButton href={`/app/schedule/appointments/${id}/edit`} variant="outline" size="sm">
              <Pencil className="size-4" aria-hidden /> {l.edit}
            </LinkButton>
          ) : undefined
        }
      />
      {(sp.created || sp.updated) && (
        <p role="status" className="rounded-lg border border-success/30 bg-success-soft px-4 py-2.5 text-sm text-success">
          {sp.created ? l.createdNotice : l.updatedNotice}
        </p>
      )}
      <Card>
        <CardBody>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-fg-subtle">{l.customer}</dt>
              <dd className="mt-0.5">
                {a.customer ? <Link href={`/app/customers/${a.customer.id}`} className="font-medium hover:text-accent">{a.customer.full_name}</Link> : "—"}
                {a.customer?.phone && <span className="block text-xs text-fg-subtle">{a.customer.phone}</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-fg-subtle">{l.professional}</dt>
              <dd className="mt-0.5">{a.professional?.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-subtle">{l.duration}</dt>
              <dd className="mt-0.5">{format(l.minutes, { count: minutes })}</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-subtle">{l.price}</dt>
              <dd className="mt-0.5 tabular-nums">{a.price !== null ? formatMoney(a.price, org.currency, locale) : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-fg-subtle">{l.source}</dt>
              <dd className="mt-0.5">{l.sources[a.source as "internal"] ?? a.source}</dd>
            </div>
            {a.status === "cancelled" && a.cancellation_reason && (
              <div>
                <dt className="text-xs text-fg-subtle">{t.scheduling.cancelReason}</dt>
                <dd className="mt-0.5">{a.cancellation_reason}</dd>
              </div>
            )}
            {a.notes && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-fg-subtle">{l.notes}</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-fg-muted">{a.notes}</dd>
              </div>
            )}
          </dl>
        </CardBody>
        <div className="border-t border-border px-5 py-4">
          <AppointmentStatusActions id={id} status={a.status} />
        </div>
      </Card>
      <p className="text-xs text-fg-subtle">{l.reminders}</p>
      {history.length > 0 && (
        <Card>
          <CardHeader title={t.customers.timeline.title} />
          <ul className="divide-y divide-border">
            {history.map((h) => (
              <li key={h.id} className="flex items-center gap-3 px-5 py-2.5 text-[13px] text-fg-muted">
                <CalendarClock className="size-4 text-fg-subtle" aria-hidden />
                <span className="flex-1">
                  {h.type === "appointment_status_changed"
                    ? format(t.activity.appointment_status_changed, { status: t.scheduling.status[(h.metadata as { to: "scheduled" }).to] ?? "" })
                    : t.activity[h.type as "appointment_created"]}
                </span>
                <time className="text-xs text-fg-subtle">{formatDateTime(h.created_at, locale, org.timezone)}</time>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
