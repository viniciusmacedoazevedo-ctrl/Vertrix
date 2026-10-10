import Link from "next/link";
import type { AppointmentItem } from "@/lib/services/scheduling/appointments";
import type { Messages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/config";
import { format } from "@/lib/i18n/config";
import { addDays, isoWeekday, localDateOf, localMinutesOf, minutesToTime, type DateString } from "@/lib/domain/datetime";
import { formatCalendarDate, formatTime } from "@/lib/domain/format";
import { cn } from "@/lib/cn";

const HOUR_PX = 56;

const statusStyles: Record<string, string> = {
  scheduled: "border-l-info bg-info-soft",
  confirmed: "border-l-accent bg-accent-soft",
  completed: "border-l-success bg-success-soft",
  no_show: "border-l-danger bg-danger-soft",
  cancelled: "border-l-fg-subtle bg-surface-3 opacity-60",
};

interface Positioned {
  item: AppointmentItem;
  start: number;
  end: number;
  lane: number;
  lanes: number;
}

/** Assigns side-by-side lanes to overlapping appointments within one column. */
function layout(items: AppointmentItem[], timeZone: string, date: DateString): Positioned[] {
  const rows = items
    .map((item) => {
      const sameStartDay = localDateOf(item.starts_at, timeZone) === date;
      const start = sameStartDay ? localMinutesOf(item.starts_at, timeZone) : 0;
      const endsSameDay = localDateOf(item.ends_at, timeZone) === date;
      const end = endsSameDay ? localMinutesOf(item.ends_at, timeZone) : 1440;
      return { item, start, end: Math.max(end, start + 15), lane: 0, lanes: 1 };
    })
    .sort((a, b) => a.start - b.start || b.end - a.end);
  let cluster: Positioned[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((c) => c.lane + 1));
    for (const c of cluster) c.lanes = lanes;
    cluster = [];
  };
  for (const row of rows) {
    if (row.start >= clusterEnd) {
      flush();
      clusterEnd = -1;
    }
    const used = new Set(cluster.filter((c) => c.end > row.start).map((c) => c.lane));
    let lane = 0;
    while (used.has(lane)) lane++;
    row.lane = lane;
    cluster.push(row);
    clusterEnd = Math.max(clusterEnd, row.end);
  }
  flush();
  return rows;
}

function TimeGutter({ startHour, endHour }: { startHour: number; endHour: number }) {
  return (
    <div className="relative w-14 shrink-0 border-r border-border" style={{ height: (endHour - startHour) * HOUR_PX }} aria-hidden>
      {Array.from({ length: endHour - startHour }, (_, i) => (
        <span key={i} className="absolute right-2 -translate-y-1/2 font-mono text-[10.5px] text-fg-subtle" style={{ top: i * HOUR_PX }}>
          {i === 0 ? "" : minutesToTime((startHour + i) * 60)}
        </span>
      ))}
    </div>
  );
}

function Column({
  items,
  date,
  timeZone,
  startHour,
  endHour,
  t,
  locale,
  showProfessional,
}: {
  items: AppointmentItem[];
  date: DateString;
  timeZone: string;
  startHour: number;
  endHour: number;
  t: Messages;
  locale: Locale;
  showProfessional: boolean;
}) {
  const positioned = layout(items, timeZone, date);
  return (
    <div className="relative flex-1 border-r border-border last:border-r-0" style={{ height: (endHour - startHour) * HOUR_PX }}>
      {Array.from({ length: endHour - startHour }, (_, i) => (
        <div key={i} className="absolute inset-x-0 border-t border-border/70" style={{ top: i * HOUR_PX }} aria-hidden />
      ))}
      {positioned.map(({ item, start, end, lane, lanes }) => {
        const top = ((Math.max(start, startHour * 60) - startHour * 60) / 60) * HOUR_PX;
        const height = Math.max(22, ((Math.min(end, endHour * 60) - Math.max(start, startHour * 60)) / 60) * HOUR_PX - 2);
        return (
          <Link
            key={item.id}
            href={`/app/schedule/appointments/${item.id}`}
            className={cn(
              "absolute overflow-hidden rounded-md border border-border border-l-[3px] px-2 py-1 text-[11.5px] leading-tight transition-[filter] hover:brightness-125",
              statusStyles[item.status],
            )}
            style={{ top, height, left: `calc(${(lane / lanes) * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)` }}
            title={`${formatTime(item.starts_at, locale, timeZone)} · ${item.customer?.full_name} · ${item.service?.name}`}
          >
            <span className="block font-mono text-[10.5px] text-fg-muted">{formatTime(item.starts_at, locale, timeZone)}</span>
            <span className="block truncate font-medium text-fg">{item.customer?.full_name}</span>
            <span className="block truncate text-fg-subtle">
              {item.service?.name}
              {showProfessional && item.professional ? ` · ${item.professional.name}` : ""}
            </span>
            <span className="sr-only">{t.scheduling.status[item.status]}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function hourBounds(items: AppointmentItem[], hours: { start_time: string; end_time: string }[], timeZone: string) {
  let min = 8 * 60;
  let max = 19 * 60;
  for (const h of hours) {
    min = Math.min(min, Number(h.start_time.slice(0, 2)) * 60);
    max = Math.max(max, Number(h.end_time.slice(0, 2)) * 60 + (h.end_time.slice(3, 5) !== "00" ? 60 : 0));
  }
  for (const a of items) {
    min = Math.min(min, localMinutesOf(a.starts_at, timeZone));
    max = Math.max(max, localMinutesOf(a.ends_at, timeZone) || 1440);
  }
  return { startHour: Math.max(0, Math.floor(min / 60)), endHour: Math.min(24, Math.ceil(max / 60)) };
}

export function WeekView({
  days,
  items,
  timeZone,
  t,
  locale,
  today,
  bounds,
}: {
  days: DateString[];
  items: AppointmentItem[];
  timeZone: string;
  t: Messages;
  locale: Locale;
  today: DateString;
  bounds: { startHour: number; endHour: number };
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="sticky top-0 z-10 flex border-b border-border bg-surface">
          <div className="w-14 shrink-0 border-r border-border" />
          {days.map((d) => (
            <Link
              key={d}
              href={`/app/schedule?view=day&date=${d}`}
              className={cn("flex-1 border-r border-border px-2 py-2 text-center last:border-r-0 hover:bg-surface-2", d === today && "text-accent")}
            >
              <span className="block text-[11px] uppercase tracking-wide text-fg-subtle">{t.scheduling.weekdaysShort[isoWeekday(d) as 1]}</span>
              <span className={cn("text-sm font-semibold tabular-nums", d === today ? "text-accent" : "text-fg")}>{d.slice(8)}</span>
            </Link>
          ))}
        </div>
        <div className="flex pt-2">
          <TimeGutter {...bounds} />
          {days.map((d) => (
            <Column
              key={d}
              date={d}
              items={items.filter((a) => localDateOf(a.starts_at, timeZone) === d)}
              timeZone={timeZone}
              t={t}
              locale={locale}
              showProfessional
              {...bounds}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function DayView({
  date,
  items,
  professionals,
  timeZone,
  t,
  locale,
  bounds,
}: {
  date: DateString;
  items: AppointmentItem[];
  professionals: { id: string; name: string }[];
  timeZone: string;
  t: Messages;
  locale: Locale;
  bounds: { startHour: number; endHour: number };
}) {
  const columns = professionals.length ? professionals : [{ id: "", name: "" }];
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: Math.max(480, columns.length * 180 + 56) }}>
        <div className="sticky top-0 z-10 flex border-b border-border bg-surface">
          <div className="w-14 shrink-0 border-r border-border" />
          {columns.map((p) => (
            <div key={p.id} className="flex-1 truncate border-r border-border px-2 py-2.5 text-center text-[13px] font-medium last:border-r-0">
              {p.name}
            </div>
          ))}
        </div>
        <div className="flex pt-2">
          <TimeGutter {...bounds} />
          {columns.map((p) => (
            <Column
              key={p.id}
              date={date}
              items={items.filter((a) => !p.id || a.professional_id === p.id)}
              timeZone={timeZone}
              t={t}
              locale={locale}
              showProfessional={!p.id}
              {...bounds}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function MonthView({
  monthStart,
  items,
  timeZone,
  t,
  locale,
  today,
}: {
  monthStart: DateString;
  items: AppointmentItem[];
  timeZone: string;
  t: Messages;
  locale: Locale;
  today: DateString;
}) {
  const gridStart = addDays(monthStart, 1 - isoWeekday(monthStart));
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const month = monthStart.slice(0, 7);
  const byDay = new Map<string, AppointmentItem[]>();
  for (const a of items) {
    const d = localDateOf(a.starts_at, timeZone);
    byDay.set(d, [...(byDay.get(d) ?? []), a]);
  }
  return (
    <div>
      <div className="grid grid-cols-7 border-b border-border text-center text-[11px] uppercase tracking-wide text-fg-subtle">
        {[1, 2, 3, 4, 5, 6, 7].map((d) => (
          <div key={d} className="py-2">{t.scheduling.weekdaysShort[d as 1]}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const list = byDay.get(d) ?? [];
          return (
            <div key={d} className={cn("min-h-20 border-b border-r border-border p-1 sm:min-h-28 sm:p-1.5 [&:nth-child(7n)]:border-r-0", d.slice(0, 7) !== month && "bg-bg-elevated/60")}>
              <Link
                href={`/app/schedule?view=day&date=${d}`}
                className={cn(
                  "inline-grid size-6 place-items-center rounded-full text-xs tabular-nums hover:bg-surface-3",
                  d === today ? "bg-accent font-semibold text-accent-fg" : d.slice(0, 7) === month ? "text-fg-muted" : "text-fg-subtle",
                )}
                aria-label={formatCalendarDate(d, locale, { dateStyle: "full" })}
              >
                {Number(d.slice(8))}
              </Link>
              <ul className="mt-1 hidden space-y-0.5 sm:block">
                {list.slice(0, 3).map((a) => (
                  <li key={a.id}>
                    <Link href={`/app/schedule/appointments/${a.id}`} className="block truncate rounded px-1 py-0.5 text-[11px] text-fg-muted hover:bg-surface-3">
                      <span className="font-mono text-fg-subtle">{formatTime(a.starts_at, locale, timeZone)}</span> {a.customer?.full_name}
                    </Link>
                  </li>
                ))}
                {list.length > 3 && (
                  <li className="px-1 text-[11px] text-fg-subtle">{format(t.scheduling.moreCount, { count: list.length - 3 })}</li>
                )}
              </ul>
              {list.length > 0 && (
                <span className="mt-1 block text-center text-[11px] font-medium text-accent sm:hidden">{list.length}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
