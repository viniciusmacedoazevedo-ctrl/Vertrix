"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Target } from "lucide-react";
import { SelectField, TextField, useFieldError } from "@/components/ui/form";
import { COUNTRIES, CURRENCIES, MODULES, SEGMENTS } from "@/lib/validation/schemas";
import { COUNTRY_DEFAULTS } from "@/lib/regional";
import { LOCALES } from "@/lib/i18n/config";
import { useT } from "@/components/i18n-provider";
import { cn } from "@/lib/cn";

export interface OrganizationDefaults {
  name: string;
  segment: string;
  country: string;
  locale: string;
  currency: string;
  timezone: string;
  modules: string[];
}

/** Shared by onboarding and settings. Country changes suggest currency/time zone until the user edits them. */
export function OrganizationFields({
  defaults,
  timeZones,
  labels,
  detectTimeZone = false,
  disabled = false,
}: {
  defaults: OrganizationDefaults;
  timeZones: string[];
  labels: { name: string; segment: string; country: string; locale: string; currency: string; timezone: string; modules: string };
  detectTimeZone?: boolean;
  disabled?: boolean;
}) {
  const t = useT();
  const [country, setCountry] = useState(defaults.country);
  const [currency, setCurrency] = useState(defaults.currency);
  const [timezone, setTimezone] = useState(defaults.timezone);
  const [locale, setLocale] = useState(defaults.locale);
  const [modules, setModules] = useState<string[]>(defaults.modules);
  const modulesError = useFieldError("modules");

  useEffect(() => {
    if (!detectTimeZone) return;
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && timeZones.includes(detected)) setTimezone(detected);
  }, [detectTimeZone, timeZones]);

  function onCountry(value: string) {
    setCountry(value);
    const d = COUNTRY_DEFAULTS[value];
    if (d) {
      setCurrency(d.currency);
      setTimezone(d.timezone);
      setLocale(d.locale);
    }
  }

  const moduleIcons = { sales: Target, scheduling: CalendarCheck } as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField label={labels.name} name="name" defaultValue={defaults.name} required fieldClassName="sm:col-span-2" disabled={disabled} />
      <SelectField
        label={labels.segment}
        name="segment"
        defaultValue={defaults.segment}
        options={SEGMENTS.map((s) => ({ value: s, label: t.options.segments[s] }))}
        disabled={disabled}
      />
      <SelectField
        label={labels.country}
        name="country"
        value={country}
        onChange={(e) => onCountry(e.target.value)}
        options={COUNTRIES.map((c) => ({ value: c, label: t.options.countries[c] }))}
        disabled={disabled}
      />
      <SelectField
        label={labels.locale}
        name="locale"
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
        options={LOCALES.map((l) => ({ value: l, label: t.common.locales[l] }))}
        disabled={disabled}
      />
      <SelectField
        label={labels.currency}
        name="currency"
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        options={CURRENCIES.map((c) => ({ value: c, label: c }))}
        disabled={disabled}
      />
      <SelectField
        label={labels.timezone}
        name="timezone"
        value={timezone}
        onChange={(e) => setTimezone(e.target.value)}
        options={timeZones.map((z) => ({ value: z, label: z.replace(/_/g, " ") }))}
        fieldClassName="sm:col-span-2"
        disabled={disabled}
      />
      <fieldset className="sm:col-span-2" disabled={disabled}>
        <legend className="text-[13px] font-medium text-fg-muted">{labels.modules}</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {MODULES.map((m) => {
            const Icon = moduleIcons[m];
            const checked = modules.includes(m);
            return (
              <label
                key={m}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors",
                  checked ? "border-accent/60 bg-accent-soft" : "border-border-strong bg-bg-elevated hover:border-border-strong/80",
                )}
              >
                <input
                  type="checkbox"
                  name="modules"
                  value={m}
                  checked={checked}
                  onChange={(e) => setModules((prev) => (e.target.checked ? [...prev, m] : prev.filter((x) => x !== m)))}
                  className="mt-1 size-4 accent-[var(--color-accent)]"
                />
                <span>
                  <span className="flex items-center gap-2 text-sm font-medium text-fg">
                    <Icon className="size-4 text-accent" aria-hidden />
                    {t.options.modules[m].title}
                  </span>
                  <span className="mt-1 block text-xs text-fg-subtle">{t.options.modules[m].body}</span>
                </span>
              </label>
            );
          })}
        </div>
        {modulesError && <p className="mt-2 text-xs text-danger">{modulesError}</p>}
      </fieldset>
    </div>
  );
}
