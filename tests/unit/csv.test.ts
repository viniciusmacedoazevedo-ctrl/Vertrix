import { describe, expect, it } from "vitest";
import { escapeCell, toCsv } from "@/lib/domain/csv";

describe("csv", () => {
  it("escapes quotes, commas and newlines", () => {
    expect(escapeCell('a "b", c')).toBe('"a ""b"", c"');
    expect(escapeCell("line\nbreak")).toBe('"line\nbreak"');
    expect(escapeCell(null)).toBe("");
    expect(escapeCell(42)).toBe("42");
  });

  it("neutralizes spreadsheet formulas", () => {
    expect(escapeCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(escapeCell("@cmd")).toBe("'@cmd");
    expect(escapeCell(-5)).toBe("-5"); // numbers stay numbers
  });

  it("builds a UTF-8 CSV with BOM and CRLF", () => {
    const csv = toCsv([{ name: "João", total: 3 }], [
      { header: "Nome", value: (r) => r.name },
      { header: "Total", value: (r) => r.total },
    ]);
    expect(csv).toBe("﻿Nome,Total\r\nJoão,3\r\n");
  });
});
