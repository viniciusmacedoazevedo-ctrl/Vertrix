import "server-only";
import type { AppContext } from "@/lib/auth/context";
import { hasModule } from "@/lib/auth/context";
import { unwrapList } from "@/lib/errors";
import { OPEN_STAGES } from "@/lib/domain/followup";
import { addDays, localDateOf, startOfWeek, todayInTimeZone, zonedDayRange, zonedRange } from "@/lib/domain/datetime";
import { followUpFilter, listOpportunities } from "./opportunities";
import { listTasks } from "./tasks";
import { listActivities } from "./activities";
import { listAppointments } from "./scheduling/appointments";
import { schedulingReadiness } from "./scheduling/catalog";

type Ctx = Pick<AppContext, "supabase" | "org" | "user" | "role">;

export interface WeeklyPoint {
  week: string;
  created: number;
  won: number;
}

function countOf(result: { count: number | null; error: unknown }) {
  if (result.error) throw result.error;
  return result.count ?? 0;
}

async function salesBlock(ctx: Ctx, now: Date) {
  const org = ctx.org.id;
  const eightWeeksAgo = zonedRange(addDays(startOfWeek(todayInTimeZone(ctx.org.timezone, now)), -49), addDays(todayInTimeZone(ctx.org.timezone, now), 1), ctx.org.timezone).start;

  const [openOpps, followUpCount, followUps, pending, overdue, chartRows] = await Promise.all([
    ctx.supabase.from("opportunities").select("estimated_value").eq("organization_id", org).in("stage", [...OPEN_STAGES]).limit(10000),
    ctx.supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("organization_id", org).in("stage", [...OPEN_STAGES]).or(followUpFilter(ctx.org, now)),
    listOpportunities(ctx, { followUp: true, sort: "follow_up", limit: 5 }),
    ctx.supabase.from("tasks").select("id", { count: "exact", head: true }).eq("organization_id", org).eq("status", "open"),
    ctx.supabase.from("tasks").select("id", { count: "exact", head: true }).eq("organization_id", org).eq("status", "open").lt("due_at", now.toISOString()),
    ctx.supabase.from("opportunities").select("created_at, closed_at, stage").eq("organization_id", org).or(`created_at.gte.${eightWeeksAgo.toISOString()},closed_at.gte.${eightWeeksAgo.toISOString()}`).limit(10000),
  ]);

  const open = unwrapList(openOpps);
  const openValue = open.reduce((sum, o) => sum + (o.estimated_value ?? 0), 0);

  // Weekly series (weeks start on Monday, in the organization's time zone).
  const firstWeek = startOfWeek(localDateOf(eightWeeksAgo, ctx.org.timezone));
  const weeks: WeeklyPoint[] = Array.from({ length: 8 }, (_, i) => ({ week: addDays(firstWeek, i * 7), created: 0, won: 0 }));
  const byWeek = new Map(weeks.map((w) => [w.week, w]));
  for (const row of unwrapList(chartRows)) {
    const created = byWeek.get(startOfWeek(localDateOf(row.created_at, ctx.org.timezone)));
    if (created) created.created += 1;
    if (row.stage === "won" && row.closed_at) {
      const won = byWeek.get(startOfWeek(localDateOf(row.closed_at, ctx.org.timezone)));
      if (won) won.won += 1;
    }
  }
  const weeksWithData = weeks.filter((w) => w.created > 0 || w.won > 0).length;

  return {
    openCount: open.length,
    openValue,
    followUpCount: countOf(followUpCount),
    followUps,
    pendingTasks: countOf(pending),
    overdueTasks: countOf(overdue),
    chart: weeksWithData >= 2 ? weeks : null,
  };
}

async function schedulingBlock(ctx: Ctx, now: Date) {
  const today = todayInTimeZone(ctx.org.timezone, now);
  const day = zonedDayRange(today, ctx.org.timezone);
  const week = zonedRange(startOfWeek(today), addDays(startOfWeek(today), 7), ctx.org.timezone);
  const since30 = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const [todayList, weekCount, cancellations, readiness] = await Promise.all([
    listAppointments(ctx, { from: day.start, to: day.end }),
    ctx.supabase.from("appointments").select("id", { count: "exact", head: true }).eq("organization_id", ctx.org.id).neq("status", "cancelled").gte("starts_at", week.start.toISOString()).lt("starts_at", week.end.toISOString()),
    ctx.supabase.from("appointments").select("id", { count: "exact", head: true }).eq("organization_id", ctx.org.id).eq("status", "cancelled").gte("cancelled_at", since30),
    schedulingReadiness(ctx),
  ]);
  return {
    today: todayList,
    weekCount: countOf(weekCount),
    cancellations30d: countOf(cancellations),
    ready: readiness.services > 0 && readiness.professionals > 0,
  };
}

export async function getDashboard(ctx: Ctx, now = new Date()) {
  const sales = hasModule(ctx.org, "sales");
  const scheduling = hasModule(ctx.org, "scheduling");

  const [customerCount, salesData, schedulingData, upcomingTasks, activity] = await Promise.all([
    ctx.supabase.from("customers").select("id", { count: "exact", head: true }).eq("organization_id", ctx.org.id).is("archived_at", null),
    sales ? salesBlock(ctx, now) : Promise.resolve(null),
    scheduling ? schedulingBlock(ctx, now) : Promise.resolve(null),
    listTasks(ctx, { filter: "open", limit: 6, now }),
    listActivities(ctx, { limit: 8 }),
  ]);

  return {
    customerCount: countOf(customerCount),
    sales: salesData,
    scheduling: schedulingData,
    upcomingTasks,
    activity,
    isEmpty: countOf(customerCount) === 0 && activity.length === 0,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;
