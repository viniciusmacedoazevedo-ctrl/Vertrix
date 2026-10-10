import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { appointmentSchema, customerSchema, opportunitySchema, publicBookingSchema, signUpSchema, workingHoursSchema } from "@/lib/validation/schemas";
import { zodFieldErrors, formToObject } from "@/lib/actions";
import { getMessages } from "@/lib/i18n/messages";
import { fromDbError } from "@/lib/errors";
import { safeNextPath } from "@/lib/safe-redirect";
import { sanitizeSearch } from "@/lib/services/customers";
import { memoryRateLimit } from "@/lib/rate-limit";

const t = getMessages("pt-BR");
const uuid = "6f1c1f3e-8f55-4b0a-9d1c-2b2f3a4b5c6d";

describe("validation schemas", () => {
  it("normalizes optional customer fields", () => {
    const v = customerSchema.parse({ fullName: "  Ana  ", email: " ANA@Example.com ", phone: "", companyName: "", source: "", notes: "" });
    expect(v).toEqual({ fullName: "Ana", email: "ana@example.com", phone: null, companyName: null, source: null, notes: null });
  });

  it("rejects invalid e-mail and phone with localized messages", () => {
    const r = customerSchema.safeParse({ fullName: "Ana", email: "nope", phone: "abc" });
    expect(r.success).toBe(false);
    const errors = zodFieldErrors(r.error as ZodError, t);
    expect(errors.email).toBe(t.errors.invalidEmail);
    expect(errors.phone).toBe(t.errors.invalidPhone);
  });

  it("parses Brazilian and international money formats", () => {
    const base = { title: "x", customerId: uuid, stage: "new", priority: "medium" };
    expect(opportunitySchema.parse({ ...base, estimatedValue: "1.234,56" }).estimatedValue).toBe(1234.56);
    expect(opportunitySchema.parse({ ...base, estimatedValue: "1,234.56" }).estimatedValue).toBe(1234.56);
    expect(opportunitySchema.parse({ ...base, estimatedValue: "" }).estimatedValue).toBeNull();
    expect(opportunitySchema.safeParse({ ...base, estimatedValue: "-5" }).success).toBe(false);
  });

  it("enforces password rules and terms acceptance on sign-up", () => {
    expect(signUpSchema.safeParse({ fullName: "A", email: "a@b.co", password: "short1", acceptTerms: "on" }).success).toBe(false);
    expect(signUpSchema.safeParse({ fullName: "A", email: "a@b.co", password: "longpassword", acceptTerms: "on" }).success).toBe(false);
    expect(signUpSchema.safeParse({ fullName: "A", email: "a@b.co", password: "longpass12", acceptTerms: undefined }).success).toBe(false);
    expect(signUpSchema.safeParse({ fullName: "A", email: "a@b.co", password: "longpass12", acceptTerms: "on" }).success).toBe(true);
  });

  it("rejects overlapping or inverted working hours", () => {
    expect(workingHoursSchema.safeParse([{ weekday: 1, start: "09:00", end: "12:00" }, { weekday: 1, start: "13:00", end: "18:00" }]).success).toBe(true);
    expect(workingHoursSchema.safeParse([{ weekday: 1, start: "09:00", end: "12:00" }, { weekday: 1, start: "11:00", end: "18:00" }]).success).toBe(false);
    expect(workingHoursSchema.safeParse([{ weekday: 2, start: "18:00", end: "09:00" }]).success).toBe(false);
    expect(workingHoursSchema.safeParse([{ weekday: 2, start: "20:00", end: "24:00" }]).success).toBe(true);
  });

  it("requires consent and a valid slot for public bookings", () => {
    const base = {
      serviceId: uuid, professionalId: uuid, startsAt: "2026-10-12T13:00:00.000Z", fullName: "Bruno",
      email: "b@example.com", idempotencyKey: "12345678-abcd",
    };
    expect(publicBookingSchema.safeParse(base).success).toBe(false);
    expect(publicBookingSchema.safeParse({ ...base, consent: "on" }).success).toBe(true);
    expect(publicBookingSchema.safeParse({ ...base, consent: "on", startsAt: "amanhã" }).success).toBe(false);
  });

  it("validates appointment date and time separately", () => {
    const base = { customerId: uuid, professionalId: uuid, serviceId: uuid };
    expect(appointmentSchema.safeParse({ ...base, date: "2026-10-12", time: "09:30" }).success).toBe(true);
    expect(appointmentSchema.safeParse({ ...base, date: "2026-10-12", time: "25:00" }).success).toBe(false);
  });

  it("reads repeated FormData keys as arrays", () => {
    const fd = new FormData();
    fd.append("modules", "sales");
    fd.append("modules", "scheduling");
    fd.append("name", "Acme");
    fd.append("$ACTION_ID_abc", "");
    expect(formToObject(fd, ["modules", "serviceIds"])).toEqual({ modules: ["sales", "scheduling"], name: "Acme", serviceIds: [] });
  });
});

describe("security helpers", () => {
  it("maps database errors to stable codes without leaking details", () => {
    expect(fromDbError({ code: "23505", message: 'duplicate key value violates unique constraint "customers_org_email_active_key"' }).code).toBe("duplicate_email");
    expect(fromDbError({ code: "23P01", message: "conflicting key value violates exclusion constraint" }).code).toBe("slot_conflict");
    expect(fromDbError({ code: "42501", message: "new row violates row-level security policy" }).code).toBe("forbidden");
    expect(fromDbError({ code: "XX000", message: "boom" }).code).toBe("unknown");
  });

  it("only allows same-origin redirect targets", () => {
    expect(safeNextPath("/app/customers")).toBe("/app/customers");
    expect(safeNextPath("//evil.com")).toBe("/app");
    expect(safeNextPath("https://evil.com")).toBe("/app");
    expect(safeNextPath("/\\evil.com")).toBe("/app");
    expect(safeNextPath(null)).toBe("/app");
  });

  it("strips PostgREST filter syntax from search terms", () => {
    expect(sanitizeSearch("ana),email.eq.x")).toBe("ana email eq x");
    expect(sanitizeSearch("  50%_off*  ")).toBe("50 off");
  });

  it("limits requests per window", () => {
    const now = 1_000_000;
    const key = `test-${Math.random()}`;
    expect(memoryRateLimit(key, 2, 1000, now)).toBe(true);
    expect(memoryRateLimit(key, 2, 1000, now + 1)).toBe(true);
    expect(memoryRateLimit(key, 2, 1000, now + 2)).toBe(false);
    expect(memoryRateLimit(key, 2, 1000, now + 1001)).toBe(true);
  });
});
