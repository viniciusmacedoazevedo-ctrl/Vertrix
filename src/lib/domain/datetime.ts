import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

/** Calendar date string in the form YYYY-MM-DD. */
export type DateString = string;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(value: unknown): value is DateString {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function todayInTimeZone(timeZone: string, now: Date = new Date()): DateString {
  return formatInTimeZone(now, timeZone, "yyyy-MM-dd");
}

export function addDays(date: DateString, days: number): DateString {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: DateString): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day === 0 ? 7 : day;
}

export function startOfWeek(date: DateString): DateString {
  return addDays(date, 1 - isoWeekday(date));
}

export function startOfMonth(date: DateString): DateString {
  return `${date.slice(0, 7)}-01`;
}

export function addMonths(date: DateString, months: number): DateString {
  const [y, m] = date.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1 + months, 1)).toISOString().slice(0, 10);
}

export function daysBetween(from: DateString, to: DateString): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** Converts a wall-clock time (minutes after local midnight) on a date in a zone to a UTC instant. */
export function zonedMinutesToUtc(date: DateString, minutes: number, timeZone: string): Date {
  const day = addDays(date, Math.floor(minutes / 1440));
  const rest = ((minutes % 1440) + 1440) % 1440;
  const hh = String(Math.floor(rest / 60)).padStart(2, "0");
  const mm = String(rest % 60).padStart(2, "0");
  return fromZonedTime(`${day}T${hh}:${mm}:00`, timeZone);
}

/** UTC instants bounding a local calendar day: [start, end). */
export function zonedDayRange(date: DateString, timeZone: string): { start: Date; end: Date } {
  return { start: zonedMinutesToUtc(date, 0, timeZone), end: zonedMinutesToUtc(addDays(date, 1), 0, timeZone) };
}

/** UTC range covering local days [from, toExclusive). */
export function zonedRange(from: DateString, toExclusive: DateString, timeZone: string) {
  return { start: zonedMinutesToUtc(from, 0, timeZone), end: zonedMinutesToUtc(toExclusive, 0, timeZone) };
}

export function localDateOf(instant: Date | string, timeZone: string): DateString {
  return formatInTimeZone(typeof instant === "string" ? new Date(instant) : instant, timeZone, "yyyy-MM-dd");
}

/** Minutes after local midnight of an instant in a zone. */
export function localMinutesOf(instant: Date | string, timeZone: string): number {
  const hhmm = formatInTimeZone(typeof instant === "string" ? new Date(instant) : instant, timeZone, "HH:mm");
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

/** "HH:MM[:SS]" → minutes. "24:00" is accepted as end of day. */
export function timeToMinutes(time: string): number {
  const [h = "0", m = "0"] = time.split(":");
  return Number(h) * 60 + Number(m);
}

export function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Parses a datetime-local input ("YYYY-MM-DDTHH:mm") interpreted in the organization's zone. */
export function parseLocalDateTime(value: string, timeZone: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = fromZonedTime(`${value}:00`, timeZone);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toLocalInputValue(instant: Date | string, timeZone: string): string {
  return formatInTimeZone(typeof instant === "string" ? new Date(instant) : instant, timeZone, "yyyy-MM-dd'T'HH:mm");
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}
