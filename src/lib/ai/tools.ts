import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { AppContext } from "@/lib/auth/context";
import { hasModule } from "@/lib/auth/context";
import { listOpportunities } from "@/lib/services/opportunities";
import { listTasks } from "@/lib/services/tasks";
import { listCustomers, getCustomer } from "@/lib/services/customers";
import { listActivities } from "@/lib/services/activities";
import { availableSlots, listAppointments, listCustomerAppointments } from "@/lib/services/scheduling/appointments";
import { listProfessionals, listServices } from "@/lib/services/scheduling/catalog";
import { getDashboard } from "@/lib/services/dashboard";
import { daysSince, followUpReason } from "@/lib/domain/followup";
import { addDays, daysBetween, isDateString, todayInTimeZone, zonedRange } from "@/lib/domain/datetime";
import { formatDateTime } from "@/lib/domain/format";

/**
 * Tools available to the assistant. All of them are READ-ONLY and run through the
 * same organization-scoped services (and RLS) as the UI, with the signed-in user's
 * session. The only "write" is `propose_task`, which records a suggestion that the
 * user must explicitly confirm in the interface.
 */

export interface TaskProposal {
  title: string;
  description?: string;
  due_date?: string;
  priority: "low" | "medium" | "high";
  customer_id?: string;
  opportunity_id?: string;
}

export interface ToolRunState {
  proposals: TaskProposal[];
  calls: string[];
}

type Ctx = AppContext;

interface ToolDef<S extends z.ZodTypeAny> {
  name: string;
  description: string;
  schema: S;
  jsonSchema: Anthropic.Beta.BetaTool["input_schema"];
  module?: "sales" | "scheduling";
  run: (ctx: Ctx, input: z.infer<S>, state: ToolRunState) => Promise<unknown>;
}

function tool<S extends z.ZodTypeAny>(def: ToolDef<S>): ToolDef<S> {
  return def;
}

const when = (ctx: Ctx, iso: string | null) => (iso ? formatDateTime(iso, ctx.locale, ctx.org.timezone) : null);

const TOOLS = [
  tool({
    name: "get_overview",
    description: "Current headline numbers for the company: customers, open opportunities and value, opportunities needing follow-up, pending/overdue tasks and today's appointments.",
    schema: z.object({}).strict(),
    jsonSchema: { type: "object", properties: {}, additionalProperties: false },
    run: async (ctx) => {
      const d = await getDashboard(ctx);
      return {
        active_customers: d.customerCount,
        sales: d.sales && {
          open_opportunities: d.sales.openCount,
          open_value: d.sales.openValue,
          currency: ctx.org.currency,
          needing_follow_up: d.sales.followUpCount,
          pending_tasks: d.sales.pendingTasks,
          overdue_tasks: d.sales.overdueTasks,
        },
        scheduling: d.scheduling && {
          appointments_today: d.scheduling.today.length,
          appointments_this_week: d.scheduling.weekCount,
          cancellations_last_30_days: d.scheduling.cancellations30d,
        },
        follow_up_rule_days: ctx.org.followup_stale_days,
      };
    },
  }),
  tool({
    name: "list_opportunities",
    description: "List sales opportunities. filter=needs_follow_up returns open opportunities whose follow-up date is due or that had no interaction for the configured number of days.",
    module: "sales",
    schema: z.object({
      filter: z.enum(["needs_follow_up", "open", "won", "lost", "all"]),
      limit: z.number().int().min(1).max(50).optional(),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        filter: { type: "string", enum: ["needs_follow_up", "open", "won", "lost", "all"] },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      required: ["filter"],
      additionalProperties: false,
    },
    run: async (ctx, input) => {
      const rows = await listOpportunities(ctx, {
        followUp: input.filter === "needs_follow_up",
        stage: input.filter === "needs_follow_up" || input.filter === "open" ? "open" : input.filter,
        sort: input.filter === "needs_follow_up" ? "follow_up" : "created",
        limit: input.limit ?? 20,
      });
      const now = new Date();
      const today = todayInTimeZone(ctx.org.timezone, now);
      return rows.map((o) => ({
        id: o.id,
        title: o.title,
        customer: o.customer?.full_name,
        customer_id: o.customer_id,
        stage: o.stage,
        priority: o.priority,
        estimated_value: o.estimated_value,
        days_since_last_interaction: daysSince(o.last_interaction_at, now),
        follow_up_on: o.follow_up_on,
        next_action: o.next_action,
        attention: followUpReason(o, { staleDays: ctx.org.followup_stale_days, today, now }),
      }));
    },
  }),
  tool({
    name: "list_tasks",
    description: "List tasks by filter: open (all pending), overdue, upcoming (next 7 days) or done (recently completed).",
    schema: z.object({ filter: z.enum(["open", "overdue", "upcoming", "done"]), limit: z.number().int().min(1).max(50).optional() }),
    jsonSchema: {
      type: "object",
      properties: { filter: { type: "string", enum: ["open", "overdue", "upcoming", "done"] }, limit: { type: "integer", minimum: 1, maximum: 50 } },
      required: ["filter"],
      additionalProperties: false,
    },
    run: async (ctx, input) => {
      const rows = await listTasks(ctx, { filter: input.filter, limit: input.limit ?? 25 });
      return rows.map((t) => ({
        id: t.id,
        title: t.title,
        due: when(ctx, t.due_at),
        priority: t.priority,
        status: t.status,
        customer: t.customer?.full_name ?? null,
        opportunity: t.opportunity?.title ?? null,
      }));
    },
  }),
  tool({
    name: "search_customers",
    description: "Search active customers by name, company, email or phone.",
    schema: z.object({ query: z.string().min(1).max(80), limit: z.number().int().min(1).max(20).optional() }),
    jsonSchema: {
      type: "object",
      properties: { query: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 20 } },
      required: ["query"],
      additionalProperties: false,
    },
    run: async (ctx, input) => {
      const { customers } = await listCustomers(ctx, { q: input.query });
      return customers.slice(0, input.limit ?? 10).map((c) => ({
        id: c.id,
        name: c.full_name,
        company: c.company_name,
        email: c.email,
        phone: c.phone,
      }));
    },
  }),
  tool({
    name: "get_customer_details",
    description: "Details of one customer: contact data, notes, recent activity, opportunities, tasks and appointments.",
    schema: z.object({ customer_id: z.string().uuid() }),
    jsonSchema: { type: "object", properties: { customer_id: { type: "string" } }, required: ["customer_id"], additionalProperties: false },
    run: async (ctx, input) => {
      const c = await getCustomer(ctx, input.customer_id);
      const [activity, opps, tasks, appts] = await Promise.all([
        listActivities(ctx, { customerId: c.id, limit: 15 }),
        hasModule(ctx.org, "sales") ? listOpportunities(ctx, { customerId: c.id, stage: "all", sort: "created", limit: 10 }) : [],
        listTasks(ctx, { customerId: c.id, filter: "all", limit: 10 }),
        hasModule(ctx.org, "scheduling") ? listCustomerAppointments(ctx, c.id) : [],
      ]);
      return {
        id: c.id,
        name: c.full_name,
        company: c.company_name,
        email: c.email,
        phone: c.phone,
        source: c.source,
        notes: c.notes,
        archived: Boolean(c.archived_at),
        recent_activity: activity.map((a) => ({ type: a.type, text: a.body, at: when(ctx, a.created_at) })),
        opportunities: opps.map((o) => ({ id: o.id, title: o.title, stage: o.stage, value: o.estimated_value, next_action: o.next_action })),
        tasks: tasks.map((t) => ({ title: t.title, status: t.status, due: when(ctx, t.due_at) })),
        appointments: appts.slice(0, 10).map((a) => ({ at: when(ctx, a.starts_at), service: a.service?.name, professional: a.professional?.name, status: a.status })),
      };
    },
  }),
  tool({
    name: "get_recent_activity",
    description: "Activity log of the company (notes, new customers, stage changes, completed tasks, appointments) for the last N days.",
    schema: z.object({ days: z.number().int().min(1).max(31) }),
    jsonSchema: { type: "object", properties: { days: { type: "integer", minimum: 1, maximum: 31 } }, required: ["days"], additionalProperties: false },
    run: async (ctx, input) => {
      const since = new Date(Date.now() - input.days * 86_400_000).toISOString();
      const rows = await listActivities(ctx, { since, limit: 150 });
      return rows.map((a) => ({
        type: a.type,
        by: a.actor_name,
        customer: a.customer?.full_name ?? null,
        opportunity: a.opportunity?.title ?? null,
        text: a.body,
        metadata: a.metadata,
        at: when(ctx, a.created_at),
      }));
    },
  }),
  tool({
    name: "get_schedule",
    description: "Appointments between two local dates (inclusive, max 31 days), optionally for one professional. Dates are YYYY-MM-DD in the company's time zone.",
    module: "scheduling",
    schema: z.object({ from_date: z.string(), to_date: z.string(), professional_id: z.string().uuid().optional(), include_cancelled: z.boolean().optional() }),
    jsonSchema: {
      type: "object",
      properties: {
        from_date: { type: "string" },
        to_date: { type: "string" },
        professional_id: { type: "string" },
        include_cancelled: { type: "boolean" },
      },
      required: ["from_date", "to_date"],
      additionalProperties: false,
    },
    run: async (ctx, input) => {
      if (!isDateString(input.from_date) || !isDateString(input.to_date) || input.to_date < input.from_date) {
        return { error: "Invalid date range. Use YYYY-MM-DD with from_date <= to_date." };
      }
      if (daysBetween(input.from_date, input.to_date) > 31) return { error: "Range too large (max 31 days)." };
      const range = zonedRange(input.from_date, addDays(input.to_date, 1), ctx.org.timezone);
      const rows = await listAppointments(ctx, { from: range.start, to: range.end }, {
        professionalId: input.professional_id,
        includeCancelled: input.include_cancelled,
        limit: 300,
      });
      return rows.map((a) => ({
        id: a.id,
        starts: when(ctx, a.starts_at),
        ends: when(ctx, a.ends_at),
        customer: a.customer?.full_name,
        service: a.service?.name,
        professional: a.professional?.name,
        status: a.status,
      }));
    },
  }),
  tool({
    name: "list_services_and_professionals",
    description: "Services offered (duration, price) and the professionals who perform each one.",
    module: "scheduling",
    schema: z.object({}).strict(),
    jsonSchema: { type: "object", properties: {}, additionalProperties: false },
    run: async (ctx) => {
      const [services, pros] = await Promise.all([listServices(ctx, { activeOnly: true }), listProfessionals(ctx, { activeOnly: true })]);
      return {
        currency: ctx.org.currency,
        services: services.map((s) => ({ id: s.id, name: s.name, duration_minutes: s.duration_minutes, price: s.price })),
        professionals: pros.map((p) => ({ id: p.id, name: p.name, service_ids: p.professional_services.map((x) => x.service_id) })),
      };
    },
  }),
  tool({
    name: "find_available_slots",
    description: "Free time slots on a local date (YYYY-MM-DD) for a service, for one professional or every professional who performs it. Read-only: it does not book anything.",
    module: "scheduling",
    schema: z.object({ date: z.string(), service_id: z.string().uuid(), professional_id: z.string().uuid().optional() }),
    jsonSchema: {
      type: "object",
      properties: { date: { type: "string" }, service_id: { type: "string" }, professional_id: { type: "string" } },
      required: ["date", "service_id"],
      additionalProperties: false,
    },
    run: async (ctx, input) => {
      if (!isDateString(input.date)) return { error: "Invalid date. Use YYYY-MM-DD." };
      const pros = (await listProfessionals(ctx, { activeOnly: true })).filter(
        (p) => (!input.professional_id || p.id === input.professional_id) && p.professional_services.some((s) => s.service_id === input.service_id),
      );
      const out = [];
      for (const p of pros.slice(0, 10)) {
        const slots = await availableSlots(ctx, { date: input.date, serviceId: input.service_id, professionalId: p.id });
        out.push({ professional: p.name, professional_id: p.id, slots: slots.slice(0, 40).map((s) => when(ctx, s.start)) });
      }
      return out;
    },
  }),
  tool({
    name: "propose_task",
    description:
      "Suggest a follow-up task. This does NOT create anything: the user sees a card and decides whether to create it. Use only when the user asks for help organizing next steps.",
    schema: z.object({
      title: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      due_date: z.string().optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
      customer_id: z.string().uuid().optional(),
      opportunity_id: z.string().uuid().optional(),
    }),
    jsonSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        due_date: { type: "string", description: "YYYY-MM-DD" },
        priority: { type: "string", enum: ["low", "medium", "high"] },
        customer_id: { type: "string" },
        opportunity_id: { type: "string" },
      },
      required: ["title"],
      additionalProperties: false,
    },
    run: async (_ctx, input, state) => {
      if (state.proposals.length >= 5) return { error: "Too many proposals in one answer." };
      state.proposals.push({
        title: input.title,
        description: input.description,
        due_date: input.due_date && isDateString(input.due_date) ? input.due_date : undefined,
        priority: input.priority ?? "medium",
        customer_id: input.customer_id,
        opportunity_id: input.opportunity_id,
      });
      return { status: "proposal_shown_to_user", note: "The task was NOT created. The user must confirm it in the interface." };
    },
  }),
];

export function toolsFor(ctx: Ctx) {
  return TOOLS.filter((t) => !t.module || hasModule(ctx.org, t.module));
}

export function toolDefinitions(ctx: Ctx): Anthropic.Beta.BetaTool[] {
  return toolsFor(ctx).map((t) => ({ name: t.name, description: t.description, input_schema: t.jsonSchema }));
}

const MAX_RESULT_CHARS = 24_000;

/** Validates input and executes a tool. Errors are returned to the model, never thrown. */
export async function executeTool(ctx: Ctx, name: string, input: unknown, state: ToolRunState): Promise<{ content: string; isError: boolean }> {
  const def = toolsFor(ctx).find((t) => t.name === name) as ToolDef<z.ZodTypeAny> | undefined;
  state.calls.push(name);
  if (!def) return { content: `Unknown tool: ${name}`, isError: true };
  const parsed = def.schema.safeParse(input ?? {});
  if (!parsed.success) return { content: `Invalid input: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`, isError: true };
  try {
    const result = await def.run(ctx, parsed.data, state);
    let text = JSON.stringify(result);
    if (text.length > MAX_RESULT_CHARS) text = `${text.slice(0, MAX_RESULT_CHARS)}… [truncated]`;
    return { content: text, isError: false };
  } catch {
    return { content: "The data could not be loaded.", isError: true };
  }
}
