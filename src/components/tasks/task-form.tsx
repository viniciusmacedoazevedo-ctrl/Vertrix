"use client";

import { useState } from "react";
import { ActionForm, SelectField, SubmitButton, TextAreaField, TextField } from "@/components/ui/form";
import { LinkButton } from "@/components/ui/button";
import { useT } from "@/components/i18n-provider";
import { PRIORITIES } from "@/lib/validation/schemas";
import type { ActionState } from "@/lib/action-state";

export interface TaskFormValues {
  title: string;
  description: string;
  dueAt: string;
  priority: string;
  customerId: string;
  opportunityId: string;
  assigneeId: string;
}

export function TaskForm({
  action,
  defaults,
  customers,
  opportunities,
  members,
  cancelHref,
  returnTo,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: Partial<TaskFormValues>;
  customers: { id: string; full_name: string }[];
  opportunities: { id: string; title: string; customer_id: string }[];
  members: { id: string; name: string }[];
  cancelHref: string;
  returnTo?: string;
}) {
  const t = useT();
  const f = t.tasks.fields;
  const [customerId, setCustomerId] = useState(defaults?.customerId ?? "");
  const visibleOpps = customerId ? opportunities.filter((o) => o.customer_id === customerId) : opportunities;
  return (
    <ActionForm action={action} className="space-y-5">
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <TextField label={f.title} name="title" defaultValue={defaults?.title} required />
      <TextAreaField label={f.description} name="description" defaultValue={defaults?.description} rows={3} optionalLabel={t.common.optional} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label={f.dueAt} name="dueAt" type="datetime-local" defaultValue={defaults?.dueAt} optionalLabel={t.common.optional} />
        <SelectField
          label={f.priority}
          name="priority"
          defaultValue={defaults?.priority ?? "medium"}
          options={PRIORITIES.map((p) => ({ value: p, label: t.common.priority[p] }))}
        />
        <SelectField
          label={f.customer}
          name="customerId"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          placeholder={t.common.none}
          options={customers.map((c) => ({ value: c.id, label: c.full_name }))}
        />
        {opportunities.length > 0 && (
          <SelectField
            label={f.opportunity}
            name="opportunityId"
            defaultValue={defaults?.opportunityId ?? ""}
            placeholder={t.common.none}
            options={visibleOpps.map((o) => ({ value: o.id, label: o.title }))}
          />
        )}
        {members.length > 1 && (
          <SelectField
            label={f.assignee}
            name="assigneeId"
            defaultValue={defaults?.assigneeId ?? ""}
            placeholder={t.common.none}
            options={members.map((m) => ({ value: m.id, label: m.name }))}
          />
        )}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <LinkButton href={cancelHref} variant="ghost">{t.common.cancel}</LinkButton>
        <SubmitButton pendingLabel={t.common.saving}>{t.common.save}</SubmitButton>
      </div>
    </ActionForm>
  );
}
