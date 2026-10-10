"use client";

import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore } from "lucide-react";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n-provider";
import { setCustomerArchivedAction } from "@/actions/customers";
import { useTransition } from "react";

export function ArchiveCustomerButton({ id, archived }: { id: string; archived: boolean }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  if (archived) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => start(async () => {
          await setCustomerArchivedAction(id, false);
          router.refresh();
        })}
      >
        <ArchiveRestore className="size-4" aria-hidden /> {t.customers.restore}
      </Button>
    );
  }
  return (
    <ConfirmButton
      variant="outline"
      icon={<Archive className="size-4" aria-hidden />}
      title={t.customers.archive}
      description={t.customers.archiveConfirm}
      confirmLabel={t.customers.archive}
      cancelLabel={t.common.cancel}
      action={async () => {
        await setCustomerArchivedAction(id, true);
        router.refresh();
      }}
    >
      {t.customers.archive}
    </ConfirmButton>
  );
}
