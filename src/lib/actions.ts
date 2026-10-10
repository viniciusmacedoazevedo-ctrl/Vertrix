import "server-only";
import { ZodError, type ZodIssue } from "zod";
import { AppError } from "@/lib/errors";
import { format } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";
import { logger } from "@/lib/logger";

export type { ActionState } from "./action-state";
import type { ActionState } from "./action-state";
export { IDLE } from "./action-state";



/** Converts FormData to a plain object; repeated keys become arrays. */
export function formToObject(formData: FormData, arrayKeys: readonly string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION")) continue;
    const values = formData.getAll(key).filter((v): v is string => typeof v === "string");
    out[key] = arrayKeys.includes(key) ? values : values[0];
  }
  for (const key of arrayKeys) out[key] ??= [];
  return out;
}

export function issueMessage(issue: ZodIssue, t: Messages): string {
  if (issue.message.startsWith("err:")) {
    const key = issue.message.slice(4) as keyof Messages["errors"];
    const msg = t.errors[key];
    if (typeof msg === "string") return msg;
  }
  switch (issue.code) {
    case "too_small":
      if (issue.type === "string") {
        return Number(issue.minimum) <= 1 ? t.errors.required : format(t.errors.tooShort, { min: Number(issue.minimum) });
      }
      if (issue.type === "number") return format(t.errors.tooSmall, { min: Number(issue.minimum) });
      return t.errors.required;
    case "too_big":
      if (issue.type === "string") return format(t.errors.tooLong, { max: Number(issue.maximum) });
      return format(t.errors.tooBig, { max: Number(issue.maximum) });
    case "invalid_type":
      return issue.received === "undefined" || issue.received === "null" ? t.errors.required : t.errors.invalid;
    case "invalid_string":
      return issue.validation === "email" ? t.errors.invalidEmail : t.errors.invalid;
    case "invalid_enum_value":
    case "invalid_union":
    case "invalid_literal":
      return t.errors.invalidOption;
    default:
      return t.errors.invalid;
  }
}

export function zodFieldErrors(error: ZodError, t: Messages): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    out[key] ??= issueMessage(issue, t);
  }
  return out;
}

/**
 * Converts any thrown error into an ActionState with a safe, localized message.
 * Unexpected errors are logged (without sensitive data) and shown generically.
 * Next.js redirect/notFound control-flow errors are re-thrown.
 */
export function toErrorState(error: unknown, t: Messages, event: string): ActionState {
  if (isNextControlFlow(error)) throw error;
  if (error instanceof ZodError) {
    return { status: "error", message: t.errors.formInvalid, fieldErrors: zodFieldErrors(error, t) };
  }
  if (error instanceof AppError) {
    if (error.code === "unknown") logger.error(event, { error });
    return { status: "error", message: t.errors.codes[error.code] };
  }
  logger.error(event, { error });
  return { status: "error", message: t.errors.codes.unknown };
}

function isNextControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK") || digest === "NEXT_NOT_FOUND");
}
