import "server-only";
import type { z } from "zod";
import type { AppContext } from "@/lib/auth/context";
import { AppError, unwrap, unwrapList } from "@/lib/errors";
import { parseLocalDateTime } from "@/lib/domain/datetime";
import type { taskSchema } from "@/lib/validation/schemas";

export type TaskInput = z.infer<typeof taskSchema>;
type Ctx = Pick<AppContext, "supabase" | "org" | "user">;

export const TASK_FILTERS = ["open", "overdue", "upcoming", "done", "all"] as const;
export type TaskFilter = (typeof TASK_FILTERS)[number];

const COLUMNS =
  "id, title, description, due_at, priority, status, completed_at, customer_id, opportunity_id, assignee_id, created_at, customer:customers(id, full_name), opportunity:opportunities(id, title)";

export async function listTasks(
  ctx: Ctx,
  options: { filter?: TaskFilter; customerId?: string; opportunityId?: string; limit?: number; now?: Date } = {},
) {
  const now = options.now ?? new Date();
  let query = ctx.supabase.from("tasks").select(COLUMNS).eq("organization_id", ctx.org.id);
  if (options.customerId) query = query.eq("customer_id", options.customerId);
  if (options.opportunityId) query = query.eq("opportunity_id", options.opportunityId);

  switch (options.filter ?? "open") {
    case "open":
      query = query.eq("status", "open").order("due_at", { ascending: true, nullsFirst: false });
      break;
    case "overdue":
      query = query.eq("status", "open").lt("due_at", now.toISOString()).order("due_at");
      break;
    case "upcoming":
      query = query
        .eq("status", "open")
        .gte("due_at", now.toISOString())
        .lt("due_at", new Date(now.getTime() + 7 * 86_400_000).toISOString())
        .order("due_at");
      break;
    case "done":
      query = query.eq("status", "done").order("completed_at", { ascending: false });
      break;
    case "all":
      query = query.order("status").order("due_at", { ascending: true, nullsFirst: false });
      break;
  }
  return unwrapList(await query.order("created_at", { ascending: false }).limit(options.limit ?? 300));
}

export type TaskListItem = Awaited<ReturnType<typeof listTasks>>[number];

/** Date-only deadlines mean "end of that day" in the organization's time zone. */
export function resolveDueAt(value: string | null, timeZone: string): string | null {
  if (!value) return null;
  const local = value.length === 10 ? `${value}T23:59` : value;
  const date = parseLocalDateTime(local, timeZone);
  if (!date) throw new AppError("validation", "due_at");
  return date.toISOString();
}

function toRow(input: TaskInput, timeZone: string) {
  return {
    title: input.title,
    description: input.description,
    due_at: resolveDueAt(input.dueAt, timeZone),
    priority: input.priority,
    customer_id: input.customerId,
    opportunity_id: input.opportunityId,
    assignee_id: input.assigneeId,
  };
}

export async function getTask(ctx: Ctx, id: string) {
  const data = unwrap(
    await ctx.supabase.from("tasks").select(COLUMNS).eq("organization_id", ctx.org.id).eq("id", id).maybeSingle(),
  );
  if (!data) throw new AppError("not_found");
  return data;
}

export async function createTask(ctx: Ctx, input: TaskInput) {
  return unwrap(
    await ctx.supabase
      .from("tasks")
      .insert({ organization_id: ctx.org.id, ...toRow(input, ctx.org.timezone) })
      .select("id")
      .single(),
  );
}

export async function updateTask(ctx: Ctx, id: string, input: TaskInput) {
  const data = unwrap(
    await ctx.supabase
      .from("tasks")
      .update(toRow(input, ctx.org.timezone))
      .eq("organization_id", ctx.org.id)
      .eq("id", id)
      .select("id")
      .maybeSingle(),
  );
  if (!data) throw new AppError("not_found");
}

export async function setTaskStatus(ctx: Ctx, id: string, status: "open" | "done") {
  const data = unwrap(
    await ctx.supabase
      .from("tasks")
      .update({ status })
      .eq("organization_id", ctx.org.id)
      .eq("id", id)
      .select("id")
      .maybeSingle(),
  );
  if (!data) throw new AppError("not_found");
}

export async function deleteTask(ctx: Ctx, id: string) {
  unwrap(await ctx.supabase.from("tasks").delete().eq("organization_id", ctx.org.id).eq("id", id));
}
