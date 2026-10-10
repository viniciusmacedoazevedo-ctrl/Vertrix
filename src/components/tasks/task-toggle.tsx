"use client";

import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { setTaskStatusAction } from "@/actions/tasks";
import { useT } from "@/components/i18n-provider";
import { cn } from "@/lib/cn";

export function TaskToggle({ id, done, title }: { id: string; done: boolean; title: string }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [optimisticDone, setOptimisticDone] = useOptimistic(done);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={optimisticDone}
      aria-label={`${optimisticDone ? t.tasks.reopen : t.tasks.markDone}: ${title}`}
      disabled={pending}
      onClick={() =>
        start(async () => {
          setOptimisticDone(!optimisticDone);
          const result = await setTaskStatusAction(id, optimisticDone ? "open" : "done");
          if (result.status === "error") window.alert(result.message);
          router.refresh();
        })
      }
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
        optimisticDone ? "border-success bg-success text-bg" : "border-border-strong hover:border-accent",
      )}
    >
      {optimisticDone && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
    </button>
  );
}
