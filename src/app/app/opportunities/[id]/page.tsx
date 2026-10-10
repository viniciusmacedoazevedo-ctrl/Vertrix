import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { getAppContext } from "@/lib/auth/context";
import { getOpportunity } from "@/lib/services/opportunities";
import { listActivities } from "@/lib/services/activities";
import { listTasks } from "@/lib/services/tasks";
import { listMembers } from "@/lib/services/members";
import { orNotFound, requireUuid } from "@/lib/page";
import { formatCalendarDate, formatDate, formatMoney, formatRelativeTime } from "@/lib/domain/format";
import { format } from "@/lib/i18n/config";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { NoteForm } from "@/components/shared/note-form";
import { PriorityBadge } from "@/components/shared/badges";
import { FollowUpBadge } from "@/components/opportunities/follow-up-badge";
import { StageSelect } from "@/components/opportunities/stage-select";
import { TaskList } from "@/components/tasks/task-list";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const ctx = await getAppContext();
  const o = await getOpportunity(ctx, (await params).id).catch(() => null);
  return { title: o?.title ?? ctx.t.opportunities.title };
}

export default async function OpportunityPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const ctx = await getAppContext();
  const { t, locale, org } = ctx;
  const id = requireUuid((await params).id);
  const { created } = await searchParams;
  const o = await orNotFound(getOpportunity(ctx, id));
  const [activities, tasks, members] = await Promise.all([
    listActivities(ctx, { opportunityId: id, limit: 100 }),
    listTasks(ctx, { opportunityId: id, filter: "all" }),
    listMembers(ctx),
  ]);
  const owner = members.find((m) => m.id === o.owner_id);
  const f = t.opportunities.fields;

  return (
    <>
      <nav aria-label="breadcrumb" className="mb-3 text-[13px] text-fg-subtle">
        <Link href="/app/opportunities" className="hover:text-fg">{t.opportunities.title}</Link>
        <span aria-hidden> / </span>
        <span className="text-fg-muted">{o.title}</span>
      </nav>
      <PageHeader
        title={o.title}
        description={
          o.customer ? (
            <Link href={`/app/customers/${o.customer.id}`} className="hover:text-accent">
              {o.customer.full_name}{o.customer.company_name ? ` · ${o.customer.company_name}` : ""}
            </Link>
          ) : undefined
        }
        actions={
          <>
            <StageSelect id={id} stage={o.stage} />
            <LinkButton href={`/app/opportunities/${id}/edit`} variant="outline" size="sm">
              <Pencil className="size-4" aria-hidden /> {t.common.edit}
            </LinkButton>
          </>
        }
      />
      {created && (
        <p role="status" className="mb-5 rounded-lg border border-success/30 bg-success-soft px-4 py-2.5 text-sm text-success">{t.opportunities.createdNotice}</p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader title={t.common.details} action={<FollowUpBadge opportunity={o} staleDays={org.followup_stale_days} timeZone={org.timezone} t={t} />} />
            <CardBody>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                <div>
                  <dt className="text-xs text-fg-subtle">{f.estimatedValue}</dt>
                  <dd className="mt-0.5 font-medium tabular-nums">{o.estimated_value !== null ? formatMoney(o.estimated_value, org.currency, locale) : "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-fg-subtle">{f.priority}</dt>
                  <dd className="mt-1"><PriorityBadge priority={o.priority} t={t} /></dd>
                </div>
                <div>
                  <dt className="text-xs text-fg-subtle">{f.lastInteraction}</dt>
                  <dd className="mt-0.5">{formatRelativeTime(o.last_interaction_at, locale)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-fg-subtle">{f.followUpOn}</dt>
                  <dd className="mt-0.5">{o.follow_up_on ? formatCalendarDate(o.follow_up_on, locale) : "—"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-fg-subtle">{f.nextAction}</dt>
                  <dd className="mt-0.5">{o.next_action ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-fg-subtle">{f.owner}</dt>
                  <dd className="mt-0.5">{owner?.name ?? t.opportunities.unassigned}</dd>
                </div>
                <div>
                  <dt className="text-xs text-fg-subtle">{t.common.createdAt}</dt>
                  <dd className="mt-0.5">{formatDate(o.created_at, locale, org.timezone)}</dd>
                </div>
                {o.closed_at && (
                  <div className="col-span-2 text-xs text-fg-subtle">{format(t.opportunities.closedOn, { date: formatDate(o.closed_at, locale, org.timezone) })}</div>
                )}
                {o.notes && (
                  <div className="col-span-2 border-t border-border pt-3">
                    <dt className="text-xs text-fg-subtle">{f.notes}</dt>
                    <dd className="mt-1 whitespace-pre-wrap leading-relaxed text-fg-muted">{o.notes}</dd>
                  </div>
                )}
              </dl>
            </CardBody>
          </Card>
          <Card>
            <CardHeader
              title={t.tasks.title}
              action={
                <LinkButton href={`/app/tasks/new?opportunityId=${id}&customerId=${o.customer_id}`} variant="ghost" size="sm">
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
                opportunityId={id}
                customerId={o.customer_id}
                label={t.opportunities.registerInteraction}
                placeholder={t.opportunities.interactionPlaceholder}
                submitLabel={t.opportunities.registerInteraction}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={t.customers.timeline.title} />
            <CardBody>
              <ActivityTimeline items={activities} t={t} locale={locale} timeZone={org.timezone} currentUserId={ctx.user.id} showSubject={false} emptyLabel={t.customers.timeline.empty} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
