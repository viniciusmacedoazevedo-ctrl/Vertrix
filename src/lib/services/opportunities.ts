import "server-only";
import type { z } from "zod";
import type { AppContext } from "@/lib/auth/context";
import { AppError, unwrap, unwrapList } from "@/lib/errors";
import { OPEN_STAGES, staleCutoff, type OpportunityStage } from "@/lib/domain/followup";
import { todayInTimeZone } from "@/lib/domain/datetime";
import type { opportunitySchema } from "@/lib/validation/schemas";

export type OpportunityInput = z.infer<typeof opportunitySchema>;
type Ctx = Pick<AppContext, "supabase" | "org" | "user">;

export const OPPORTUNITY_SORTS = ["follow_up", "last_interaction", "created", "value", "priority"] as const;
export type OpportunitySort = (typeof OPPORTUNITY_SORTS)[number];

export interface OpportunityFilters {
  stage?: "open" | "all" | OpportunityStage;
  followUp?: boolean;
  priority?: "low" | "medium" | "high";
  customerId?: string;
  sort?: OpportunitySort;
  limit?: number;
}

const LIST_COLUMNS =
  "id, title, estimated_value, stage, priority, last_interaction_at, next_action, follow_up_on, owner_id, closed_at, created_at, customer_id, customer:customers(id, full_name, company_name)";

/** PostgREST filter matching the follow-up rule (see domain/followup.ts). */
export function followUpFilter(org: AppContext["org"], now = new Date()): string {
  const today = todayInTimeZone(org.timezone, now);
  const cutoff = staleCutoff(now, org.followup_stale_days).toISOString();
  return `follow_up_on.lte.${today},last_interaction_at.lt.${cutoff}`;
}

export async function listOpportunities(ctx: Ctx, filters: OpportunityFilters = {}) {
  let query = ctx.supabase.from("opportunities").select(LIST_COLUMNS).eq("organization_id", ctx.org.id);

  const stage = filters.stage ?? "open";
  if (stage === "open" || filters.followUp) query = query.in("stage", [...OPEN_STAGES]);
  else if (stage !== "all") query = query.eq("stage", stage);
  if (filters.followUp) query = query.or(followUpFilter(ctx.org));
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.customerId) query = query.eq("customer_id", filters.customerId);

  switch (filters.sort ?? "follow_up") {
    case "follow_up":
      query = query.order("follow_up_on", { ascending: true, nullsFirst: false }).order("last_interaction_at");
      break;
    case "last_interaction":
      query = query.order("last_interaction_at", { ascending: true });
      break;
    case "value":
      query = query.order("estimated_value", { ascending: false, nullsFirst: false });
      break;
    case "priority":
      query = query.order("priority", { ascending: false }).order("follow_up_on", { nullsFirst: false });
      break;
    case "created":
      query = query.order("created_at", { ascending: false });
      break;
  }
  return unwrapList(await query.limit(filters.limit ?? 500));
}

export type OpportunityListItem = Awaited<ReturnType<typeof listOpportunities>>[number];

export async function getOpportunity(ctx: Ctx, id: string) {
  const data = unwrap(
    await ctx.supabase
      .from("opportunities")
      .select("*, customer:customers(id, full_name, company_name, email, phone)")
      .eq("organization_id", ctx.org.id)
      .eq("id", id)
      .maybeSingle(),
  );
  if (!data) throw new AppError("not_found");
  return data;
}

function toRow(input: OpportunityInput) {
  return {
    title: input.title,
    customer_id: input.customerId,
    estimated_value: input.estimatedValue,
    stage: input.stage,
    priority: input.priority,
    next_action: input.nextAction,
    follow_up_on: input.followUpOn,
    notes: input.notes,
    owner_id: input.ownerId,
  };
}

export async function createOpportunity(ctx: Ctx, input: OpportunityInput) {
  return unwrap(
    await ctx.supabase
      .from("opportunities")
      .insert({ organization_id: ctx.org.id, ...toRow(input) })
      .select("id")
      .single(),
  );
}

export async function updateOpportunity(ctx: Ctx, id: string, input: OpportunityInput) {
  const data = unwrap(
    await ctx.supabase
      .from("opportunities")
      .update(toRow(input))
      .eq("organization_id", ctx.org.id)
      .eq("id", id)
      .select("id")
      .maybeSingle(),
  );
  if (!data) throw new AppError("not_found");
}

export async function setOpportunityStage(ctx: Ctx, id: string, stage: OpportunityStage) {
  const data = unwrap(
    await ctx.supabase
      .from("opportunities")
      .update({ stage, last_interaction_at: new Date().toISOString() })
      .eq("organization_id", ctx.org.id)
      .eq("id", id)
      .select("id")
      .maybeSingle(),
  );
  if (!data) throw new AppError("not_found");
}

export async function listOpportunityOptions(ctx: Ctx) {
  return unwrapList(
    await ctx.supabase
      .from("opportunities")
      .select("id, title, customer_id")
      .eq("organization_id", ctx.org.id)
      .in("stage", [...OPEN_STAGES])
      .order("created_at", { ascending: false })
      .limit(500),
  );
}
