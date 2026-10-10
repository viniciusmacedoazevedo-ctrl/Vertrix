import type { Locale } from "@/lib/i18n/config";

export function formatMoney(value: number | string | null | undefined, currency: string, locale: Locale): string {
  if (value === null || value === undefined || value === "") return "—";
  const amount = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatDate(value: string | Date, locale: Locale, timeZone: string, opts?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone, ...opts }).format(
    typeof value === "string" ? new Date(value) : value,
  );
}

export function formatDateTime(value: string | Date, locale: Locale, timeZone: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }).format(
    typeof value === "string" ? new Date(value) : value,
  );
}

export function formatTime(value: string | Date, locale: Locale, timeZone: string) {
  return new Intl.DateTimeFormat(locale, { timeStyle: "short", timeZone }).format(
    typeof value === "string" ? new Date(value) : value,
  );
}

/** Formats a plain calendar date (YYYY-MM-DD) without shifting it through time zones. */
export function formatCalendarDate(date: string, locale: Locale, opts?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC", ...opts }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

export function formatRelativeDays(days: number, locale: Locale): string {
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(days, "day");
}

export function formatRelativeTime(value: string | Date, locale: Locale, now: Date = new Date()): string {
  const diff = (new Date(value).getTime() - now.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), "month");
  return rtf.format(Math.round(diff / (86400 * 365)), "year");
}
