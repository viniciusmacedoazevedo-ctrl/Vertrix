"use client";

import { ActionForm, CheckboxField, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import { LinkButton } from "@/components/ui/button";
import { useT } from "@/components/i18n-provider";
import type { ActionState } from "@/lib/action-state";

export function ServiceForm({
  action,
  defaults,
  currency,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: { name: string; description: string; durationMinutes: number; price: string; active: boolean };
  currency: string;
}) {
  const t = useT();
  const s = t.scheduling.services;
  return (
    <ActionForm action={action} className="space-y-5">
      <TextField label={s.name} name="name" defaultValue={defaults?.name} required />
      <TextAreaField label={s.description} name="description" defaultValue={defaults?.description} rows={2} optionalLabel={t.common.optional} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label={s.duration} name="durationMinutes" type="number" min={5} max={720} step={5} defaultValue={defaults?.durationMinutes ?? 30} required />
        <TextField label={`${s.price} (${currency})`} name="price" inputMode="decimal" defaultValue={defaults?.price} optionalLabel={t.common.optional} placeholder="0,00" />
      </div>
      <CheckboxField label={s.active} name="active" defaultChecked={defaults?.active ?? true} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <LinkButton href="/app/schedule/services" variant="ghost">{t.common.cancel}</LinkButton>
        <SubmitButton pendingLabel={t.common.saving}>{t.common.save}</SubmitButton>
      </div>
    </ActionForm>
  );
}
