import { describe, expect, it } from "vitest";
import {
  addDays, isDateString, isoWeekday, parseLocalDateTime, startOfWeek, todayInTimeZone, zonedDayRange,
} from "@/lib/domain/datetime";
import { slugify } from "@/lib/domain/slug";
import { canTransition } from "@/lib/domain/appointments";
import { matchAcceptLanguage, format } from "@/lib/i18n/config";

describe("datetime helpers", () => {
  it("validates calendar dates", () => {
    expect(isDateString("2026-02-28")).toBe(true);
    expect(isDateString("2026-02-30")).toBe(false);
    expect(isDateString("2026-2-3")).toBe(false);
  });

  it("computes weekdays and week starts", () => {
    expect(isoWeekday("2026-10-11")).toBe(7);
    expect(startOfWeek("2026-10-11")).toBe("2026-10-05");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("resolves today and day ranges in the organization's zone", () => {
    const late = new Date("2026-10-11T02:00:00Z");
    expect(todayInTimeZone("America/Sao_Paulo", late)).toBe("2026-10-10");
    expect(todayInTimeZone("UTC", late)).toBe("2026-10-11");
    const range = zonedDayRange("2026-10-10", "America/Sao_Paulo");
    expect(range.start.toISOString()).toBe("2026-10-10T03:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-10-11T03:00:00.000Z");
  });

  it("parses datetime-local values in a zone", () => {
    expect(parseLocalDateTime("2026-10-10T09:30", "America/Toronto")?.toISOString()).toBe("2026-10-10T13:30:00.000Z");
    expect(parseLocalDateTime("bad", "UTC")).toBeNull();
  });
});

describe("misc domain", () => {
  it("slugifies names with accents", () => {
    expect(slugify("Barbearia São João!")).toBe("barbearia-sao-joao");
    expect(slugify("A")).toMatch(/^a-[a-z0-9]{1,5}$/);
  });

  it("restricts appointment transitions", () => {
    expect(canTransition("scheduled", "completed")).toBe(true);
    expect(canTransition("cancelled", "scheduled")).toBe(false);
    expect(canTransition("completed", "cancelled")).toBe(false);
  });

  it("negotiates locale and formats messages", () => {
    expect(matchAcceptLanguage("en-CA,en;q=0.9")).toBe("en");
    expect(matchAcceptLanguage("fr-CA,pt;q=0.5")).toBe("pt-BR");
    expect(matchAcceptLanguage("de")).toBe("pt-BR");
    expect(format("{n} clientes", { n: 3 })).toBe("3 clientes");
  });
});
