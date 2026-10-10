import { describe, expect, it } from "vitest";
import { reminderSchedule } from "@/lib/domain/reminders";

describe("reminderSchedule", () => {
  it("plans future reminders only, deduplicated and ordered", () => {
    const start = new Date("2026-10-12T13:00:00Z");
    const now = new Date("2026-10-12T10:00:00Z");
    expect(reminderSchedule(start, [60, 1440, 60, 0], now)).toEqual([
      { offsetMinutes: 60, sendAt: new Date("2026-10-12T12:00:00Z") },
    ]);
  });
});
