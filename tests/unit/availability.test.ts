import { describe, expect, it } from "vitest";
import { computeAvailableSlots, type SlotQuery } from "@/lib/domain/availability";

const base: SlotQuery = {
  date: "2026-10-12", // Monday
  timeZone: "America/Sao_Paulo", // UTC-3, no DST
  workingHours: [
    { weekday: 1, start_time: "09:00:00", end_time: "12:00:00" },
    { weekday: 1, start_time: "13:00:00", end_time: "15:00:00" },
  ],
  busy: [],
  durationMinutes: 60,
  intervalMinutes: 30,
  minNoticeMinutes: 0,
  maxDaysAhead: 30,
  now: new Date("2026-10-10T12:00:00Z"),
  today: "2026-10-10",
};

describe("computeAvailableSlots", () => {
  it("generates slots that fit inside each working window (breaks respected)", () => {
    const slots = computeAvailableSlots(base);
    expect(slots.map((s) => s.start)).toEqual([
      "2026-10-12T12:00:00.000Z", // 09:00 local
      "2026-10-12T12:30:00.000Z",
      "2026-10-12T13:00:00.000Z",
      "2026-10-12T13:30:00.000Z",
      "2026-10-12T14:00:00.000Z", // 11:00-12:00 local, last before break
      "2026-10-12T16:00:00.000Z", // 13:00 local
      "2026-10-12T16:30:00.000Z",
      "2026-10-12T17:00:00.000Z", // 14:00-15:00
    ]);
    expect(slots[0]?.end).toBe("2026-10-12T13:00:00.000Z");
  });

  it("removes slots overlapping busy intervals", () => {
    const slots = computeAvailableSlots({
      ...base,
      busy: [{ starts_at: "2026-10-12T12:30:00Z", ends_at: "2026-10-12T13:30:00Z" }],
    });
    const starts = slots.map((s) => s.start);
    expect(starts).not.toContain("2026-10-12T12:00:00.000Z");
    expect(starts).not.toContain("2026-10-12T12:30:00.000Z");
    expect(starts).not.toContain("2026-10-12T13:00:00.000Z");
    expect(starts).toContain("2026-10-12T13:30:00.000Z"); // starts exactly when busy ends
  });

  it("returns nothing on days without working hours", () => {
    expect(computeAvailableSlots({ ...base, date: "2026-10-13" })).toEqual([]);
  });

  it("enforces minimum notice and booking horizon", () => {
    const now = new Date("2026-10-12T12:10:00Z");
    const slots = computeAvailableSlots({ ...base, now, today: "2026-10-12", minNoticeMinutes: 60 });
    expect(slots[0]?.start).toBe("2026-10-12T13:30:00.000Z");
    expect(computeAvailableSlots({ ...base, maxDaysAhead: 1 })).toEqual([]);
    expect(computeAvailableSlots({ ...base, date: "2026-10-09" })).toEqual([]);
  });

  it("is DST-safe (Toronto, fall back on 2026-11-01)", () => {
    const slots = computeAvailableSlots({
      ...base,
      timeZone: "America/Toronto",
      date: "2026-11-01", // Sunday
      today: "2026-10-30",
      now: new Date("2026-10-30T12:00:00Z"),
      workingHours: [{ weekday: 7, start_time: "09:00", end_time: "10:00" }],
    });
    // 09:00 EST = 14:00 UTC after the change
    expect(slots.map((s) => s.start)).toEqual(["2026-11-01T14:00:00.000Z"]);
  });

  it("supports working until midnight (24:00)", () => {
    const slots = computeAvailableSlots({
      ...base,
      workingHours: [{ weekday: 1, start_time: "22:00", end_time: "24:00" }],
      intervalMinutes: 60,
    });
    expect(slots.map((s) => s.start)).toEqual(["2026-10-13T01:00:00.000Z", "2026-10-13T02:00:00.000Z"]);
  });
});
