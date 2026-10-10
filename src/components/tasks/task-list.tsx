import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "@/components/shared/badges";
import type { TaskListItem } from "@/lib/services/tasks";
import type { Messages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/config";
import { formatDateTime, formatTime } from "@/lib/domain/format";
import { localDateOf, todayInTimeZone } from "@/lib/domain/datetime";
import { cn } from "@/lib/cn";
import { TaskToggle } from "./task-toggle";

export function DueLabel({ dueAt, done, t, locale, timeZone }: { dueAt: string | null; done: boolean; t: Messages; locale: Locale; timeZone: string }) {
  if (!dueAt) return <span className="text-xs text-fg-subtle">{t.tasks.noDue}</span>;
  const now = new Date();
  const overdue = !done && new Date(dueAt) < now;
  const today = localDateOf(dueAt, timeZone) === todayInTimeZone(timeZone, now);
  if (overdue) return <Badge tone="danger">{t.tasks.overdue} · {formatDateTime(dueAt, locale, timeZone)}</Badge>;
  if (today && !done) return <Badge tone="warning">{t.tasks.dueToday} · {formatTime(dueAt, locale, timeZone)}</Badge>;
  return <span className="text-xs text-fg-subtle">{formatDateTime(dueAt, locale, timeZone)}</span>;
}

export function TaskList({
  tasks,
  t,
  locale,
  timeZone,
  emptyLabel,
  compact = false,
}: {
  tasks: TaskListItem[];
  t: Messages;
  locale: Locale;
  timeZone: string;
  emptyLabel: string;
  compact?: boolean;
}) {
  if (tasks.length === 0) return <p className="px-5 py-6 text-center text-sm text-fg-subtle">{emptyLabel}</p>;
  return (
    <ul className="divide-y divide-border">
      {tasks.map((task) => {
        const done = task.status === "done";
        return (
          <li key={task.id} className="flex items-start gap-3 px-5 py-3">
            <div className="pt-0.5">
              <TaskToggle id={task.id} done={done} title={task.title} />
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/app/tasks/${task.id}/edit`}
                className={cn("text-sm font-medium hover:text-accent", done && "text-fg-subtle line-through")}
              >
                {task.title}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <DueLabel dueAt={task.due_at} done={done} t={t} locale={locale} timeZone={timeZone} />
                {!compact && task.customer && (
                  <Link href={`/app/customers/${task.customer.id}`} className="text-xs text-fg-muted hover:text-accent">
                    {task.customer.full_name}
                  </Link>
                )}
                {!compact && task.opportunity && (
                  <Link href={`/app/opportunities/${task.opportunity.id}`} className="text-xs text-fg-muted hover:text-accent">
                    {task.opportunity.title}
                  </Link>
                )}
              </div>
            </div>
            {task.priority !== "medium" && <PriorityBadge priority={task.priority} t={t} />}
          </li>
        );
      })}
    </ul>
  );
}
