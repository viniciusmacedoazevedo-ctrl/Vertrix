import "server-only";
import type { z } from "zod";
import type { AppContext } from "@/lib/auth/context";
import { assertCanManage } from "@/lib/auth/context";
import { AppError, unwrap, unwrapList } from "@/lib/errors";
import { parseLocalDateTime } from "@/lib/domain/datetime";
import type { professionalSchema, serviceSchema, timeOffSchema, workingHoursSchema } from "@/lib/validation/schemas";

type Ctx = Pick<AppContext, "supabase" | "org" | "user" | "role">;

export async function listServices(ctx: Ctx, options: { activeOnly?: boolean } = {}) {
  let query = ctx.supabase.from("services").select("*").eq("organization_id", ctx.org.id);
  if (options.activeOnly) query = query.eq("active", true);
  return unwrapList(await query.order("active", { ascending: false }).order("name"));
}

export async function getService(ctx: Ctx, id: string) {
  const data = unwrap(
    await ctx.supabase.from("services").select("*").eq("organization_id", ctx.org.id).eq("id", id).maybeSingle(),
  );
  if (!data) throw new AppError("not_found");
  return data;
}

export async function saveService(ctx: Ctx, id: string | null, input: z.infer<typeof serviceSchema>) {
  assertCanManage(ctx);
  const row = {
    name: input.name,
    description: input.description,
    duration_minutes: input.durationMinutes,
    price: input.price,
    active: input.active,
  };
  if (id) {
    const data = unwrap(
      await ctx.supabase.from("services").update(row).eq("organization_id", ctx.org.id).eq("id", id).select("id").maybeSingle(),
    );
    if (!data) throw new AppError("not_found");
    return data;
  }
  return unwrap(
    await ctx.supabase.from("services").insert({ organization_id: ctx.org.id, ...row }).select("id").single(),
  );
}

export async function listProfessionals(ctx: Ctx, options: { activeOnly?: boolean } = {}) {
  let query = ctx.supabase
    .from("professionals")
    .select("*, professional_services(service_id), working_hours(weekday, start_time, end_time)")
    .eq("organization_id", ctx.org.id);
  if (options.activeOnly) query = query.eq("active", true);
  return unwrapList(await query.order("active", { ascending: false }).order("name"));
}

export type ProfessionalWithRelations = Awaited<ReturnType<typeof listProfessionals>>[number];

export async function getProfessional(ctx: Ctx, id: string) {
  const data = unwrap(
    await ctx.supabase
      .from("professionals")
      .select("*, professional_services(service_id), working_hours(id, weekday, start_time, end_time)")
      .eq("organization_id", ctx.org.id)
      .eq("id", id)
      .maybeSingle(),
  );
  if (!data) throw new AppError("not_found");
  return data;
}

export async function saveProfessional(ctx: Ctx, id: string | null, input: z.infer<typeof professionalSchema>) {
  assertCanManage(ctx);
  const row = { name: input.name, email: input.email, phone: input.phone, active: input.active };
  let professionalId = id;
  if (id) {
    const data = unwrap(
      await ctx.supabase.from("professionals").update(row).eq("organization_id", ctx.org.id).eq("id", id).select("id").maybeSingle(),
    );
    if (!data) throw new AppError("not_found");
  } else {
    professionalId = unwrap(
      await ctx.supabase.from("professionals").insert({ organization_id: ctx.org.id, ...row }).select("id").single(),
    ).id;
  }
  unwrap(
    await ctx.supabase.rpc("set_professional_services", {
      p_professional_id: professionalId!,
      p_service_ids: input.serviceIds,
    }),
  );
  return { id: professionalId! };
}

export async function replaceWorkingHours(ctx: Ctx, professionalId: string, rows: z.infer<typeof workingHoursSchema>) {
  assertCanManage(ctx);
  await getProfessional(ctx, professionalId);
  unwrap(
    await ctx.supabase.rpc("replace_working_hours", {
      p_professional_id: professionalId,
      p_rows: rows.map((r) => ({ weekday: r.weekday, start: r.start, end: r.end === "24:00" ? "24:00:00" : r.end })),
    }),
  );
}

export async function listTimeOff(ctx: Ctx, professionalId: string, fromIso: string) {
  return unwrapList(
    await ctx.supabase
      .from("time_off")
      .select("*")
      .eq("organization_id", ctx.org.id)
      .eq("professional_id", professionalId)
      .gte("ends_at", fromIso)
      .order("starts_at")
      .limit(100),
  );
}

export async function addTimeOff(ctx: Ctx, input: z.infer<typeof timeOffSchema>) {
  const startsAt = parseLocalDateTime(input.startsAt, ctx.org.timezone);
  const endsAt = parseLocalDateTime(input.endsAt, ctx.org.timezone);
  if (!startsAt || !endsAt || endsAt <= startsAt) throw new AppError("validation", "time_off_range");
  unwrap(
    await ctx.supabase.from("time_off").insert({
      organization_id: ctx.org.id,
      professional_id: input.professionalId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      reason: input.reason,
    }),
  );
}

export async function deleteTimeOff(ctx: Ctx, id: string) {
  unwrap(await ctx.supabase.from("time_off").delete().eq("organization_id", ctx.org.id).eq("id", id));
}

/** Whether the organization has what it needs to start booking. */
export async function schedulingReadiness(ctx: Ctx) {
  const [services, professionals] = await Promise.all([
    ctx.supabase.from("services").select("id", { count: "exact", head: true }).eq("organization_id", ctx.org.id).eq("active", true),
    ctx.supabase.from("professionals").select("id", { count: "exact", head: true }).eq("organization_id", ctx.org.id).eq("active", true),
  ]);
  return { services: services.count ?? 0, professionals: professionals.count ?? 0 };
}
