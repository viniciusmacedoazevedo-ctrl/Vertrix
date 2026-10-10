import type { DateString } from "./datetime";

export const OPEN_STAGES = ["new", "in_conversation", "proposal_sent", "negotiation"] as const;
export const CLOSED_STAGES = ["won", "lost"] as const;
export const ALL_STAGES = [...OPEN_STAGES, ...CLOSED_STAGES] as const;
export type OpportunityStage = (typeof ALL_STAGES)[number];

export type FollowUpReason = "follow_up_due" | "stale";

export interface FollowUpInput {
  stage: OpportunityStage;
  last_interaction_at: string;
  follow_up_on: DateString | null;
}

export function isOpenStage(stage: OpportunityStage): boolean {
  return (OPEN_STAGES as readonly string[]).includes(stage);
}

/** Instant before which an untouched open opportunity is considered stale. */
export function staleCutoff(now: Date, staleDays: number): Date {
  return new Date(now.getTime() - staleDays * 86_400_000);
}

/**
 * Explains why an opportunity needs attention, or returns null.
 * Rules (configurable through `staleDays`):
 *  - a scheduled follow-up date that is today or in the past;
 *  - no interaction for `staleDays` days.
 * Closed opportunities never need follow-up, and nothing is ever marked as lost automatically.
 */
export function followUpReason(
  opportunity: FollowUpInput,
  options: { staleDays: number; today: DateString; now: Date },
): FollowUpReason | null {
  if (!isOpenStage(opportunity.stage)) return null;
  if (opportunity.follow_up_on && opportunity.follow_up_on <= options.today) return "follow_up_due";
  if (new Date(opportunity.last_interaction_at) < staleCutoff(options.now, options.staleDays)) return "stale";
  return null;
}

export function daysSince(iso: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000));
}
