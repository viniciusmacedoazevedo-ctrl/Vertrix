"use client";

import { ActionForm, CheckboxField, SubmitButton, TextField } from "@/components/ui/form";
import { useT } from "@/components/i18n-provider";
import type { ActionState } from "@/lib/action-state";

export function ProfessionalForm({
  action,
  defaults,
  services,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: { name: string; email: string; phone: string; active: boolean; serviceIds: string[] };
  services: { id: string; name: string }[];
}) {
  const t = useT();
  const p = t.scheduling.professionals;
  return (
    <ActionForm action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label={p.name} name="name" defaultValue={defaults?.name} required fieldClassName="sm:col-span-2" />
        <TextField label={p.email} name="email" type="email" defaultValue={defaults?.email} optionalLabel={t.common.optional} />
        <TextField label={p.phone} name="phone" type="tel" defaultValue={defaults?.phone} optionalLabel={t.common.optional} />
      </div>
      <fieldset>
        <legend className="text-[13px] font-medium text-fg-muted">{p.services}</legend>
        {services.length === 0 ? (
          <p className="mt-2 text-sm text-fg-subtle">{p.noServices}</p>
        ) : (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {services.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border-strong bg-bg-elevated px-3 py-2 text-sm">
                <input type="checkbox" name="serviceIds" value={s.id} defaultChecked={defaults?.serviceIds.includes(s.id) ?? true} className="size-4 accent-[var(--color-accent)]" />
                {s.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <CheckboxField label={p.active} name="active" defaultChecked={defaults?.active ?? true} />
      <div className="flex justify-end">
        <SubmitButton pendingLabel={t.common.saving}>{t.common.save}</SubmitButton>
      </div>
    </ActionForm>
  );
}
