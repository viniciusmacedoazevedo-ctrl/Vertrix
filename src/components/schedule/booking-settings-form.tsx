"use client";

import { ActionForm, CheckboxField, SelectField, SubmitButton, TextField } from "@/components/ui/form";
import { useT } from "@/components/i18n-provider";
import { saveBookingSettingsAction } from "@/actions/scheduling";

export function BookingSettingsForm({
  defaults,
}: {
  defaults: { enabled: boolean; slotInterval: number; minNotice: number; maxDaysAhead: number };
}) {
  const t = useT();
  const b = t.scheduling.booking;
  return (
    <ActionForm action={saveBookingSettingsAction} className="space-y-5">
      <CheckboxField label={b.enabled} name="bookingEnabled" defaultChecked={defaults.enabled} />
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label={b.slotInterval}
          name="slotInterval"
          defaultValue={String(defaults.slotInterval)}
          options={[5, 10, 15, 20, 30, 60].map((v) => ({ value: String(v), label: String(v) }))}
        />
        <TextField label={b.minNotice} name="minNoticeMinutes" type="number" min={0} max={10080} defaultValue={defaults.minNotice} />
        <TextField label={b.maxDaysAhead} name="maxDaysAhead" type="number" min={1} max={365} defaultValue={defaults.maxDaysAhead} />
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingLabel={t.common.saving}>{t.common.save}</SubmitButton>
      </div>
    </ActionForm>
  );
}
