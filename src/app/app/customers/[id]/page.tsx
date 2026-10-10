import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, Mail, Pencil, Phone, Plus } from "lucide-react";
import { getAppContext, hasModule } from "@/lib/auth/context";
import { getCustomer } from "@/lib/services/customers";
import { listActivities } from "@/lib/services/activities";
import { listOpportunities } from "@/lib/services/opportunities";
import { listTasks } from "@/lib/services/tasks";
import { listCustomerAppointments } from "@/lib/services/scheduling/appointments";
import { orNotFound, requireUuid } from "@/lib/page";
import { formatDate, formatDateTime, formatMoney } from "@/lib/domain/format";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { NoteForm } from "@/components/shared/note-form";
import { AppointmentStatusBadge, StageBadge } from "@/components/shared/badges";
import { ArchiveCustomerButton } from "@/components/customers/archive-button";
import { TaskList } from "@/components/tasks/task-list";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const ctx = await getAppContext();
  const { id } = await params;
  const c = await getCustomer(ctx, id).catch(() => null);
  return { title: c?.full_name ?? ctx.t.customers.title };
}

export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const ctx = await getAppContext();
  const { t, locale, org } = ctx;
  const id = requireUuid((await params).id);
  const { created } = await searchParams;
  const customer = await orNotFound(getCustomer(ctx, id));
  const sales = hasModule(org, "sales");
  const scheduling = hasModule(org, "scheduling");

  const [activities, opportunities, tasks, appointments] = await Promise.all([
    listActivities(ctx, { customerId: id, limit: 100 }),
    sales ? listOpportunities(ctx, { customerId: id, stage: "all", sort: "created" }) : Promise.resolve([]),
    listTasks(ctx, { customerId: id, filter: "all" }),
    scheduling ? listCustomerAppointments(ctx, id) : Promise.resolve([]),
  ]);

  return (
    <>
      <nav aria-label="breadcrumb" className="mb-3 text-[13px] text-fg-subtle">
        <Link href="/app/customers" className="hover:text-fg">{t.customers.title}</Link>
        <span aria-hidden> / </span>
        <span className="text-fg-muted">{customer.full_name}</span>
      </nav>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {customer.full_name}
            {customer.archived_at && <Badge>{t.customers.archived}</Badge>}
          </span>
        }
        description={customer.company_name ?? undefined}
        actions={
          <>
            <LinkButton href={`/app/customers/${id}/edit`} variant="outline" size="sm">
              <Pencil className="size-4" aria-hidden /> {t.common.edit}
            </LinkButton>
            <ArchiveCustomerButton id={id} archived={Boolean(customer.archived_at)} />
          </>
        }
      />

      {created && (
        <p role="status" className="mb-5 rounded-lg border border-success/30 bg-success-soft px-4 py-2.5 text-sm text-success">
          {t.customers.createdNotice}
        </p>
      )}
      {customer.archived_at && (
        <p className="mb-5 rounded-lg border border-border-strong bg-surface-2 px-4 py-2.5 text-sm text-fg-muted">{t.customers.archivedNotice}</p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader title={t.customers.contact} />
            <CardBody>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Mail className="size-4 text-fg-subtle" aria-hidden />
                  <dt className="sr-only">{t.customers.fields.email}</dt>
                  <dd>{customer.email ? <a className="hover:text-accent" href={`mailto:${customer.email}`}>{customer.email}</a> : <span className="text-fg-subtle">{t.common.notInformed}</span>}</dd>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="size-4 text-fg-subtle" aria-hidden />
                  <dt className="sr-only">{t.customers.fields.phone}</dt>
                  <dd>{customer.phone ? <a className="hover:text-accent" href={`tel:${customer.phone.replace(/[^\d+]/g, "")}`}>{customer.phone}</a> : <span className="text-fg-subtle">{t.common.notInformed}</span>}</dd>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
                  <div>
                    <dt className="text-xs text-fg-subtle">{t.customers.fields.source}</dt>
                    <dd className="mt-0.5">{customer.source ? t.customers.sources[customer.source as keyof typeof t.customers.sources] : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-fg-subtle">{t.customers.fields.createdAt}</dt>
                    <dd className="mt-0.5">{formatDate(customer.created_at, locale, org.timezone)}</dd>
                  </div>
                </div>
                {customer.notes && (
                  <div className="border-t border-border pt-3">
                    <dt className="text-xs text-fg-subtle">{t.customers.fields.notes}</dt>
                    <dd className="mt-1 whitespace-pre-wrap leading-relaxed text-fg-muted">{customer.notes}</dd>
                  </div>
                )}
              </dl>
            </CardBody>
          </Card>

          {sales && (
            <Card>
              <CardHeader
                title={t.customers.related.opportunities}
                action={
                  <LinkButton href={`/app/opportunities/new?customerId=${id}`} variant="ghost" size="sm">
                    <Plus className="size-4" aria-hidden /> {t.opportunities.new}
                  </LinkButton>
                }
              />
              {opportunities.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-fg-subtle">{t.customers.related.noOpportunities}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {opportunities.map((o) => (
                    <li key={o.id}>
                      <Link href={`/app/opportunities/${o.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{o.title}</span>
                          <span className="text-xs text-fg-subtle">{o.estimated_value !== null ? formatMoney(o.estimated_value, org.currency, locale) : t.opportunities.noValue}</span>
                        </span>
                        <StageBadge stage={o.stage} t={t} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {scheduling && (
            <Card>
              <CardHeader
                title={t.customers.related.appointments}
                action={
                  <LinkButton href={`/app/schedule/appointments/new?customerId=${id}`} variant="ghost" size="sm">
                    <CalendarPlus className="size-4" aria-hidden /> {t.scheduling.newAppointment}
                  </LinkButton>
                }
              />
              {appointments.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-fg-subtle">{t.customers.related.noAppointments}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {appointments.map((a) => (
                    <li key={a.id}>
                      <Link href={`/app/schedule/appointments/${a.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{a.service?.name}</span>
                          <span className="text-xs text-fg-subtle">{formatDateTime(a.starts_at, locale, org.timezone)} · {a.professional?.name}</span>
                        </span>
                        <AppointmentStatusBadge status={a.status} t={t} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <Card>
            <CardHeader
              title={t.customers.related.tasks}
              action={
                <LinkButton href={`/app/tasks/new?customerId=${id}`} variant="ghost" size="sm">
                  <Plus className="size-4" aria-hidden /> {t.tasks.new}
                </LinkButton>
              }
            />
            <TaskList tasks={tasks} t={t} locale={locale} timeZone={org.timezone} emptyLabel={t.customers.related.noTasks} compact />
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardBody>
              <NoteForm
                customerId={id}
                label={t.customers.notes.title}
                placeholder={t.customers.notes.placeholder}
                submitLabel={t.customers.notes.submit}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t.customers.timeline.title} />
            <CardBody>
              <ActivityTimeline
                items={activities}
                t={t}
                locale={locale}
                timeZone={org.timezone}
                currentUserId={ctx.user.id}
                showSubject={false}
                emptyLabel={t.customers.timeline.empty}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
