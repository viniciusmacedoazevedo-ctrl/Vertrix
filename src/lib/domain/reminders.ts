/**
 * When reminders for an appointment would be due. Pure planning logic used by a
 * future scheduler; nothing is sent from here.
 */
export function reminderSchedule(
  startsAt: Date,
  offsetsMinutes: readonly number[],
  now: Date,
): { offsetMinutes: number; sendAt: Date }[] {
  return [...new Set(offsetsMinutes)]
    .filter((m) => m > 0)
    .sort((a, b) => b - a)
    .map((m) => ({ offsetMinutes: m, sendAt: new Date(startsAt.getTime() - m * 60_000) }))
    .filter((r) => r.sendAt > now);
}
