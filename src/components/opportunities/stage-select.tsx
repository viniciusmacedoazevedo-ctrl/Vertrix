"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { setOpportunityStageAction } from "@/actions/opportunities";
import { useT } from "@/components/i18n-provider";
import { ALL_STAGES, type OpportunityStage } from "@/lib/domain/followup";
import { cn } from "@/lib/cn";

export function StageSelect({ id, stage, className }: { id: string; stage: OpportunityStage; className?: string }) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className={cn("relative inline-flex max-w-full items-center gap-2", className)}>
      <span className="sr-only">{t.opportunities.moveTo}</span>
      <select
        value={stage}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          start(async () => {
            const result = await setOpportunityStageAction(id, next);
            if (result.status === "error") window.alert(result.message);
            router.refresh();
          });
        }}
        className="h-8 min-w-0 max-w-full flex-1 rounded-md border border-border-strong bg-bg-elevated px-2 pr-7 text-[13px] text-fg outline-none focus:border-accent"
      >
        {ALL_STAGES.map((s) => (
          <option key={s} value={s}>{t.opportunities.stages[s]}</option>
        ))}
      </select>
      {pending && <Loader2 className="size-4 animate-spin text-fg-subtle" aria-hidden />}
    </label>
  );
}
