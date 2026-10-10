/**
 * Subscription plans. Billing is NOT implemented yet: every organization starts on
 * "free" and limits below are enforced where noted. A future billing integration
 * only needs to update organizations.plan.
 */
export const PLANS = ["free", "pro", "business"] as const;
export type Plan = (typeof PLANS)[number];

export interface PlanLimits {
  aiMessagesPerDay: number;
  members: number;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: { aiMessagesPerDay: 50, members: 1 },
  pro: { aiMessagesPerDay: 300, members: 5 },
  business: { aiMessagesPerDay: 1000, members: 25 },
};

export function planLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[(PLANS as readonly string[]).includes(plan) ? (plan as Plan) : "free"];
}
