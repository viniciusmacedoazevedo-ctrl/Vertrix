import { z } from "zod";
import { ALL_STAGES } from "@/lib/domain/followup";
import { APPOINTMENT_STATUSES } from "@/lib/domain/appointments";
import { LOCALES } from "@/lib/i18n/config";
import {
  checkbox, optionalDate, optionalEmail, optionalMoney, optionalPhone, optionalText, optionalUuid, requiredText, uuid,
} from "./fields";

export const CUSTOMER_SOURCES = [
  "referral", "website", "social", "event", "outbound", "inbound_call", "walk_in", "booking_page", "other",
] as const;
export const SEGMENTS = [
  "it_services", "consulting", "agency", "professional_services", "beauty_wellness", "health", "education", "retail", "other",
] as const;
export const MODULES = ["sales", "scheduling"] as const;
export const PRIORITIES = ["low", "medium", "high"] as const;
export const COUNTRIES = ["BR", "CA", "US", "PT", "MX", "AR", "CL", "CO", "GB", "OTHER"] as const;
export const CURRENCIES = ["BRL", "CAD", "USD", "EUR", "GBP", "MXN", "ARS", "CLP", "COP"] as const;

const password = z
  .string()
  .min(8, "err:passwordRules")
  .max(72)
  .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), { message: "err:passwordRules" });

export const signUpSchema = z.object({
  fullName: requiredText(120),
  email: z.string().trim().toLowerCase().email("err:invalidEmail"),
  password,
  acceptTerms: z.literal("on", { errorMap: () => ({ message: "err:acceptTerms" }) }),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("err:invalidEmail"),
  password: z.string().min(1),
});

export const emailOnlySchema = z.object({ email: z.string().trim().toLowerCase().email("err:invalidEmail") });

export const newPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "err:passwordMismatch", path: ["confirm"] });

const modulesField = z.array(z.enum(MODULES)).min(1, "err:pickModule");

export const organizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  segment: z.enum(SEGMENTS),
  country: z.enum(COUNTRIES),
  locale: z.enum(LOCALES),
  currency: z.enum(CURRENCIES),
  timezone: z.string().min(1).max(64),
  modules: modulesField,
});

export const organizationSettingsSchema = organizationSchema.extend({
  followupStaleDays: z.coerce.number().int().min(1).max(90),
});

export const bookingSettingsSchema = z.object({
  bookingEnabled: checkbox,
  slotInterval: z.coerce.number().refine((v) => [5, 10, 15, 20, 30, 60].includes(v), "err:invalidOption"),
  minNoticeMinutes: z.coerce.number().int().min(0).max(10080),
  maxDaysAhead: z.coerce.number().int().min(1).max(365),
});

export const profileSchema = z.object({
  fullName: requiredText(120),
  locale: z.enum(LOCALES),
  emailDigest: checkbox,
});

export const customerSchema = z.object({
  fullName: requiredText(160),
  companyName: optionalText(160),
  email: optionalEmail,
  phone: optionalPhone,
  source: z
    .enum(CUSTOMER_SOURCES)
    .or(z.literal(""))
    .optional()
    .transform((v) => (v ? v : null)),
  notes: optionalText(5000),
});

export const noteSchema = z.object({
  body: requiredText(5000),
  customerId: optionalUuid,
  opportunityId: optionalUuid,
});

export const opportunitySchema = z.object({
  title: requiredText(200),
  customerId: uuid,
  estimatedValue: optionalMoney,
  stage: z.enum(ALL_STAGES),
  priority: z.enum(PRIORITIES),
  nextAction: optionalText(500),
  followUpOn: optionalDate,
  notes: optionalText(5000),
  ownerId: optionalUuid,
});

export const taskSchema = z.object({
  title: requiredText(200),
  description: optionalText(5000),
  dueAt: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(v), { message: "err:invalidDate" }),
  priority: z.enum(PRIORITIES),
  customerId: optionalUuid,
  opportunityId: optionalUuid,
  assigneeId: optionalUuid,
});

export const serviceSchema = z.object({
  name: requiredText(120),
  description: optionalText(1000),
  durationMinutes: z.coerce.number().int().min(5).max(720),
  price: optionalMoney,
  active: checkbox,
});

export const professionalSchema = z.object({
  name: requiredText(120),
  email: optionalEmail,
  phone: optionalPhone,
  active: checkbox,
  serviceIds: z.array(uuid).max(200),
});

const timeField = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/, "err:invalidTime");

export const workingHoursSchema = z
  .array(z.object({ weekday: z.number().int().min(1).max(7), start: timeField, end: timeField }))
  .max(50)
  .superRefine((rows, ctx) => {
    const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    rows.forEach((row, i) => {
      if (toMin(row.start) >= toMin(row.end)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "err:timeOrder", path: [i] });
      }
    });
    for (let d = 1; d <= 7; d++) {
      const day = rows.filter((r) => r.weekday === d).sort((a, b) => toMin(a.start) - toMin(b.start));
      for (let i = 1; i < day.length; i++) {
        if (toMin(day[i]!.start) < toMin(day[i - 1]!.end)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "err:timeOverlap", path: [d] });
        }
      }
    }
  });

export const timeOffSchema = z.object({
  professionalId: uuid,
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "err:invalidDate"),
  endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "err:invalidDate"),
  reason: optionalText(200),
});

export const appointmentSchema = z.object({
  customerId: uuid,
  professionalId: uuid,
  serviceId: uuid,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "err:invalidDate"),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "err:invalidTime"),
  notes: optionalText(2000),
  allowOutsideHours: checkbox,
});

export const appointmentStatusSchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES),
  cancellationReason: optionalText(500),
});

export const publicBookingSchema = z.object({
  serviceId: uuid,
  professionalId: uuid,
  startsAt: z.string().datetime({ offset: true }),
  fullName: z.string().trim().min(2).max(160),
  email: z.string().trim().toLowerCase().email("err:invalidEmail"),
  phone: optionalPhone,
  notes: optionalText(500),
  idempotencyKey: z.string().min(8).max(80),
  consent: z.literal("on", { errorMap: () => ({ message: "err:acceptPrivacy" }) }),
});

export const assistantMessageSchema = z.object({
  conversationId: uuid.nullable().optional(),
  message: z.string().trim().min(1).max(4000),
});
