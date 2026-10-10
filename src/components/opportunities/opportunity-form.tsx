"use client";

import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import { LinkButton } from "@/components/ui/button";
import { useT } from "@/components/i18n-provider";
import { ALL_STAGES } from "@/lib/domain/followup";
import { PRIORITIES } from "@/lib/validation/schemas";
import type { ActionState } from "@/lib/action-state";

export interface OpportunityFormValues {
  title: string;
  customerId: string;
  estimatedValue: string;
  stage: string;
  priority: string;
  nextAction: string;
  followUpOn: string;
  notes: string;
  ownerId: string;
}

export function OpportunityForm({
  action,
  defaults,
  customers,
  members,
  currency,
  cancelHref,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: Partial<OpportunityFormValues>;
  customers: { id: string; full_name: string; company_name: string | null }[];
  members: { id: string; name: string }[];
  currency: string;
  cancelHref: string;
}) {
  const t = useT();
  const f = t.opportunities.fields;
  return (
    <ActionForm action={action} className="space-y-5">
      <TextField label={f.title} name="title" defaultValue={defaults?.title} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label={f.customer}
          name="customerId"
          defaultValue={defaults?.customerId ?? ""}
          placeholder="—"
          options={customers.map((c) => ({ value: c.id, label: c.company_name ? `${c.full_name} · ${c.company_name}` : c.full_name }))}
          required
        />
        <TextField
          label={`${f.estimatedValue} (${currency})`}
          name="estimatedValue"
          inputMode="decimal"
          defaultValue={defaults?.estimatedValue}
          optionalLabel={t.common.optional}
          placeholder="0,00"
        />
        <SelectField
          label={f.stage}
          name="stage"
          defaultValue={defaults?.stage ?? "new"}
          options={ALL_STAGES.map((s) => ({ value: s, label: t.opportunities.stages[s] }))}
        />
        <SelectField
          label={f.priority}
          name="priority"
          defaultValue={defaults?.priority ?? "medium"}
          options={PRIORITIES.map((p) => ({ value: p, label: t.common.priority[p] }))}
        />
        <TextField label={f.nextAction} name="nextAction" defaultValue={defaults?.nextAction} optionalLabel={t.common.optional} fieldClassName="sm:col-span-2" />
        <TextField label={f.followUpOn} name="followUpOn" type="date" defaultValue={defaults?.followUpOn} optionalLabel={t.common.optional} />
        {members.length > 1 && (
          <SelectField
            label={f.owner}
            name="ownerId"
            defaultValue={defaults?.ownerId ?? ""}
            placeholder={t.opportunities.unassigned}
            options={members.map((m) => ({ value: m.id, label: m.name }))}
          />
        )}
      </div>
      <TextAreaField label={f.notes} name="notes" defaultValue={defaults?.notes} rows={4} optionalLabel={t.common.optional} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <LinkButton href={cancelHref} variant="ghost">{t.common.cancel}</LinkButton>
        <SubmitButton pendingLabel={t.common.saving}>{t.common.save}</SubmitButton>
      </div>
    </ActionForm>
  );
}
