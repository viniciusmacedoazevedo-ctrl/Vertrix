"use client";

import { ActionForm, SubmitButton, TextAreaField } from "@/components/ui/form";
import { useT } from "@/components/i18n-provider";
import { addNoteAction } from "@/actions/customers";

export function NoteForm({
  customerId,
  opportunityId,
  label,
  placeholder,
  submitLabel,
}: {
  customerId?: string;
  opportunityId?: string;
  label: string;
  placeholder: string;
  submitLabel: string;
}) {
  const t = useT();
  return (
    <ActionForm action={addNoteAction} resetOnSuccess className="space-y-3">
      {customerId && <input type="hidden" name="customerId" value={customerId} />}
      {opportunityId && <input type="hidden" name="opportunityId" value={opportunityId} />}
      <TextAreaField label={label} name="body" placeholder={placeholder} rows={3} required />
      <div className="flex justify-end">
        <SubmitButton size="sm" pendingLabel={t.common.saving}>
          {submitLabel}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
