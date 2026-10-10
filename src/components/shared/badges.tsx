import { Badge, type Tone } from "@/components/ui/badge";
import type { Messages } from "@/lib/i18n/messages";
import type { OpportunityStage } from "@/lib/domain/followup";
import type { AppointmentStatus } from "@/lib/domain/appointments";

const stageTone: Record<OpportunityStage, Tone> = {
  new: "info",
  in_conversation: "accent",
  proposal_sent: "warning",
  negotiation: "accent",
  won: "success",
  lost: "neutral",
};

export function StageBadge({ stage, t }: { stage: OpportunityStage; t: Messages }) {
  return <Badge tone={stageTone[stage]}>{t.opportunities.stages[stage]}</Badge>;
}

const priorityTone = { low: "neutral", medium: "info", high: "danger" } as const;

export function PriorityBadge({ priority, t }: { priority: "low" | "medium" | "high"; t: Messages }) {
  return <Badge tone={priorityTone[priority]}>{t.common.priority[priority]}</Badge>;
}

const statusTone: Record<AppointmentStatus, Tone> = {
  scheduled: "info",
  confirmed: "accent",
  completed: "success",
  cancelled: "neutral",
  no_show: "danger",
};

export function AppointmentStatusBadge({ status, t }: { status: AppointmentStatus; t: Messages }) {
  return <Badge tone={statusTone[status]}>{t.scheduling.status[status]}</Badge>;
}
