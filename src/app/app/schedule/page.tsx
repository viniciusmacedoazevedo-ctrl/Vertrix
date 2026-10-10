import type { Metadata } from "next";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { canManage, getAppContext } from "@/lib/auth/context";
import { listAppointments } from "@/lib/services/scheduling/appointments";
import { listProfessionals, schedulingReadiness } from "@/lib/services/scheduling/catalog";
import { addDays, addMonths, isDateString, startOfMonth, startOfWeek, todayInTimeZone, zonedRange } from "@/lib/domain/datetime";
import { formatCalendarDate } from "@/lib/domain/format";
import { param } from "@/lib/page";
import { PageHeader } from "@/components/ui/page-header";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterTabs, withParams } from "@/components/ui/filter-tabs";
import { inputClasses } from "@/components/ui/form";
import { DayView, hourBounds, MonthView, WeekView } from "@/components/schedule/calendar";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getAppContext();
  return { title: t.scheduling.title };
}

const VIEWS = ["day", "week", "month"] as const;

export default async function SchedulePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await getAppContext();
  const { t, locale, org } = ctx;
  const sp = await searchParams;
  const tz = org.timezone;
  const today = todayInTimeZone(tz);
  const view = VIEWS.find((v) => v === param(sp.view)) ?? "week";
  const dateParam = param(sp.date);
  const date = isDateString(dateParam) ? dateParam : today;

  const [professionals, readiness] = await Promise.all([listProfessionals(ctx), schedulingReadiness(ctx)]);
  const proParam = param(sp.professional);
  const professional = professionals.find((p) => p.id === proParam);

  if (readiness.services === 0 || readiness.professionals === 0) {
    return (
      <Card>
        <EmptyState
          icon={CalendarDays}
          title={t.scheduling.setupRequired.title}
          description={t.scheduling.setupRequired.body}
          action={
            canManage(ctx) ? (
              <div className="flex flex-wrap justify-center gap-2">
                <LinkButton href="/app/schedule/services/new">{t.scheduling.setupRequired.services}</LinkButton>
                <LinkButton href="/app/schedule/professionals/new" variant="outline">{t.scheduling.setupRequired.professionals}</LinkButton>
              </div>
            ) : undefined
          }
        />
      </Card>
    );
  }

  let from: string;
  let to: string;
  let prev: string;
  let next: string;
  let title: string;
  if (view === "day") {
    from = date;
    to = addDays(date, 1);
    prev = addDays(date, -1);
    next = addDays(date, 1);
    title = formatCalendarDate(date, locale, { dateStyle: "full" });
  } else if (view === "week") {
    from = startOfWeek(date);
    to = addDays(from, 7);
    prev = addDays(from, -7);
    next = addDays(from, 7);
    title = `${formatCalendarDate(from, locale, { day: "numeric", month: "short", dateStyle: undefined })} – ${formatCalendarDate(addDays(to, -1), locale)}`;
  } else {
    from = startOfMonth(date);
    to = addMonths(from, 1);
    prev = addMonths(from, -1);
    next = addMonths(from, 1);
    title = formatCalendarDate(from, locale, { month: "long", year: "numeric", dateStyle: undefined });
  }
  // Month grid shows surrounding days too.
  const fetchFrom = view === "month" ? addDays(from, -7) : from;
  const fetchTo = view === "month" ? addDays(to, 14) : to;
  const range = zonedRange(fetchFrom, fetchTo, tz);
  const items = await listAppointments(ctx, { from: range.start, to: range.end }, { professionalId: professional?.id });

  const visiblePros = professional ? [professional] : professionals.filter((p) => p.active);
  const bounds = hourBounds(items, visiblePros.flatMap((p) => p.working_hours), tz);
  const current = { view: view === "week" ? undefined : view, date: date === today ? undefined : date, professional: professional?.id };

  return (
    <>
      <PageHeader
        title={t.scheduling.title}
        description={t.scheduling.subtitle}
        actions={
          <LinkButton href={`/app/schedule/appointments/new?date=${date}${professional ? `&professionalId=${professional.id}` : ""}`}>
            <Plus className="size-4" aria-hidden /> {t.scheduling.newAppointment}
          </LinkButton>
        }
      />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <LinkButton href={withParams("/app/schedule", current, { date: prev })} variant="outline" size="icon" aria-label={t.common.previous}>
            <ChevronLeft className="size-4" aria-hidden />
          </LinkButton>
          <LinkButton href={withParams("/app/schedule", current, { date: undefined })} variant="outline" size="sm">{t.scheduling.today}</LinkButton>
          <LinkButton href={withParams("/app/schedule", current, { date: next })} variant="outline" size="icon" aria-label={t.common.next}>
            <ChevronRight className="size-4" aria-hidden />
          </LinkButton>
          <h2 className="ml-2 text-sm font-semibold capitalize sm:text-base">{title}</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <FilterTabs
            label={t.scheduling.title}
            items={VIEWS.map((v) => ({ href: withParams("/app/schedule", current, { view: v === "week" ? undefined : v }), label: t.scheduling.views[v], active: v === view }))}
          />
          <form action="/app/schedule" className="flex gap-2">
            {view !== "week" && <input type="hidden" name="view" value={view} />}
            {date !== today && <input type="hidden" name="date" value={date} />}
            <select name="professional" defaultValue={professional?.id ?? ""} aria-label={t.scheduling.appointment.professional} className={`${inputClasses()} sm:w-52`}>
              <option value="">{t.scheduling.allProfessionals}</option>
              {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <Button type="submit" variant="secondary">{t.common.filter}</Button>
          </form>
        </div>
      </div>

      <Card className="overflow-hidden">
        {view === "week" && (
          <WeekView days={Array.from({ length: 7 }, (_, i) => addDays(from, i))} items={items} timeZone={tz} t={t} locale={locale} today={today} bounds={bounds} />
        )}
        {view === "day" && (
          <DayView date={date} items={items} professionals={visiblePros.map((p) => ({ id: p.id, name: p.name }))} timeZone={tz} t={t} locale={locale} bounds={bounds} />
        )}
        {view === "month" && <MonthView monthStart={from} items={items} timeZone={tz} t={t} locale={locale} today={today} />}
        {items.length === 0 && <p className="border-t border-border px-5 py-3 text-center text-[13px] text-fg-subtle">{t.scheduling.noAppointments}</p>}
      </Card>
    </>
  );
}
