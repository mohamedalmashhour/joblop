import { createMemoryBrainStore } from "@rwos/brain";
import { describe, expect, it } from "vitest";
import { emptyKpis, emptyRows, fakeCeoData, fakeCeoEffects, fakeData, fakeEffects } from "./brainTestFixtures";
import { JOBLOP_CEO_ACTIONS, JOBLOP_CEO_ACTION_KEYS, ceoDraftCampaignAction, ceoQueueCrmTaskAction } from "./joblopCeoActions";
import { JOBLOP_CEO_EFFECT_KEYS, createJoblopCeoEffects } from "./joblopCeoEffects";
import { createJoblopBrain } from "./joblopBrain";
import type { StoredIssue } from "@rwos/brain";

const NOW = new Date("2026-11-10T15:00:00Z");

// Money words a CEO capability must never contain, in any key, method name or describe() text.
const FORBIDDEN = ["pay", "payout", "lock", "charge", "settle", "refund", "transfer", "invoice", "capture", "withdraw"];

const issue = (over: Partial<StoredIssue> = {}): StoredIssue => ({
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  ruleKey: "ceo_supply_demand_imbalance",
  fingerprint: "ceo_supply_demand_imbalance:2026-W46:region:laval",
  subjectType: "platform_segment",
  subjectId: "region:laval",
  severity: "warning",
  summary: "Laval is short of supply.",
  inputs: { taskTitle: "Grow worker supply in Laval", segmentKey: "region:laval" },
  recommendedAction: "ceo_queue_crm_task",
  status: "open",
  detectedAt: NOW,
  lastSeenAt: NOW,
  resolvedAt: null,
  resolution: null,
  ...over
});

describe("CEO action guardrails", () => {
  it("exposes EXACTLY the two allowed governed action keys", () => {
    expect([...JOBLOP_CEO_ACTION_KEYS].sort()).toEqual(["ceo_draft_campaign", "ceo_queue_crm_task"]);
    expect(JOBLOP_CEO_ACTIONS.map((a) => a.key).sort()).toEqual(["ceo_draft_campaign", "ceo_queue_crm_task"]);
  });

  it("declares every action money-free with a sane daily cap", () => {
    for (const a of JOBLOP_CEO_ACTIONS) {
      expect(a.movesMoney).toBe(false);
      expect(Number.isInteger(a.dailyCap)).toBe(true);
      expect(a.dailyCap).toBeGreaterThan(0);
      expect(a.dailyCap).toBeLessThanOrEqual(50);
    }
  });

  it("has no money word in any action key, describe() text or undo hint", () => {
    for (const a of JOBLOP_CEO_ACTIONS) {
      const text = `${a.key} ${a.undoHint} ${a.describe(issue())}`.toLowerCase();
      // undoHint legitimately says "sent"/"review"; only the money verbs are forbidden.
      for (const word of FORBIDDEN) expect(text.includes(word)).toBe(false);
    }
  });

  it("the CEO effects surface is exactly the two money-free capabilities", () => {
    const effects = createJoblopCeoEffects();
    expect(Object.keys(effects).sort()).toEqual([...JOBLOP_CEO_EFFECT_KEYS].sort());
    for (const key of Object.keys(effects)) {
      for (const word of FORBIDDEN) expect(key.toLowerCase().includes(word)).toBe(false);
    }
  });

  it("queue-task action reaches ONLY queueCrmTask", async () => {
    const { effects, calls } = fakeCeoEffects();
    await ceoQueueCrmTaskAction.run(issue(), { data: fakeData(emptyRows()), effects: fakeEffects().effects, ceo: { data: fakeCeoData(), effects } });
    expect(calls.map((c) => c.name)).toEqual(["queueCrmTask"]);
  });

  it("draft-campaign action reaches ONLY draftMarketingCampaign and never sends", async () => {
    const { effects, calls } = fakeCeoEffects();
    const i = issue({ ruleKey: "ceo_marketing_opportunity", recommendedAction: "ceo_draft_campaign", inputs: { campaignName: "Win-back", audience: "consented", subject: "Hi", bodyOutline: "..." } });
    const outcome = await ceoDraftCampaignAction.run(i, { data: fakeData(emptyRows()), effects: fakeEffects().effects, ceo: { data: fakeCeoData(), effects } });
    expect(calls.map((c) => c.name)).toEqual(["draftMarketingCampaign"]);
    expect(outcome.status).toBe("done");
  });

  it("the default effects record a draft but never mark it sent", async () => {
    const effects = createJoblopCeoEffects();
    const outcome = await effects.draftMarketingCampaign({ name: "Win-back", audience: "consented", subject: "Hi", body: "...", signalKey: "k" });
    expect(outcome.detail.toLowerCase()).toContain("not sent");
  });
});

describe("CEO live-mode reachability", () => {
  it("in live mode with switches on, the brain only ever runs the two allowed governed actions", async () => {
    const store = createMemoryBrainStore();
    const { effects: ceoEffects, calls } = fakeCeoEffects();
    const brain = createJoblopBrain({
      store,
      data: fakeData(emptyRows()),
      effects: fakeEffects().effects,
      ceoData: fakeCeoData(
        emptyKpis({
          openPlaces: 8,
          filledPlaces: 2,
          fillRate: 0.2, // advisory fill-rate card (no action)
          requestsSubmitted: 10,
          requestsApproved: 2, // stalled pipeline -> queue task
          dormantEmployers: 5, // churn -> queue task
          caslConsentedContacts: 100,
          caslConsentedNoRecentCampaign: 100, // marketing -> draft campaign
          segments: [{ key: "region:laval", label: "Laval", dimension: "region", openPlaces: 9, filledPlaces: 1 }]
        })
      ),
      ceoEffects
    });
    await brain.setMode("live", "staff-1");
    for (const key of JOBLOP_CEO_ACTION_KEYS) await brain.setSwitch(key, true, "staff-1");

    await brain.sweep();

    const actions = await store.listActions(100);
    const ceoActions = actions.filter((a) => a.actionKey.startsWith("ceo_"));
    // Only the two allowed CEO action keys ever appear.
    expect(new Set(ceoActions.map((a) => a.actionKey))).toEqual(new Set(["ceo_queue_crm_task", "ceo_draft_campaign"]));
    expect(ceoActions.every((a) => a.kind === "live" && a.status === "done")).toBe(true);
    // The effects adapter was only ever asked for the two money-free capabilities.
    expect(new Set(calls.map((c) => c.name))).toEqual(new Set(["queueCrmTask", "draftMarketingCampaign"]));
    // The advisory fill-rate card stayed an open issue with no action.
    const open = await store.openIssues("ceo_fill_rate_dropping");
    expect(open).toHaveLength(1);
    expect(open[0]?.recommendedAction).toBeNull();
  });
});
