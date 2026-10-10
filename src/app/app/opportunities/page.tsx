import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Plus, Target } from "lucide-react";
import { getAppContext, hasModule } from "@/lib/auth/context";
import { listOpportunities, OPPORTUNITY_SORTS, type OpportunityFilters } from "@/lib/services/opportunities";
import { ALL_STAGES, OPEN_STAGES, type OpportunityStage } from "@/lib/domain/followup";
import { PRIORITIES } from "@/lib/validation/schemas";
import { formatCalendarDate, formatMoney, formatRelativeTime } from "@/lib/domain/format";
import { format } from "@/lib/i18n/config";
import { param } from "@/lib/page";
import { PageHeader } from "@/components/ui/page-header";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterTabs, withParams } from "@/components/ui/filter-tabs";
import { inputClasses } from "@/components/ui/form";
import { PriorityBadge, StageBadge } from "@/components/shared/badges";
import { FollowUpBadge } from "@/components/opportunities/follow-up-badge";
import { StageSelect } from "@/components/opportunities/stage-select";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAppContext();
  return { title: t.opportunities.title };
}

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await getAppContext();
  const { t, locale, org } = ctx;
  if (!hasModule(org, "sales")) notFound();
  const sp = await searchParams;

  const view = param(sp.view) === "board" ? "board" : "list";
  const stageParam = param(sp.stage);
  const stage: OpportunityFilters["stage"] =
    stageParam === "all" ? "all" : (ALL_STAGES.find((s) => s === stageParam) as OpportunityStage | undefined) ?? "open";
  const followUp = param(sp.followup) === "1";
  const priority = PRIORITIES.find((p) => p === param(sp.priority));
  const sort = OPPORTUNITY_SORTS.find((s) => s === param(sp.sort)) ?? "follow_up";

  const [items, total] = await Promise.all([
    listOpportunities(ctx, { stage: view === "board" ? "all" : stage, followUp, priority, sort }),
    ctx.supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("organization_id", org.id),
  ]);
  const current = {
    view: view === "board" ? "board" : undefined,
    stage: stage !== "open" ? stage : undefined,
    followup: followUp ? "1" : undefined,
    priority,
    sort: sort !== "follow_up" ? sort : undefined,
  };
  const openTotal = items.filter((o) => (OPEN_STAGES as readonly string[]).includes(o.stage)).reduce((s, o) => s + (o.estimated_value ?? 0), 0);

  return (
    <>
      <PageHeader
        title={t.opportunities.title}
        description={t.opportunities.subtitle}
        actions={
          <LinkButton href="/app/opportunities/new">
            <Plus className="size-4" aria-hidden /> {t.opportunities.new}
          </LinkButton>
        }
      />

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <FilterTabs
            label={t.opportunities.filters.stage}
            items={[
              { href: withParams("/app/opportunities", current, { view: undefined }), label: t.opportunities.view.list, active: view === "list" },
              { href: withParams("/app/opportunities", current, { view: "board" }), label: t.opportunities.view.board, active: view === "board" },
            ]}
          />
          <FilterTabs
            label={t.opportunities.filters.needsFollowUp}
            items={[
              { href: withParams("/app/opportunities", current, { followup: undefined }), label: t.opportunities.filters.allOpen, active: !followUp },
              { href: withParams("/app/opportunities", current, { followup: "1" }), label: t.opportunities.filters.needsFollowUp, active: followUp },
            ]}
          />
        </div>
        {view === "list" && (
          <form className="flex flex-col gap-2 sm:flex-row" action="/app/opportunities">
            {followUp && <input type="hidden" name="followup" value="1" />}
            <select name="stage" defaultValue={stage} aria-label={t.opportunities.filters.stage} className={`${inputClasses()} sm:w-44`}>
              <option value="open">{t.opportunities.filters.allOpen}</option>
              <option value="all">{t.opportunities.filters.allStages}</option>
              {ALL_STAGES.map((s) => <option key={s} value={s}>{t.opportunities.stages[s]}</option>)}
            </select>
            <select name="priority" defaultValue={priority ?? ""} aria-label={t.opportunities.filters.priority} className={`${inputClasses()} sm:w-36`}>
              <option value="">{t.opportunities.filters.priority}</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{t.common.priority[p]}</option>)}
            </select>
            <select name="sort" defaultValue={sort} aria-label={t.opportunities.filters.sort} className={`${inputClasses()} sm:w-56`}>
              {OPPORTUNITY_SORTS.map((s) => <option key={s} value={s}>{t.opportunities.sort[s]}</option>)}
            </select>
            <Button type="submit" variant="secondary">{t.common.filter}</Button>
          </form>
        )}
      </div>

      {followUp && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-warning/25 bg-warning-soft px-4 py-2.5 text-[13px] text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {format(t.opportunities.followUp.rule, { days: org.followup_stale_days })}
        </p>
      )}

      {(total.count ?? 0) === 0 ? (
        <Card>
          <EmptyState
            icon={Target}
            title={t.opportunities.empty.title}
            description={t.opportunities.empty.body}
            action={<LinkButton href="/app/opportunities/new"><Plus className="size-4" aria-hidden /> {t.opportunities.new}</LinkButton>}
          />
        </Card>
      ) : view === "board" ? (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          <div className="grid min-w-[1100px] grid-cols-6 gap-3">
            {ALL_STAGES.map((s) => {
              const column = items.filter((o) => o.stage === s);
              const value = column.reduce((sum, o) => sum + (o.estimated_value ?? 0), 0);
              return (
                <section key={s} aria-label={t.opportunities.stages[s]} className="flex min-h-40 flex-col rounded-xl border border-border bg-surface">
                  <header className="border-b border-border px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <StageBadge stage={s} t={t} />
                      <span className="text-xs tabular-nums text-fg-subtle">{column.length}</span>
                    </div>
                    <p className="mt-1.5 text-xs tabular-nums text-fg-subtle">{formatMoney(value, org.currency, locale)}</p>
                  </header>
                  <ul className="flex-1 space-y-2 p-2">
                    {column.map((o) => (
                      <li key={o.id} className="rounded-lg border border-border bg-surface-2 p-3">
                        <Link href={`/app/opportunities/${o.id}`} className="block text-[13px] font-medium hover:text-accent">{o.title}</Link>
                        <p className="mt-0.5 truncate text-xs text-fg-subtle">{o.customer?.full_name}</p>
                        {o.estimated_value !== null && <p className="mt-2 text-xs tabular-nums text-fg-muted">{formatMoney(o.estimated_value, org.currency, locale)}</p>}
                        <div className="mt-2"><FollowUpBadge opportunity={o} staleDays={org.followup_stale_days} timeZone={org.timezone} t={t} /></div>
                        <StageSelect id={o.id} stage={o.stage} className="mt-2" />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <Card>
          {items.length === 0 ? (
            <EmptyState
              icon={Target}
              title={t.opportunities.emptyFilter.title}
              description={t.opportunities.emptyFilter.body}
              compact
              action={<LinkButton href="/app/opportunities" variant="outline" size="sm">{t.common.clearFilters}</LinkButton>}
            />
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-border px-5 py-3 text-[13px] text-fg-subtle">
                <span>{items.length}</span>
                <span>{t.opportunities.total}: <span className="font-medium tabular-nums text-fg">{formatMoney(openTotal, org.currency, locale)}</span></span>
              </div>
              <ul className="divide-y divide-border">
                {items.map((o) => (
                  <li key={o.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] md:items-center">
                    <div className="min-w-0">
                      <Link href={`/app/opportunities/${o.id}`} className="font-medium hover:text-accent">{o.title}</Link>
                      <p className="truncate text-xs text-fg-subtle">
                        {o.customer?.full_name}
                        {o.next_action && <> · {o.next_action}</>}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StageBadge stage={o.stage} t={t} />
                      {o.priority === "high" && <PriorityBadge priority={o.priority} t={t} />}
                    </div>
                    <div className="text-xs text-fg-subtle">
                      <p>{t.opportunities.fields.lastInteraction}: {formatRelativeTime(o.last_interaction_at, locale)}</p>
                      {o.follow_up_on && <p>{t.opportunities.fields.followUpOn}: {formatCalendarDate(o.follow_up_on, locale)}</p>}
                      <div className="mt-1"><FollowUpBadge opportunity={o} staleDays={org.followup_stale_days} timeZone={org.timezone} t={t} /></div>
                    </div>
                    <p className="text-sm font-medium tabular-nums md:text-right">
                      {o.estimated_value !== null ? formatMoney(o.estimated_value, org.currency, locale) : <span className="text-fg-subtle">—</span>}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      )}
    </>
  );
}
