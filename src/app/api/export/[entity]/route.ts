import { NextResponse, type NextRequest } from "next/server";
import { getAppContext, getSessionUser, hasModule } from "@/lib/auth/context";
import { rangeToUtc, resolveRange } from "@/lib/services/reports";
import { audit } from "@/lib/services/organizations";
import { toCsv, type CsvColumn } from "@/lib/domain/csv";
import { formatDateTime } from "@/lib/domain/format";
import { unwrapList } from "@/lib/errors";
import { logger } from "@/lib/logger";

const ENTITIES = ["customers", "opportunities", "tasks", "appointments"] as const;
type Entity = (typeof ENTITIES)[number];

/** CSV export of the organization's data for a period (authenticated; RLS applies). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  const { user } = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const requested = (await params).entity;
  const entity = ENTITIES.find((e) => e === requested);
  if (!entity) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const ctx = await getAppContext();
    const { t, locale, org } = ctx;
    if ((entity === "opportunities" && !hasModule(org, "sales")) || (entity === "appointments" && !hasModule(org, "scheduling"))) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const sp = Object.fromEntries(request.nextUrl.searchParams);
    const range = resolveRange(sp, org.timezone);
    const { start, end } = rangeToUtc(range, org.timezone);
    const s = start.toISOString();
    const e = end.toISOString();
    const dt = (v: string | null) => (v ? formatDateTime(v, locale, org.timezone) : "");
    let csv: string;

    switch (entity as Entity) {
      case "customers": {
        const rows = unwrapList(
          await ctx.supabase.from("customers").select("full_name, company_name, email, phone, source, notes, archived_at, created_at").eq("organization_id", org.id).gte("created_at", s).lt("created_at", e).order("created_at").limit(50000),
        );
        const f = t.customers.fields;
        const cols: CsvColumn<(typeof rows)[number]>[] = [
          { header: f.fullName, value: (r) => r.full_name },
          { header: f.companyName, value: (r) => r.company_name },
          { header: f.email, value: (r) => r.email },
          { header: f.phone, value: (r) => r.phone },
          { header: f.source, value: (r) => (r.source ? t.customers.sources[r.source as keyof typeof t.customers.sources] : "") },
          { header: f.notes, value: (r) => r.notes },
          { header: t.customers.archived, value: (r) => (r.archived_at ? t.common.yes : t.common.no) },
          { header: f.createdAt, value: (r) => dt(r.created_at) },
        ];
        csv = toCsv(rows, cols);
        break;
      }
      case "opportunities": {
        const rows = unwrapList(
          await ctx.supabase.from("opportunities").select("title, stage, priority, estimated_value, next_action, follow_up_on, last_interaction_at, closed_at, created_at, customer:customers(full_name)").eq("organization_id", org.id).gte("created_at", s).lt("created_at", e).order("created_at").limit(50000),
        );
        const f = t.opportunities.fields;
        csv = toCsv(rows, [
          { header: f.title, value: (r) => r.title },
          { header: f.customer, value: (r) => r.customer?.full_name },
          { header: f.stage, value: (r) => t.opportunities.stages[r.stage] },
          { header: f.priority, value: (r) => t.common.priority[r.priority] },
          { header: `${f.estimatedValue} (${org.currency})`, value: (r) => r.estimated_value },
          { header: f.nextAction, value: (r) => r.next_action },
          { header: f.followUpOn, value: (r) => r.follow_up_on },
          { header: f.lastInteraction, value: (r) => dt(r.last_interaction_at) },
          { header: t.common.createdAt, value: (r) => dt(r.created_at) },
        ]);
        break;
      }
      case "tasks": {
        const rows = unwrapList(
          await ctx.supabase.from("tasks").select("title, description, status, priority, due_at, completed_at, created_at, customer:customers(full_name), opportunity:opportunities(title)").eq("organization_id", org.id).gte("created_at", s).lt("created_at", e).order("created_at").limit(50000),
        );
        const f = t.tasks.fields;
        csv = toCsv(rows, [
          { header: f.title, value: (r) => r.title },
          { header: f.description, value: (r) => r.description },
          { header: f.status, value: (r) => t.tasks.status[r.status] },
          { header: f.priority, value: (r) => t.common.priority[r.priority] },
          { header: f.dueAt, value: (r) => dt(r.due_at) },
          { header: f.customer, value: (r) => r.customer?.full_name },
          { header: f.opportunity, value: (r) => r.opportunity?.title },
          { header: t.common.createdAt, value: (r) => dt(r.created_at) },
        ]);
        break;
      }
      case "appointments": {
        const rows = unwrapList(
          await ctx.supabase.from("appointments").select("starts_at, ends_at, status, price, source, cancellation_reason, customer:customers(full_name), service:services(name), professional:professionals(name)").eq("organization_id", org.id).gte("starts_at", s).lt("starts_at", e).order("starts_at").limit(50000),
        );
        const a = t.scheduling.appointment;
        csv = toCsv(rows, [
          { header: a.startsAt, value: (r) => dt(r.starts_at) },
          { header: a.customer, value: (r) => r.customer?.full_name },
          { header: a.service, value: (r) => r.service?.name },
          { header: a.professional, value: (r) => r.professional?.name },
          { header: t.tasks.fields.status, value: (r) => t.scheduling.status[r.status] },
          { header: `${a.price} (${org.currency})`, value: (r) => r.price },
          { header: a.source, value: (r) => a.sources[r.source as "internal"] ?? r.source },
          { header: t.scheduling.cancelReason, value: (r) => r.cancellation_reason },
        ]);
        break;
      }
    }

    await audit(ctx, "data.exported", { type: entity }, { from: range.from, to: range.to });
    const filename = `veltrix-${entity}-${range.from}_${range.to}.csv`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logger.error("export.failed", { error, entity });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
