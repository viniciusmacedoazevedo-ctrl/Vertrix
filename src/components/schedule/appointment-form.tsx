"use client";

import { useEffect, useState } from "react";
import { Info, Loader2 } from "lucide-react";
import { ActionForm, CheckboxField, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import { LinkButton } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { format } from "@/lib/i18n/config";
import type { ActionState } from "@/lib/action-state";
import { cn } from "@/lib/cn";

interface Option {
  id: string;
  name: string;
}

export function AppointmentForm({
  action,
  customers,
  services,
  professionals,
  defaults,
  timeZone,
  cancelHref,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  customers: { id: string; full_name: string }[];
  services: (Option & { duration_minutes: number })[];
  professionals: (Option & { serviceIds: string[] })[];
  defaults: { customerId?: string; serviceId?: string; professionalId?: string; date: string; time?: string; notes?: string };
  timeZone: string;
  cancelHref: string;
}) {
  const { t, locale } = useI18n();
  const a = t.scheduling.appointment;
  const [serviceId, setServiceId] = useState(defaults.serviceId ?? services[0]?.id ?? "");
  const [professionalId, setProfessionalId] = useState(defaults.professionalId ?? "");
  const [date, setDate] = useState(defaults.date);
  const [time, setTime] = useState(defaults.time ?? "");
  const [slots, setSlots] = useState<{ start: string }[] | null>(null);
  const [loading, setLoading] = useState(false);

  const eligible = professionals.filter((p) => !serviceId || p.serviceIds.includes(serviceId));
  useEffect(() => {
    if (professionalId && !eligible.some((p) => p.id === professionalId)) setProfessionalId(eligible[0]?.id ?? "");
    if (!professionalId && eligible[0]) setProfessionalId(eligible[0].id);
  }, [serviceId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!date || !serviceId || !professionalId) {
      setSlots(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/schedule/slots?${new URLSearchParams({ date, serviceId, professionalId })}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((body: { slots: { start: string }[] }) => setSlots(body.slots))
      .catch((e) => {
        if ((e as Error).name !== "AbortError") setSlots([]);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [date, serviceId, professionalId]);

  const fmt = new Intl.DateTimeFormat(locale, { timeStyle: "short", timeZone });
  const toHHMM = (iso: string) =>
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).format(new Date(iso));
  const service = services.find((s) => s.id === serviceId);

  return (
    <ActionForm action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label={a.customer}
          name="customerId"
          defaultValue={defaults.customerId ?? ""}
          placeholder="—"
          options={customers.map((c) => ({ value: c.id, label: c.full_name }))}
          fieldClassName="sm:col-span-2"
        />
        <SelectField
          label={a.service}
          name="serviceId"
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          options={services.map((s) => ({ value: s.id, label: `${s.name} · ${format(a.minutes, { count: s.duration_minutes })}` }))}
        />
        <SelectField
          label={a.professional}
          name="professionalId"
          value={professionalId}
          onChange={(e) => setProfessionalId(e.target.value)}
          placeholder="—"
          options={eligible.map((p) => ({ value: p.id, label: p.name }))}
        />
        <TextField label={t.booking.chooseDate} name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <TextField label={a.startsAt} name="time" type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} required />
      </div>

      <div className="rounded-lg border border-border bg-surface-2 p-3">
        <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-fg-muted">
          {a.suggestedSlots}
          {loading && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          {service && <span className="font-normal text-fg-subtle">· {format(a.minutes, { count: service.duration_minutes })}</span>}
        </p>
        {slots === null ? (
          <p className="text-xs text-fg-subtle">{a.pickDate}</p>
        ) : slots.length === 0 && !loading ? (
          <p className="text-xs text-fg-subtle">{a.noSlots}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5" role="listbox" aria-label={a.suggestedSlots}>
            {slots.map((s) => {
              const value = toHHMM(s.start);
              return (
                <button
                  key={s.start}
                  type="button"
                  role="option"
                  aria-selected={value === time}
                  onClick={() => setTime(value)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 font-mono text-xs tabular-nums transition-colors",
                    value === time ? "border-accent bg-accent text-accent-fg" : "border-border-strong text-fg-muted hover:border-accent hover:text-fg",
                  )}
                >
                  {fmt.format(new Date(s.start))}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <TextAreaField label={a.notes} name="notes" defaultValue={defaults.notes} rows={3} optionalLabel={t.common.optional} />
      <CheckboxField label={<>{a.allowOutsideHours} <span className="text-fg-subtle">— {a.allowOutsideHoursHint}</span></>} name="allowOutsideHours" />
      <p className="flex items-start gap-2 text-xs text-fg-subtle">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {a.reminders}
      </p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <LinkButton href={cancelHref} variant="ghost">{t.common.cancel}</LinkButton>
        <SubmitButton pendingLabel={t.common.saving}>{t.common.save}</SubmitButton>
      </div>
    </ActionForm>
  );
}
