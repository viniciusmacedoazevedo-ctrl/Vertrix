"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { useT } from "@/components/i18n-provider";
import { deleteConversationAction } from "@/actions/assistant";

export function DeleteConversationButton({ id }: { id: string }) {
  const t = useT();
  const router = useRouter();
  return (
    <ConfirmButton
      variant="ghost"
      icon={<Trash2 className="size-4" aria-hidden />}
      title={t.assistant.deleteConversation}
      description={t.assistant.deleteConfirm}
      confirmLabel={t.common.delete}
      cancelLabel={t.common.cancel}
      action={async () => {
        await deleteConversationAction(id);
        router.replace("/app/assistant");
      }}
    >
      <span className="sr-only sm:not-sr-only">{t.assistant.deleteConversation}</span>
    </ConfirmButton>
  );
}
