"use client";

import { useRef } from "react";
import { ActionForm, SubmitButton, TextField } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n-provider";
import { allowedTransitions, type AppointmentStatus } from "@/lib/domain/appointments";
import { setAppointmentStatusAction } from "@/actions/scheduling";

/** Status transitions allowed from the current state. Cancelling asks for confirmation and an optional reason. */
export function AppointmentStatusActions({ id, status }: { id: string; status: AppointmentStatus }) {
  const t = useT();
  const dialog = useRef<HTMLDialogElement>(null);
  const action = setAppointmentStatusAction.bind(null, id);
  const next = allowedTransitions(status);
  if (next.length === 0) return null;
  const labels: Partial<Record<AppointmentStatus, string>> = {
    confirmed: status === "scheduled" ? t.scheduling.actions.confirm : t.scheduling.actions.reopen,
    completed: t.scheduling.actions.complete,
    no_show: t.scheduling.actions.noShow,
    scheduled: t.scheduling.actions.backToScheduled,
  };
  return (
    <div className="space-y-2">
      <ActionForm action={action} className="flex flex-wrap gap-2">
        {next
          .filter((s) => s !== "cancelled")
          .map((s) => (
            <SubmitButton key={s} name="status" value={s} variant={s === "completed" || s === "confirmed" ? "primary" : "outline"} size="sm">
              {labels[s]}
            </SubmitButton>
          ))}
        {next.includes("cancelled") && (
          <Button variant="danger" size="sm" onClick={() => dialog.current?.showModal()}>
            {t.scheduling.actions.cancel}
          </Button>
        )}
      </ActionForm>
      <dialog ref={dialog} className="m-auto w-[min(92vw,26rem)] rounded-xl border border-border-strong bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/60">
        <ActionForm action={action} className="space-y-4 p-5" onSuccess={() => dialog.current?.close()}>
          <input type="hidden" name="status" value="cancelled" />
          <h2 className="text-base font-semibold">{t.scheduling.actions.cancel}</h2>
          <p className="text-sm text-fg-muted">{t.scheduling.cancelConfirm}</p>
          <TextField label={t.scheduling.cancelReason} name="cancellationReason" optionalLabel={t.common.optional} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => dialog.current?.close()}>{t.common.back}</Button>
            <SubmitButton variant="danger">{t.scheduling.actions.cancel}</SubmitButton>
          </div>
        </ActionForm>
      </dialog>
    </div>
  );
}
