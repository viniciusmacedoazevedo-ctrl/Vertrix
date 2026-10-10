import { describe, expect, it } from "vitest";
import { getMessages } from "@/lib/i18n/messages";

function shape(value: unknown, path = ""): string[] {
  if (Array.isArray(value)) return [`${path}[]`];
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k));
  return [path];
}

function placeholders(value: unknown, path = "", out = new Map<string, string>()) {
  if (typeof value === "string") out.set(path, [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(","));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) placeholders(v, `${path}.${k}`, out);
  return out;
}

describe("dictionaries", () => {
  const pt = getMessages("pt-BR");
  const en = getMessages("en");

  it("have identical key structure", () => {
    expect(shape(en).sort()).toEqual(shape(pt).sort());
  });

  it("use the same interpolation placeholders", () => {
    const a = placeholders(pt);
    const b = placeholders(en);
    for (const [key, vars] of a) expect(b.get(key), key).toBe(vars);
  });

  it("contain no empty strings", () => {
    for (const dict of [pt, en]) {
      for (const [key, vars] of placeholders(dict)) {
        expect(key.length).toBeGreaterThan(0);
        void vars;
      }
      expect(JSON.stringify(dict)).not.toMatch(/:""/);
    }
  });
});
