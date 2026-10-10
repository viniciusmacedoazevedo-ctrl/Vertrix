"use client";

import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import { LinkButton } from "@/components/ui/button";
import { useT } from "@/components/i18n-provider";
import { CUSTOMER_SOURCES } from "@/lib/validation/schemas";
import type { ActionState } from "@/lib/action-state";

export interface CustomerFormValues {
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  source: string;
  notes: string;
}

export function CustomerForm({
  action,
  defaults,
  cancelHref,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: Partial<CustomerFormValues>;
  cancelHref: string;
}) {
  const t = useT();
  const f = t.customers.fields;
  return (
    <ActionForm action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label={f.fullName} name="fullName" defaultValue={defaults?.fullName} autoComplete="off" required />
        <TextField label={f.companyName} name="companyName" defaultValue={defaults?.companyName} optionalLabel={t.common.optional} />
        <TextField label={f.email} name="email" type="email" defaultValue={defaults?.email} optionalLabel={t.common.optional} />
        <TextField label={f.phone} name="phone" type="tel" defaultValue={defaults?.phone} optionalLabel={t.common.optional} />
        <SelectField
          label={f.source}
          name="source"
          defaultValue={defaults?.source ?? ""}
          placeholder={t.common.notInformed}
          options={CUSTOMER_SOURCES.map((s) => ({ value: s, label: t.customers.sources[s] }))}
        />
      </div>
      <TextAreaField label={f.notes} name="notes" defaultValue={defaults?.notes} rows={4} optionalLabel={t.common.optional} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <LinkButton href={cancelHref} variant="ghost">{t.common.cancel}</LinkButton>
        <SubmitButton pendingLabel={t.common.saving}>{t.common.save}</SubmitButton>
      </div>
    </ActionForm>
  );
}
