import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { computeAvailableSlots, type Slot } from "@/lib/domain/availability";
import { addDays, todayInTimeZone, zonedDayRange, type DateString } from "@/lib/domain/datetime";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * Public booking. Everything goes through SECURITY DEFINER RPCs that expose only
 * what a booking page needs; anonymous visitors never touch tables directly.
 */
const pageSchema = z.object({
  organization: z.object({
    name: z.string(),
    slug: z.string(),
    timezone: z.string(),
    currency: z.string(),
    locale: z.enum(["pt-BR", "en"]),
    slot_interval_minutes: z.number(),
    min_notice_minutes: z.number(),
    max_days_ahead: z.number(),
  }),
  services: z.array(
    z.object({ id: z.string(), name: z.string(), description: z.string().nullable(), duration_minutes: z.number(), price: z.number().nullable() }),
  ),
  professionals: z.array(z.object({ id: z.string(), name: z.string(), service_ids: z.array(z.string()) })),
});

export type BookingPage = z.infer<typeof pageSchema>;

export async function getBookingPage(slug: string): Promise<BookingPage | null> {
  if (!/^[a-z0-9-]{3,48}$/.test(slug)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_booking_page", { p_slug: slug });
  if (error) {
    logger.error("booking.page_failed", { code: error.code });
    throw new AppError("unknown");
  }
  if (!data) return null;
  return pageSchema.parse(data);
}

const scheduleSchema = z.object({
  working_hours: z.array(z.object({ weekday: z.number(), start_time: z.string(), end_time: z.string() })),
  busy: z.array(z.object({ starts_at: z.string(), ends_at: z.string() })),
});

export async function getPublicSlots(
  page: BookingPage,
  params: { serviceId: string; professionalId: string; date: DateString },
  now = new Date(),
): Promise<Slot[]> {
  const service = page.services.find((s) => s.id === params.serviceId);
  const pro = page.professionals.find((p) => p.id === params.professionalId && p.service_ids.includes(params.serviceId));
  if (!service || !pro) throw new AppError("not_found");
  const org = page.organization;
  const { start, end } = zonedDayRange(params.date, org.timezone);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_booking_schedule", {
    p_slug: org.slug,
    p_professional_id: pro.id,
    p_from: start.toISOString(),
    p_to: end.toISOString(),
  });
  if (error) {
    logger.error("booking.schedule_failed", { code: error.code });
    throw new AppError("unknown");
  }
  if (!data) return [];
  const schedule = scheduleSchema.parse(data);
  return computeAvailableSlots({
    date: params.date,
    timeZone: org.timezone,
    workingHours: schedule.working_hours,
    busy: schedule.busy,
    durationMinutes: service.duration_minutes,
    intervalMinutes: org.slot_interval_minutes,
    minNoticeMinutes: org.min_notice_minutes,
    maxDaysAhead: org.max_days_ahead,
    now,
    today: todayInTimeZone(org.timezone, now),
  });
}

export function bookableDates(page: BookingPage, now = new Date()): { first: DateString; last: DateString } {
  const today = todayInTimeZone(page.organization.timezone, now);
  return { first: today, last: addDays(today, page.organization.max_days_ahead) };
}

export async function createPublicBooking(input: {
  slug: string;
  serviceId: string;
  professionalId: string;
  startsAt: string;
  fullName: string;
  email: string;
  phone: string | null;
  notes: string | null;
  idempotencyKey: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_public_booking", {
    p_slug: input.slug,
    p_service_id: input.serviceId,
    p_professional_id: input.professionalId,
    p_starts_at: input.startsAt,
    p_full_name: input.fullName,
    p_email: input.email,
    p_phone: input.phone ?? "",
    p_notes: input.notes ?? "",
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) {
    const msg = error.message ?? "";
    if (error.code === "23P01" || msg.includes("slot_unavailable") || msg.includes("slot_out_of_range")) throw new AppError("slot_conflict");
    if (msg.includes("rate_limited")) throw new AppError("rate_limited");
    if (error.code === "22023") throw new AppError("validation");
    if (msg.includes("booking_unavailable")) throw new AppError("not_found");
    logger.error("booking.create_failed", { code: error.code });
    throw new AppError("unknown");
  }
  return z.object({ id: z.string(), starts_at: z.string(), ends_at: z.string(), replayed: z.boolean() }).parse(data);
}
