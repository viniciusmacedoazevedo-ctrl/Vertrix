import { z } from "zod";

/** Trimmed required text. */
export const requiredText = (max: number) => z.string({ required_error: "required" }).trim().min(1).max(max);

/** Optional text: empty strings become null. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || z.string().email().safeParse(v).success, { message: "err:invalidEmail" });

export const optionalPhone = z
  .string()
  .trim()
  .max(40)
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^[+\d][\d\s().-]{5,}$/.test(v), { message: "err:invalidPhone" });

export const uuid = z.string().uuid();
export const optionalUuid = z
  .string()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || z.string().uuid().safeParse(v).success, { message: "err:invalidOption" });

export const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), { message: "err:invalidDate" });

/** Decimal money input accepting "1.234,56", "1234.56" or "1234". Empty → null. */
export const optionalMoney = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const normalized = /,\d{1,2}$/.test(v) ? v.replace(/\./g, "").replace(",", ".") : v.replace(/,/g, "");
    const n = Number(normalized);
    if (!Number.isFinite(n) || n < 0 || n > 999_999_999_999) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "err:invalidAmount" });
      return z.NEVER;
    }
    return Math.round(n * 100) / 100;
  });

export const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("1")])
  .optional()
  .transform((v) => Boolean(v));
