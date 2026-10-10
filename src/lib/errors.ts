export const ERROR_CODES = [
  "duplicate_email",
  "slot_conflict",
  "outside_working_hours",
  "invalid_transition",
  "forbidden",
  "not_found",
  "rate_limited",
  "validation",
  "unknown",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

/** Expected, user-presentable failure. The message shown to users comes from i18n, never from the database. */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    detail?: string,
  ) {
    super(detail ?? code);
    this.name = "AppError";
  }
}

interface DbErrorLike {
  code?: string;
  message?: string;
  details?: string | null;
}

/** Maps PostgREST / Postgres errors to stable application codes. */
export function fromDbError(error: DbErrorLike): AppError {
  const text = `${error.message ?? ""} ${error.details ?? ""}`;
  switch (error.code) {
    case "23505":
      if (text.includes("customers_org_email_active_key")) return new AppError("duplicate_email");
      return new AppError("validation", "duplicate");
    case "23P01":
      return new AppError("slot_conflict");
    case "42501":
      return new AppError("forbidden");
    case "PGRST116":
      return new AppError("not_found");
    case "54000":
      return new AppError(text.includes("rate_limited") ? "rate_limited" : "validation", text);
    case "23503":
    case "23514":
    case "22023":
    case "22P02":
      return new AppError("validation", text);
    default:
      return new AppError("unknown", text);
  }
}

/** Throws a mapped AppError when a Supabase response carries an error. */
export function unwrap<R extends { data: unknown; error: DbErrorLike | null }>(
  result: R,
): Extract<R, { error: null }>["data"] {
  if (result.error) throw fromDbError(result.error);
  return result.data as Extract<R, { error: null }>["data"];
}

/** Like unwrap, for list queries: returns an empty array instead of null. */
export function unwrapList<T>(result: { data: T[] | null; error: DbErrorLike | null }): T[] {
  if (result.error) throw fromDbError(result.error);
  return result.data ?? [];
}
