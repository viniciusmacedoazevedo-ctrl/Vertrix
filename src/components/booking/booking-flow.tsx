"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck2, Loader2 } from "lucide-react";
import { ActionForm, CheckboxField, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { createPublicBookingAction } from "@/actions/booking";
import { addDays, isoWeekday } from "@/lib/domain/datetime";
import { formatMoney } from "@/lib/domain/format";
import { format } from "@/lib/i18n/config";
import type { BookingPage } from "@/lib/services/public/booking";
import { cn } from "@/lib/cn";

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function BookingFlow({ page, firstDate, lastDate }: { page: BookingPage; firstDate: string; lastDate: string }) {
  const { t, locale } = useI18n();
  const b = t.booking;
  const org = page.organization;
  const [serviceId, setServiceId] = useState<string | null>(page.services.length === 1 ? page.services[0]!.id : null);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [date, setDate] = useState(firstDate);
  const [slot, setSlot] = useState<string | null>(null);
  const [slots, setSlots] = useState<{ start: string }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [booked, setBooked] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(newKey);
  const [reload, setReload] = useState(0);

  const service = page.services.find((s) => s.id === serviceId);
  const pros = page.professionals.filter((p) => serviceId && p.service_ids.includes(serviceId));
  const pro = pros.find((p) => p.id === professionalId);

  useEffect(() => {
    if (pros.length === 1) setProfessionalId(pros[0]!.id);
    else if (!pros.some((p) => p.id === professionalId)) setProfessionalId(null);
  }, [serviceId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSlot(null);
    if (!serviceId || !professionalId || !date) {
      setSlots(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    fetch(`/api/public/booking/${org.slug}/slots?${new URLSearchParams({ date, serviceId, professionalId })}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((body: { slots: { start: string }[] }) => setSlots(body.slots))
      .catch((e) => {
        if ((e as Error).name !== "AbortError") {
          setFailed(true);
          setSlots(null);
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [org.slug, serviceId, professionalId, date, reload]);

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(firstDate, i)).filter((d) => d <= lastDate), [firstDate, lastDate]);
  const timeFmt = new Intl.DateTimeFormat(locale, { timeStyle: "short", timeZone: org.timezone });
  const dateTimeFmt = new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "short", timeZone: org.timezone });

  if (booked && service && pro) {
    return (
      <div className="animate-rise rounded-2xl border border-success/30 bg-surface p-8 text-center" role="status">
        <CalendarCheck2 className="mx-auto size-10 text-success" aria-hidden />
        <h2 className="mt-4 text-xl font-semibold">{b.successTitle}</h2>
        <p className="mt-2 text-fg-muted">
          {format(b.successBody, { service: service.name, professional: pro.name, datetime: dateTimeFmt.format(new Date(booked)) })}
        </p>
        <p className="mt-4 text-sm text-fg-subtle">{format(b.successNote, { name: org.name })}</p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => {
            setBooked(null);
            setSlot(null);
            setIdempotencyKey(newKey());
            setReload((n) => n + 1);
          }}
        >
          {b.bookAnother}
        </Button>
      </div>
    );
  }

  if (page.services.length === 0) {
    return <p className="rounded-2xl border border-border bg-surface p-8 text-center text-fg-muted">{b.noServices}</p>;
  }

  const step = "mb-3 flex items-center gap-2 text-sm font-semibold";
  const num = "grid size-6 place-items-center rounded-full bg-accent-soft font-mono text-xs text-accent";

  return (
    <div className="space-y-6">
      <section aria-labelledby="step-service" className="rounded-2xl border border-border bg-surface p-5">
        <h2 id="step-service" className={step}><span className={num}>1</span>{b.chooseService}</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {page.services.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={s.id === serviceId}
              onClick={() => setServiceId(s.id)}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                s.id === serviceId ? "border-accent bg-accent-soft" : "border-border-strong bg-bg-elevated hover:border-accent/50",
              )}
            >
              <span className="block font-medium">{s.name}</span>
              <span className="mt-0.5 block text-xs text-fg-subtle">
                {format(b.minutes, { count: s.duration_minutes })}
                {s.price !== null && ` · ${formatMoney(s.price, org.currency, locale)}`}
              </span>
              {s.description && <span className="mt-1 block text-xs text-fg-muted">{s.description}</span>}
            </button>
          ))}
        </div>
      </section>

      {serviceId && (
        <section aria-labelledby="step-pro" className="animate-fade-in rounded-2xl border border-border bg-surface p-5">
          <h2 id="step-pro" className={step}><span className={num}>2</span>{b.chooseProfessional}</h2>
          <div className="flex flex-wrap gap-2">
            {pros.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={p.id === professionalId}
                onClick={() => setProfessionalId(p.id)}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm transition-colors",
                  p.id === professionalId ? "border-accent bg-accent-soft text-fg" : "border-border-strong text-fg-muted hover:border-accent/50",
                )}
              >
                {p.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {serviceId && professionalId && (
        <section aria-labelledby="step-time" className="animate-fade-in rounded-2xl border border-border bg-surface p-5">
          <h2 id="step-time" className={step}><span className={num}>3</span>{b.chooseDate}</h2>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            {days.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={d === date}
                onClick={() => setDate(d)}
                className={cn(
                  "flex w-14 shrink-0 flex-col items-center rounded-lg border py-2 transition-colors",
                  d === date ? "border-accent bg-accent text-accent-fg" : "border-border-strong text-fg-muted hover:border-accent/50",
                )}
              >
                <span className="text-[11px] uppercase">{t.scheduling.weekdaysShort[isoWeekday(d) as 1]}</span>
                <span className="text-base font-semibold tabular-nums">{Number(d.slice(8))}</span>
              </button>
            ))}
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs text-fg-subtle">
            {b.chooseDate}:
            <input
              type="date"
              value={date}
              min={firstDate}
              max={lastDate}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="h-8 rounded-md border border-border-strong bg-bg-elevated px-2 text-fg"
            />
          </label>

          <h3 className="mb-2 mt-5 flex items-center gap-2 text-[13px] font-medium text-fg-muted">
            {b.chooseTime}
            {loading && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          </h3>
          {failed ? (
            <p className="text-sm text-danger" role="alert">{b.slotsError}</p>
          ) : loading && !slots ? (
            <p className="text-sm text-fg-subtle">{b.loadingSlots}</p>
          ) : slots && slots.length === 0 ? (
            <p className="text-sm text-fg-subtle">{b.noSlots}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" role="listbox" aria-label={b.chooseTime}>
              {slots?.map((s) => (
                <button
                  key={s.start}
                  type="button"
                  role="option"
                  aria-selected={s.start === slot}
                  onClick={() => setSlot(s.start)}
                  className={cn(
                    "rounded-lg border py-2 font-mono text-sm tabular-nums transition-colors",
                    s.start === slot ? "border-accent bg-accent text-accent-fg" : "border-border-strong text-fg-muted hover:border-accent/50 hover:text-fg",
                  )}
                >
                  {timeFmt.format(new Date(s.start))}
                </button>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-fg-subtle">{format(b.timezoneNote, { tz: org.timezone.replace(/_/g, " ") })}</p>
        </section>
      )}

      {slot && service && pro && (
        <section aria-labelledby="step-details" className="animate-fade-in rounded-2xl border border-border bg-surface p-5">
          <h2 id="step-details" className={step}><span className={num}>4</span>{b.steps.details}</h2>
          <p className="mb-4 rounded-lg border border-accent/30 bg-accent-soft px-3 py-2 text-sm">
            {service.name} · {pro.name} · {dateTimeFmt.format(new Date(slot))}
          </p>
          <ActionForm
            action={createPublicBookingAction.bind(null, org.slug)}
            className="space-y-4"
            onSuccess={(state) => {
              if (state.status === "success" && state.data?.startsAt) setBooked(state.data.startsAt);
            }}
          >
            <input type="hidden" name="serviceId" value={service.id} />
            <input type="hidden" name="professionalId" value={pro.id} />
            <input type="hidden" name="startsAt" value={slot} />
            <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label={b.fullName} name="fullName" autoComplete="name" required fieldClassName="sm:col-span-2" />
              <TextField label={b.email} name="email" type="email" autoComplete="email" required />
              <TextField label={b.phone} name="phone" type="tel" autoComplete="tel" optionalLabel={t.common.optional} />
            </div>
            <TextAreaField label={b.notes} name="notes" rows={2} maxLength={500} />
            <CheckboxField name="consent" label={format(b.consent, { name: org.name })} />
            <SubmitButton size="lg" className="w-full" pendingLabel={b.submitting}>{b.submit}</SubmitButton>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
