import { Badge } from "@/components/ui/badge";
import { daysSince, followUpReason, type FollowUpInput } from "@/lib/domain/followup";
import { todayInTimeZone } from "@/lib/domain/datetime";
import { format } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";

export function FollowUpBadge({
  opportunity,
  staleDays,
  timeZone,
  t,
}: {
  opportunity: FollowUpInput;
  staleDays: number;
  timeZone: string;
  t: Messages;
}) {
  const now = new Date();
  const reason = followUpReason(opportunity, { staleDays, today: todayInTimeZone(timeZone, now), now });
  if (!reason) return null;
  return (
    <Badge tone="warning">
      {reason === "stale"
        ? format(t.opportunities.followUp.stale, { days: daysSince(opportunity.last_interaction_at, now) })
        : t.opportunities.followUp.follow_up_due}
    </Badge>
  );
}
