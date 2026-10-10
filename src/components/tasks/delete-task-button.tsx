"use client";

import type { ReactNode } from "react";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { useT } from "@/components/i18n-provider";
import { deleteTaskAction } from "@/actions/tasks";

export function DeleteTaskButton({ id, icon }: { id: string; icon?: ReactNode }) {
  const t = useT();
  return (
    <ConfirmButton
      icon={icon}
      title={t.common.delete}
      description={t.tasks.deleteConfirm}
      confirmLabel={t.common.delete}
      cancelLabel={t.common.cancel}
      action={() => deleteTaskAction(id)}
    >
      {t.common.delete}
    </ConfirmButton>
  );
}
