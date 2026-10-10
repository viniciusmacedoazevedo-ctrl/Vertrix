"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ActionForm, SubmitButton, TextField } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n-provider";
import { addTimeOffAction, deleteTimeOffAction } from "@/actions/scheduling";

export function TimeOffForm({ professionalId }: { professionalId: string }) {
  const t = useT();
  const p = t.scheduling.professionals;
  return (
    <ActionForm action={addTimeOffAction} resetOnSuccess className="space-y-3">
      <input type="hidden" name="professionalId" value={professionalId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label={p.timeOffStart} name="startsAt" type="datetime-local" required />
        <TextField label={p.timeOffEnd} name="endsAt" type="datetime-local" required />
        <TextField label={p.timeOffReason} name="reason" optionalLabel={t.common.optional} fieldClassName="sm:col-span-2" />
      </div>
      <div className="flex justify-end">
        <SubmitButton size="sm" variant="secondary" pendingLabel={t.common.saving}>{p.addTimeOff}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function DeleteTimeOffButton({ id }: { id: string }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      aria-label={t.common.delete}
      onClick={() => start(async () => {
        await deleteTimeOffAction(id);
        router.refresh();
      })}
    >
      <Trash2 className="size-4" aria-hidden />
    </Button>
  );
}
