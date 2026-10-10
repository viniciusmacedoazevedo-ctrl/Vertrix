import { describe, expect, it } from "vitest";
import { followUpReason } from "@/lib/domain/followup";

const now = new Date("2026-10-10T15:00:00Z");
const opts = { staleDays: 7, today: "2026-10-10", now };

describe("followUpReason", () => {
  it("flags a due follow-up date", () => {
    expect(followUpReason({ stage: "proposal_sent", last_interaction_at: now.toISOString(), follow_up_on: "2026-10-10" }, opts)).toBe("follow_up_due");
    expect(followUpReason({ stage: "proposal_sent", last_interaction_at: now.toISOString(), follow_up_on: "2026-10-01" }, opts)).toBe("follow_up_due");
  });

  it("flags opportunities without interaction for the configured period", () => {
    expect(followUpReason({ stage: "new", last_interaction_at: "2026-10-02T00:00:00Z", follow_up_on: null }, opts)).toBe("stale");
    expect(followUpReason({ stage: "new", last_interaction_at: "2026-10-05T00:00:00Z", follow_up_on: null }, opts)).toBeNull();
    expect(followUpReason({ stage: "new", last_interaction_at: "2026-10-05T00:00:00Z", follow_up_on: null }, { ...opts, staleDays: 3 })).toBe("stale");
  });

  it("ignores future follow-ups and closed opportunities (never auto-loses)", () => {
    expect(followUpReason({ stage: "negotiation", last_interaction_at: now.toISOString(), follow_up_on: "2026-10-11" }, opts)).toBeNull();
    expect(followUpReason({ stage: "won", last_interaction_at: "2020-01-01T00:00:00Z", follow_up_on: "2020-01-01" }, opts)).toBeNull();
    expect(followUpReason({ stage: "lost", last_interaction_at: "2020-01-01T00:00:00Z", follow_up_on: null }, opts)).toBeNull();
  });
});
