import "server-only";
import type { AppContext } from "@/lib/auth/context";
import { unwrap, unwrapList } from "@/lib/errors";

type Ctx = Pick<AppContext, "supabase" | "org" | "user">;

export async function addNote(
  ctx: Ctx,
  input: { body: string; customerId: string | null; opportunityId: string | null },
) {
  unwrap(
    await ctx.supabase.from("activities").insert({
      organization_id: ctx.org.id,
      actor_id: ctx.user.id,
      type: "note",
      body: input.body,
      customer_id: input.customerId,
      opportunity_id: input.opportunityId,
    }),
  );
}

export interface ActivityFilters {
  customerId?: string;
  opportunityId?: string;
  since?: string;
  limit?: number;
}

export async function listActivities(ctx: Ctx, filters: ActivityFilters = {}) {
  let query = ctx.supabase
    .from("activities")
    .select(
      "id, type, body, metadata, created_at, actor_id, customer_id, opportunity_id, task_id, appointment_id, customer:customers(id, full_name), opportunity:opportunities(id, title)",
    )
    .eq("organization_id", ctx.org.id);
  if (filters.customerId) query = query.eq("customer_id", filters.customerId);
  if (filters.opportunityId) query = query.eq("opportunity_id", filters.opportunityId);
  if (filters.since) query = query.gte("created_at", filters.since);
  const rows = unwrapList(await query.order("created_at", { ascending: false }).limit(filters.limit ?? 50));

  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter((v): v is string => Boolean(v)))];
  const names = new Map<string, string>();
  if (actorIds.length) {
    const profiles = unwrapList(await ctx.supabase.from("profiles").select("id, full_name").in("id", actorIds));
    for (const p of profiles) names.set(p.id, p.full_name ?? "");
  }
  return rows.map((r) => ({ ...r, actor_name: r.actor_id ? (names.get(r.actor_id) ?? null) : null }));
}

export type ActivityItem = Awaited<ReturnType<typeof listActivities>>[number];
