import { addDays, daysBetween, isoWeekday, timeToMinutes, zonedMinutesToUtc, type DateString } from "./datetime";

export interface WorkingWindow {
  weekday: number; // ISO 1..7
  start_time: string; // HH:MM[:SS]
  end_time: string;
}

export interface BusyInterval {
  starts_at: string;
  ends_at: string;
}

export interface SlotQuery {
  date: DateString;
  timeZone: string;
  workingHours: WorkingWindow[];
  busy: BusyInterval[];
  durationMinutes: number;
  intervalMinutes: number;
  minNoticeMinutes: number;
  maxDaysAhead: number;
  now: Date;
  today: DateString; // today's date in the organization's time zone
}

export interface Slot {
  start: string; // ISO UTC
  end: string;
}

/**
 * Bookable slots for one professional on one local date.
 * Slots are generated on the wall clock of the organization's time zone (DST-safe),
 * must fit entirely inside a working window, respect minimum notice and booking
 * horizon, and must not overlap any busy interval (appointments or time off).
 */
export function computeAvailableSlots(q: SlotQuery): Slot[] {
  if (q.durationMinutes <= 0 || q.intervalMinutes <= 0) return [];
  const offset = daysBetween(q.today, q.date);
  if (offset < 0 || offset > q.maxDaysAhead) return [];

  const weekday = isoWeekday(q.date);
  const earliest = q.now.getTime() + q.minNoticeMinutes * 60_000;
  const horizon = q.now.getTime() + q.maxDaysAhead * 86_400_000;
  const busy = q.busy
    .map((b) => ({ start: Date.parse(b.starts_at), end: Date.parse(b.ends_at) }))
    .filter((b) => Number.isFinite(b.start) && Number.isFinite(b.end));

  const windows = q.workingHours
    .filter((w) => w.weekday === weekday)
    .map((w) => ({ start: timeToMinutes(w.start_time), end: timeToMinutes(w.end_time) }))
    .sort((a, b) => a.start - b.start);

  const slots: Slot[] = [];
  const seen = new Set<string>();
  for (const window of windows) {
    for (let m = window.start; m + q.durationMinutes <= window.end; m += q.intervalMinutes) {
      const start = zonedMinutesToUtc(q.date, m, q.timeZone);
      const end = zonedMinutesToUtc(q.date, m + q.durationMinutes, q.timeZone);
      const s = start.getTime();
      const e = end.getTime();
      if (e <= s) continue; // DST gap
      if (s < earliest || s > horizon) continue;
      if (busy.some((b) => b.start < e && b.end > s)) continue;
      const key = start.toISOString();
      if (seen.has(key)) continue; // DST overlap can repeat a wall-clock time
      seen.add(key);
      slots.push({ start: key, end: end.toISOString() });
    }
  }
  return slots.sort((a, b) => a.start.localeCompare(b.start));
}

/** Local dates [from, from + days) as strings. */
export function dateSeries(from: DateString, days: number): DateString[] {
  return Array.from({ length: days }, (_, i) => addDays(from, i));
}

/**
 * Whether [start, end) (UTC instants) fits within one working window of the local day
 * and does not touch any busy interval. Used to validate manual bookings.
 */
export function fitsSchedule(params: {
  start: Date;
  end: Date;
  timeZone: string;
  localDate: DateString;
  localStartMinutes: number;
  workingHours: WorkingWindow[];
  busy: BusyInterval[];
}): { withinHours: boolean; conflict: boolean } {
  const duration = Math.round((params.end.getTime() - params.start.getTime()) / 60_000);
  const startMin = params.localStartMinutes;
  const endMin = startMin + duration;
  const weekday = isoWeekday(params.localDate);
  const withinHours = params.workingHours.some(
    (w) => w.weekday === weekday && timeToMinutes(w.start_time) <= startMin && timeToMinutes(w.end_time) >= endMin,
  );
  const s = params.start.getTime();
  const e = params.end.getTime();
  const conflict = params.busy.some((b) => Date.parse(b.starts_at) < e && Date.parse(b.ends_at) > s);
  return { withinHours, conflict };
}
