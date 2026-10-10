import "server-only";
import type { AppContext } from "@/lib/auth/context";
import { hasModule } from "@/lib/auth/context";
import { unwrapList } from "@/lib/errors";
import { ALL_STAGES, OPEN_STAGES, type OpportunityStage } from "@/lib/domain/followup";
import {
  addDays, daysBetween, isDateString, localDateOf, startOfMonth, startOfWeek, todayInTimeZone, zonedRange, type DateString,
} from "@/lib/domain/datetime";
import { followUpFilter } from "./opportunities";

type Ctx = Pick<AppContext, "supabase" | "org" | "user">;

export const REPORT_PERIODS = ["7d", "30d", "90d", "365d", "custom"] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

export interface ReportRange {
  period: ReportPeriod;
  from: DateString;
  to: DateString; // inclusive
}

/** Resolves a period selection into an inclusive local date range (max 2 years). */
export function resolveRange(
  input: { period?: string; from?: string; to?: string },
  timeZone: string,
  now = new Date(),
): ReportRange {
  const today = todayInTimeZone(timeZone, now);
  if (input.period === "custom" && isDateString(input.from) && isDateString(input.to) && input.from <= input.to) {
    const from = daysBetween(input.from, input.to) > 730 ? addDays(input.to, -730) : input.from;
    return { period: "custom", from, to: input.to };
  }
  const period = (["7d", "30d", "90d", "365d"] as const).find((p) => p === input.period) ?? "30d";
  const days = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 }[period];
  return { period, from: addDays(today, -(days - 1)), to: today };
}

export function rangeToUtc(range: ReportRange, timeZone: string) {
  return zonedRange(range.from, addDays(range.to, 1), timeZone);
}

export async function getReport(ctx: Ctx, range: ReportRange, now = new Date()) {
  const tz = ctx.org.timezone;
  const { start, end } = rangeToUtc(range, tz);
  const s = start.toISOString();
  const e = end.toISOString();
  const org = ctx.org.id;

  const [oppsCreated, openOpps, wonOpps, followUps, tasksCompleted, tasksCreated, tasksPending, tasksOverdue, customers, appointments] =
    await Promise.all([
      ctx.supabase.from("opportunities").select("stage, estimated_value").eq("organization_id", org).gte("created_at", s).lt("created_at", e).limit(20000),
      ctx.supabase.from("opportunities").select("estimated_value").eq("organization_id", org).in("stage", [...OPEN_STAGES]).limit(20000),
      ctx.supabase.from("opportunities").select("estimated_value").eq("organization_id", org).eq("stage", "won").gte("closed_at", s).lt("closed_at", e).limit(20000),
      ctx.supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("organization_id", org).in("stage", [...OPEN_STAGES]).or(followUpFilter(ctx.org, now)),
      ctx.supabase.from("tasks").select("id", { count: "exact", head: true }).eq("organization_id", org).eq("status", "done").gte("completed_at", s).lt("completed_at", e),
      ctx.supabase.from("tasks").select("id", { count: "exact", head: true }).eq("organization_id", org).gte("created_at", s).lt("created_at", e),
      ctx.supabase.from("tasks").select("id", { count: "exact", head: true }).eq("organization_id", org).eq("status", "open"),
      ctx.supabase.from("tasks").select("id", { count: "exact", head: true }).eq("organization_id", org).eq("status", "open").lt("due_at", now.toISOString()),
      ctx.supabase.from("customers").select("created_at").eq("organization_id", org).gte("created_at", s).lt("created_at", e).limit(20000),
      hasModule(ctx.org, "scheduling")
        ? ctx.supabase
            .from("appointments")
            .select("status, price, service:services(name), professional:professionals(name)")
            .eq("organization_id", org)
            .gte("starts_at", s)
            .lt("starts_at", e)
            .limit(20000)
        : Promise.resolve({ data: [], error: null }),
    ]);

  const sum = (rows: { estimated_value: number | null }[]) => rows.reduce((t, r) => t + (r.estimated_value ?? 0), 0);

  const created = unwrapList(oppsCreated);
  const byStage = ALL_STAGES.map((stage) => {
    const rows = created.filter((r) => r.stage === stage);
    return { stage: stage as OpportunityStage, count: rows.length, value: sum(rows) };
  });
  const won = unwrapList(wonOpps);

  // Customers per bucket: weekly up to ~3 months, monthly beyond.
  const monthly = daysBetween(range.from, range.to) > 100;
  const bucketOf = (d: DateString) => (monthly ? startOfMonth(d) : startOfWeek(d));
  const buckets = new Map<string, number>();
  for (let d = bucketOf(range.from); d <= range.to; d = monthly ? nextMonth(d) : addDays(d, 7)) buckets.set(d, 0);
  for (const c of unwrapList(customers)) {
    const key = bucketOf(localDateOf(c.created_at, tz));
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  const appts = unwrapList(appointments as { data: AppointmentRow[] | null; error: null });
  const scheduling = hasModule(ctx.org, "scheduling") ? summarizeAppointments(appts) : null;

  return {
    range,
    sales: hasModule(ctx.org, "sales")
      ? {
          byStage,
          createdCount: created.length,
          openValue: sum(unwrapList(openOpps)),
          openCount: unwrapList(openOpps).length,
          wonValue: sum(won),
          wonCount: won.length,
          followUps: followUps.count ?? 0,
        }
      : null,
    tasks: {
      completed: tasksCompleted.count ?? 0,
      created: tasksCreated.count ?? 0,
      pending: tasksPending.count ?? 0,
      overdue: tasksOverdue.count ?? 0,
    },
    customers: {
      monthly,
      total: unwrapList(customers).length,
      series: [...buckets.entries()].map(([bucket, count]) => ({ bucket, count })),
    },
    scheduling,
  };
}

interface AppointmentRow {
  status: string;
  price: number | null;
  service: { name: string } | null;
  professional: { name: string } | null;
}

export function summarizeAppointments(rows: AppointmentRow[]) {
  const count = (status: string) => rows.filter((r) => r.status === status).length;
  const group = (key: (r: AppointmentRow) => string) => {
    const map = new Map<string, { name: string; total: number; completed: number; cancelled: number }>();
    for (const r of rows) {
      const name = key(r);
      const entry = map.get(name) ?? { name, total: 0, completed: 0, cancelled: 0 };
      entry.total += 1;
      if (r.status === "completed") entry.completed += 1;
      if (r.status === "cancelled") entry.cancelled += 1;
      map.set(name, entry);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  };
  const total = rows.length;
  const cancelled = count("cancelled");
  return {
    total,
    completed: count("completed"),
    cancelled,
    noShow: count("no_show"),
    cancellationRate: total ? cancelled / total : 0,
    revenue: rows.filter((r) => r.status === "completed").reduce((t, r) => t + (r.price ?? 0), 0),
    byService: group((r) => r.service?.name ?? "—"),
    byProfessional: group((r) => r.professional?.name ?? "—"),
  };
}

function nextMonth(date: DateString): DateString {
  const [y, m] = date.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
}

export type ReportData = Awaited<ReturnType<typeof getReport>>;
