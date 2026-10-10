import type { Metadata } from "next";
import { CheckSquare, Plus } from "lucide-react";
import { getAppContext } from "@/lib/auth/context";
import { listTasks, TASK_FILTERS, type TaskFilter } from "@/lib/services/tasks";
import { PageHeader } from "@/components/ui/page-header";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { TaskList } from "@/components/tasks/task-list";
import { param } from "@/lib/page";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAppContext();
  return { title: t.tasks.title };
}

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await getAppContext();
  const { t, locale, org } = ctx;
  const requested = param((await searchParams).filter);
  const filter: TaskFilter = TASK_FILTERS.find((f) => f === requested) ?? "open";
  const [tasks, anyTask] = await Promise.all([
    listTasks(ctx, { filter }),
    ctx.supabase.from("tasks").select("id", { count: "exact", head: true }).eq("organization_id", org.id),
  ]);

  return (
    <>
      <PageHeader
        title={t.tasks.title}
        description={t.tasks.subtitle}
        actions={
          <LinkButton href="/app/tasks/new">
            <Plus className="size-4" aria-hidden /> {t.tasks.new}
          </LinkButton>
        }
      />
      <FilterTabs
        className="mb-4"
        label={t.common.filter}
        items={TASK_FILTERS.map((f) => ({ href: f === "open" ? "/app/tasks" : `/app/tasks?filter=${f}`, label: t.tasks.filters[f], active: f === filter }))}
      />
      <Card>
        {tasks.length === 0 ? (
          (anyTask.count ?? 0) === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title={t.tasks.empty.title}
              description={t.tasks.empty.body}
              action={<LinkButton href="/app/tasks/new"><Plus className="size-4" aria-hidden /> {t.tasks.new}</LinkButton>}
            />
          ) : (
            <EmptyState icon={CheckSquare} title={t.tasks.emptyFilter.title} description={t.tasks.emptyFilter.body} compact />
          )
        ) : (
          <TaskList tasks={tasks} t={t} locale={locale} timeZone={org.timezone} emptyLabel="" />
        )}
      </Card>
    </>
  );
}
