/** Regional defaults used to prefill forms (the user can always change them). */
export const COUNTRY_DEFAULTS: Record<string, { currency: string; timezone: string; locale: "pt-BR" | "en" }> = {
  BR: { currency: "BRL", timezone: "America/Sao_Paulo", locale: "pt-BR" },
  CA: { currency: "CAD", timezone: "America/Toronto", locale: "en" },
  US: { currency: "USD", timezone: "America/New_York", locale: "en" },
  PT: { currency: "EUR", timezone: "Europe/Lisbon", locale: "pt-BR" },
  MX: { currency: "MXN", timezone: "America/Mexico_City", locale: "en" },
  AR: { currency: "ARS", timezone: "America/Argentina/Buenos_Aires", locale: "en" },
  CL: { currency: "CLP", timezone: "America/Santiago", locale: "en" },
  CO: { currency: "COP", timezone: "America/Bogota", locale: "en" },
  GB: { currency: "GBP", timezone: "Europe/London", locale: "en" },
  OTHER: { currency: "USD", timezone: "UTC", locale: "en" },
};

export function timeZoneOptions(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["UTC", ...new Set(Object.values(COUNTRY_DEFAULTS).map((d) => d.timezone))];
  }
}
