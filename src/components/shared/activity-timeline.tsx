import Link from "next/link";
import {
  Archive, ArchiveRestore, CalendarClock, CalendarPlus, CheckCircle2, CircleDot, MessageSquareText, PencilLine, RotateCcw, Target, UserPlus,
  type LucideIcon,
} from "lucide-react";
import type { ActivityItem } from "@/lib/services/activities";
import type { Messages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/config";
import { format } from "@/lib/i18n/config";
import { formatDateTime, formatRelativeTime } from "@/lib/domain/format";

const icons: Record<string, LucideIcon> = {
  note: MessageSquareText,
  customer_created: UserPlus,
  customer_updated: PencilLine,
  customer_archived: Archive,
  customer_restored: ArchiveRestore,
  opportunity_created: Target,
  opportunity_stage_changed: Target,
  task_created: CircleDot,
  task_completed: CheckCircle2,
  task_reopened: RotateCcw,
  appointment_created: CalendarPlus,
  appointment_status_changed: CalendarClock,
  appointment_rescheduled: CalendarClock,
};

export function describeActivity(item: ActivityItem, t: Messages): string {
  const meta = (item.metadata ?? {}) as Record<string, string>;
  switch (item.type) {
    case "opportunity_stage_changed":
      return format(t.activity.opportunity_stage_changed, {
        stage: t.opportunities.stages[meta.to as keyof Messages["opportunities"]["stages"]] ?? meta.to ?? "",
      });
    case "appointment_status_changed":
      return format(t.activity.appointment_status_changed, {
        status: t.scheduling.status[meta.to as keyof Messages["scheduling"]["status"]] ?? meta.to ?? "",
      });
    default:
      return t.activity[item.type as keyof Messages["activity"]] ?? item.type;
  }
}

export function ActivityTimeline({
  items,
  t,
  locale,
  timeZone,
  currentUserId,
  showSubject = true,
  emptyLabel,
}: {
  items: ActivityItem[];
  t: Messages;
  locale: Locale;
  timeZone: string;
  currentUserId: string;
  showSubject?: boolean;
  emptyLabel: string;
}) {
  if (items.length === 0) return <p className="py-6 text-center text-sm text-fg-subtle">{emptyLabel}</p>;
  const now = new Date();
  return (
    <ol className="relative space-y-4">
      {items.map((item, i) => {
        const Icon = icons[item.type] ?? CircleDot;
        const meta = (item.metadata ?? {}) as Record<string, string>;
        const actor =
          item.actor_id === currentUserId
            ? t.activity.you
            : item.actor_name || (meta.source === "public_booking" ? t.activity.publicBooking : t.activity.someone);
        const subject =
          item.opportunity && item.type.startsWith("opportunity")
            ? { href: `/app/opportunities/${item.opportunity.id}`, label: item.opportunity.title }
            : item.customer && showSubject
              ? { href: `/app/customers/${item.customer.id}`, label: item.customer.full_name }
              : null;
        return (
          <li key={item.id} className="relative flex gap-3">
            {i < items.length - 1 && <span className="absolute left-[13px] top-7 h-[calc(100%-4px)] w-px bg-border" aria-hidden />}
            <span className="relative grid size-7 shrink-0 place-items-center rounded-full border border-border-strong bg-surface-2">
              <Icon className="size-3.5 text-fg-muted" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13px] leading-snug text-fg-muted">
                <span className="font-medium text-fg">{actor}</span> {describeActivity(item, t)}
                {subject && (
                  <>
                    {" "}
                    <Link href={subject.href} className="font-medium text-fg hover:text-accent">
                      {subject.label}
                    </Link>
                  </>
                )}
                {item.type === "task_created" || item.type === "task_completed" || item.type === "task_reopened" ? (
                  item.body ? <span className="text-fg"> “{item.body}”</span> : null
                ) : null}
              </p>
              {item.type === "note" && item.body && (
                <p className="mt-1.5 whitespace-pre-wrap rounded-lg border border-border bg-surface-2 px-3 py-2 text-[13px] leading-relaxed text-fg">
                  {item.body}
                </p>
              )}
              <time dateTime={item.created_at} title={formatDateTime(item.created_at, locale, timeZone)} className="mt-1 block text-xs text-fg-subtle">
                {formatRelativeTime(item.created_at, locale, now)}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
