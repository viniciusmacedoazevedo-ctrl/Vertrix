import "server-only";
import type { z } from "zod";
import type { AppContext } from "@/lib/auth/context";
import { AppError, unwrap, unwrapList } from "@/lib/errors";
import { computeAvailableSlots, fitsSchedule, type Slot } from "@/lib/domain/availability";
import { canTransition, type AppointmentStatus } from "@/lib/domain/appointments";
import {
  localDateOf, localMinutesOf, parseLocalDateTime, todayInTimeZone, zonedDayRange, type DateString,
} from "@/lib/domain/datetime";
import type { appointmentSchema } from "@/lib/validation/schemas";

type Ctx = Pick<AppContext, "supabase" | "org" | "user">;

const COLUMNS =
  "id, starts_at, ends_at, status, price, notes, source, cancelled_at, cancellation_reason, created_at, customer_id, professional_id, service_id, customer:customers(id, full_name, phone, email), professional:professionals(id, name), service:services(id, name, duration_minutes)";

export async function listAppointments(
  ctx: Ctx,
  range: { from: Date; to: Date },
  filters: { professionalId?: string; customerId?: string; includeCancelled?: boolean; limit?: number } = {},
) {
  let query = ctx.supabase
    .from("appointments")
    .select(COLUMNS)
    .eq("organization_id", ctx.org.id)
    .lt("starts_at", range.to.toISOString())
    .gt("ends_at", range.from.toISOString());
  if (filters.professionalId) query = query.eq("professional_id", filters.professionalId);
  if (filters.customerId) query = query.eq("customer_id", filters.customerId);
  if (!filters.includeCancelled) query = query.neq("status", "cancelled");
  return unwrapList(await query.order("starts_at").limit(filters.limit ?? 1000));
}

export type AppointmentItem = Awaited<ReturnType<typeof listAppointments>>[number];

export async function listCustomerAppointments(ctx: Ctx, customerId: string) {
  return unwrapList(
    await ctx.supabase
      .from("appointments")
      .select(COLUMNS)
      .eq("organization_id", ctx.org.id)
      .eq("customer_id", customerId)
      .order("starts_at", { ascending: false })
      .limit(50),
  );
}

export async function getAppointment(ctx: Ctx, id: string) {
  const data = unwrap(
    await ctx.supabase.from("appointments").select(COLUMNS).eq("organization_id", ctx.org.id).eq("id", id).maybeSingle(),
  );
  if (!data) throw new AppError("not_found");
  return data;
}

/** Working hours and busy intervals (appointments + time off) of a professional in a window. */
async function professionalSchedule(ctx: Ctx, professionalId: string, from: Date, to: Date, excludeAppointmentId?: string) {
  let appts = ctx.supabase
    .from("appointments")
    .select("id, starts_at, ends_at")
    .eq("organization_id", ctx.org.id)
    .eq("professional_id", professionalId)
    .neq("status", "cancelled")
    .lt("starts_at", to.toISOString())
    .gt("ends_at", from.toISOString());
  if (excludeAppointmentId) appts = appts.neq("id", excludeAppointmentId);

  const [hours, appointments, timeOff] = await Promise.all([
    ctx.supabase.from("working_hours").select("weekday, start_time, end_time").eq("organization_id", ctx.org.id).eq("professional_id", professionalId),
    appts,
    ctx.supabase
      .from("time_off")
      .select("starts_at, ends_at")
      .eq("organization_id", ctx.org.id)
      .eq("professional_id", professionalId)
      .lt("starts_at", to.toISOString())
      .gt("ends_at", from.toISOString()),
  ]);
  return {
    workingHours: unwrapList(hours),
    busy: [...unwrapList(appointments), ...unwrapList(timeOff)].map((b) => ({ starts_at: b.starts_at, ends_at: b.ends_at })),
  };
}

/** Free slots for internal booking (no minimum notice; uses the organization's slot interval). */
export async function availableSlots(
  ctx: Ctx,
  params: { date: DateString; serviceId: string; professionalId: string; now?: Date },
): Promise<Slot[]> {
  const service = unwrap(
    await ctx.supabase.from("services").select("duration_minutes").eq("organization_id", ctx.org.id).eq("id", params.serviceId).maybeSingle(),
  );
  if (!service) throw new AppError("not_found");
  const { start, end } = zonedDayRange(params.date, ctx.org.timezone);
  const schedule = await professionalSchedule(ctx, params.professionalId, start, end);
  const now = params.now ?? new Date();
  return computeAvailableSlots({
    date: params.date,
    timeZone: ctx.org.timezone,
    workingHours: schedule.workingHours,
    busy: schedule.busy,
    durationMinutes: service.duration_minutes,
    intervalMinutes: ctx.org.booking_slot_interval_minutes,
    minNoticeMinutes: 0,
    maxDaysAhead: 366,
    now,
    today: todayInTimeZone(ctx.org.timezone, now),
  });
}

async function resolveTiming(
  ctx: Ctx,
  input: z.infer<typeof appointmentSchema>,
  excludeAppointmentId?: string,
) {
  const service = unwrap(
    await ctx.supabase
      .from("services")
      .select("id, duration_minutes, price")
      .eq("organization_id", ctx.org.id)
      .eq("id", input.serviceId)
      .maybeSingle(),
  );
  if (!service) throw new AppError("not_found");
  const start = parseLocalDateTime(`${input.date}T${input.time}`, ctx.org.timezone);
  if (!start) throw new AppError("validation", "starts_at");
  const end = new Date(start.getTime() + service.duration_minutes * 60_000);

  const schedule = await professionalSchedule(ctx, input.professionalId, start, end, excludeAppointmentId);
  const fit = fitsSchedule({
    start,
    end,
    timeZone: ctx.org.timezone,
    localDate: localDateOf(start, ctx.org.timezone),
    localStartMinutes: localMinutesOf(start, ctx.org.timezone),
    workingHours: schedule.workingHours,
    busy: schedule.busy,
  });
  if (fit.conflict) throw new AppError("slot_conflict");
  if (!fit.withinHours && !input.allowOutsideHours) throw new AppError("outside_working_hours");
  return { service, start, end };
}

export async function createAppointment(ctx: Ctx, input: z.infer<typeof appointmentSchema>) {
  const { service, start, end } = await resolveTiming(ctx, input);
  // The database exclusion constraint is the final guard against races (mapped to slot_conflict).
  return unwrap(
    await ctx.supabase
      .from("appointments")
      .insert({
        organization_id: ctx.org.id,
        customer_id: input.customerId,
        professional_id: input.professionalId,
        service_id: service.id,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        price: service.price,
        notes: input.notes,
        source: "internal",
      })
      .select("id")
      .single(),
  );
}

export async function updateAppointment(ctx: Ctx, id: string, input: z.infer<typeof appointmentSchema>) {
  const current = await getAppointment(ctx, id);
  if (current.status !== "scheduled" && current.status !== "confirmed") throw new AppError("invalid_transition");
  const { service, start, end } = await resolveTiming(ctx, input, id);
  unwrap(
    await ctx.supabase
      .from("appointments")
      .update({
        customer_id: input.customerId,
        professional_id: input.professionalId,
        service_id: service.id,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        price: current.service_id === service.id ? current.price : service.price,
        notes: input.notes,
      })
      .eq("organization_id", ctx.org.id)
      .eq("id", id),
  );
}

export async function setAppointmentStatus(
  ctx: Ctx,
  id: string,
  status: AppointmentStatus,
  cancellationReason: string | null,
) {
  const current = await getAppointment(ctx, id);
  if (!canTransition(current.status, status)) throw new AppError("invalid_transition");
  unwrap(
    await ctx.supabase
      .from("appointments")
      .update({ status, cancellation_reason: status === "cancelled" ? cancellationReason : null })
      .eq("organization_id", ctx.org.id)
      .eq("id", id),
  );
}
