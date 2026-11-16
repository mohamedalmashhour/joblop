import type { DetectedIssue } from "@rwos/brain";
import { describe, expect, it } from "vitest";
import { ceoContext, emptyKpis } from "./brainTestFixtures";
import {
  type JOBLOP_CEO_RULES,
  ceoEmployerChurnRule,
  ceoFillRateDroppingRule,
  ceoMarketingOpportunityRule,
  ceoStalledPipelineRule,
  ceoSupplyDemandImbalanceRule,
  type KpiSnapshot
} from "./joblopCeoRules";
import type { JoblopBrainContext } from "./joblopRules";

const NOW = new Date("2026-11-10T15:00:00Z");

// A rule reads only the CEO snapshot; data/effects fakes stand in for the other persona.
const ctx = (snapshot: KpiSnapshot): JoblopBrainContext => ({
  data: {
    unfilledJobs: async () => [],
    startedShifts: async () => [],
    deliveryFailures: async () => [],
    requestsInReview: async () => [],
    openTimesheets: async () => [],
    overdueInvoices: async () => [],
    finishedShiftsWithoutTimesheet: async () => [],
    unreportedShifts: async () => []
  },
  effects: {} as JoblopBrainContext["effects"],
  ceo: ceoContext(snapshot)
});

const detect = (rule: (typeof JOBLOP_CEO_RULES)[number], snapshot: KpiSnapshot): Promise<readonly DetectedIssue[]> => rule.detect(ctx(snapshot), NOW);

describe("CEO fill-rate rule", () => {
  it("fires (advisory, no action) when fill rate is below the floor with real demand", async () => {
    const issues = await detect(ceoFillRateDroppingRule, emptyKpis({ openPlaces: 8, filledPlaces: 2, fillRate: 0.2 }));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.recommendedAction).toBeNull();
    expect(issues[0]?.severity).toBe("urgent");
  });

  it("stays quiet when the fill rate is healthy", async () => {
    expect(await detect(ceoFillRateDroppingRule, emptyKpis({ openPlaces: 2, filledPlaces: 18, fillRate: 0.9 }))).toHaveLength(0);
  });

  it("ignores tiny demand (noise)", async () => {
    expect(await detect(ceoFillRateDroppingRule, emptyKpis({ openPlaces: 1, filledPlaces: 0, fillRate: 0 }))).toHaveLength(0);
  });
});

describe("CEO supply/demand imbalance rule", () => {
  it("raises one queue-a-task card per short-supply region", async () => {
    const issues = await detect(
      ceoSupplyDemandImbalanceRule,
      emptyKpis({
        segments: [
          { key: "region:laval", label: "Laval", dimension: "region", openPlaces: 9, filledPlaces: 1 },
          { key: "region:montreal", label: "Montreal", dimension: "region", openPlaces: 1, filledPlaces: 9 } // healthy
        ]
      })
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.subjectId).toBe("region:laval");
    expect(issues[0]?.recommendedAction).toBe("ceo_queue_crm_task");
    expect(issues[0]?.inputs.segmentKey).toBe("region:laval");
  });
});

describe("CEO employer-churn rule", () => {
  it("fires when enough employers went dormant", async () => {
    const issues = await detect(ceoEmployerChurnRule, emptyKpis({ dormantEmployers: 4, activeEmployers: 6, priorActiveEmployers: 10 }));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.recommendedAction).toBe("ceo_queue_crm_task");
  });

  it("fires on a sharp drop in active employers even without dormancy count", async () => {
    const issues = await detect(ceoEmployerChurnRule, emptyKpis({ dormantEmployers: 0, activeEmployers: 6, priorActiveEmployers: 10 }));
    expect(issues).toHaveLength(1);
  });

  it("stays quiet when employers are steady", async () => {
    expect(await detect(ceoEmployerChurnRule, emptyKpis({ dormantEmployers: 1, activeEmployers: 10, priorActiveEmployers: 10 }))).toHaveLength(0);
  });
});

describe("CEO stalled-pipeline rule", () => {
  it("fires when approvals lag submissions", async () => {
    const issues = await detect(ceoStalledPipelineRule, emptyKpis({ requestsSubmitted: 10, requestsApproved: 3 }));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.recommendedAction).toBe("ceo_queue_crm_task");
  });

  it("stays quiet with healthy approval throughput", async () => {
    expect(await detect(ceoStalledPipelineRule, emptyKpis({ requestsSubmitted: 10, requestsApproved: 9 }))).toHaveLength(0);
  });
});

describe("CEO marketing-opportunity rule", () => {
  it("recommends drafting a campaign when a consented pool is idle", async () => {
    const issues = await detect(ceoMarketingOpportunityRule, emptyKpis({ caslConsentedContacts: 100, caslConsentedNoRecentCampaign: 100 }));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.recommendedAction).toBe("ceo_draft_campaign");
  });

  it("stays quiet below the threshold", async () => {
    expect(await detect(ceoMarketingOpportunityRule, emptyKpis({ caslConsentedNoRecentCampaign: 5 }))).toHaveLength(0);
  });
});

describe("CEO rule fingerprints", () => {
  it("are stable for the same snapshot (one card per signal per week)", async () => {
    const snap = emptyKpis({ requestsSubmitted: 10, requestsApproved: 2 });
    const a = await detect(ceoStalledPipelineRule, snap);
    const b = await detect(ceoStalledPipelineRule, snap);
    expect(a[0]?.fingerprint).toBe(b[0]?.fingerprint);
    expect(a[0]?.fingerprint).toContain("2026-W46");
  });
});
