import type { BrainRule, DetectedIssue } from "@rwos/brain";
import type { JoblopBrainContext } from "./joblopRules";
import type { JoblopCeoEffects } from "./joblopCeoEffects";

// The Joblop "CEO" persona: a strategy advisor built on the SAME brain engine as the operations rules.
// It is read-only about the platform and advisory by nature. Its rules turn week-over-week KPI trends
// into recommendation cards. Two of those cards may, in `live` mode and only with their own switch on,
// auto-run a money-free governed action (queue a CRM task, draft — never send — a campaign). Every CEO
// rule is deterministic: the same snapshot always yields the same cards. No money is read or moved.

// ── CEO read model (platform KPIs + trends) ──────────────────────────────────────────────────────────

/** One supply/demand segment (a region today; categories can be added the same way). */
export type KpiSegment = Readonly<{
  key: string; // stable, e.g. "region:laval"
  label: string;
  dimension: "region" | "category";
  openPlaces: number; // demand still open
  filledPlaces: number; // demand met
}>;

/** A single platform snapshot with this week's figures and the prior week's, for trend rules. */
export type KpiSnapshot = Readonly<{
  periodKey: string; // ISO week, e.g. "2026-W46" — one card per signal per week
  activeWorkers: number;
  priorActiveWorkers: number;
  activeEmployers: number;
  priorActiveEmployers: number;
  openJobs: number;
  openPlaces: number;
  filledPlaces: number;
  fillRate: number; // 0..1 across open future jobs
  offersSent: number;
  offersAccepted: number;
  acceptanceRate: number; // 0..1
  priorAcceptanceRate: number;
  ordersCompleted: number; // shifts completed this window
  priorOrdersCompleted: number;
  requestsSubmitted: number;
  requestsApproved: number;
  dormantEmployers: number; // active prior week, silent this week
  caslConsentedContacts: number;
  caslConsentedNoRecentCampaign: number;
  segments: readonly KpiSegment[];
}>;

export interface JoblopCeoData {
  /** Read-only platform KPIs and week-over-week trends. No money amounts. */
  platformKpis(now: Date): Promise<KpiSnapshot>;
}

export type JoblopCeoContext = Readonly<{ data: JoblopCeoData; effects: JoblopCeoEffects }>;

// ── Thresholds (plain, deterministic) ────────────────────────────────────────────────────────────────

export const FILL_RATE_FLOOR = 0.85;
export const FILL_RATE_URGENT = 0.6;
export const FILL_DEMAND_MIN = 4; // ignore tiny demand (noise)
export const THROUGHPUT_DROP = 0.2; // ≥20% fewer completed shifts WoW
export const SEGMENT_MIN_OPEN = 5;
export const SEGMENT_FILL_FLOOR = 0.5;
export const CHURN_MIN_DORMANT = 3;
export const CHURN_DROP_RATIO = 0.2;
export const CHURN_PRIOR_MIN = 5;
export const STALL_MIN_SUBMITTED = 5;
export const STALL_APPROVE_FLOOR = 0.5;
export const MARKETING_MIN_CONSENTED = 25;

const pct = (n: number) => `${Math.round(n * 100)}%`;
const segmentFillRate = (s: KpiSegment) => (s.openPlaces + s.filledPlaces > 0 ? s.filledPlaces / (s.openPlaces + s.filledPlaces) : 1);

// ── Rules ────────────────────────────────────────────────────────────────────────────────────────────

/** Fill rate across open jobs is low (optionally with falling throughput). Strategic — a person decides. */
export const ceoFillRateDroppingRule: BrainRule<JoblopBrainContext> = {
  key: "ceo_fill_rate_dropping",
  async detect({ ceo }, now) {
    const k = await ceo.data.platformKpis(now);
    const demand = k.openPlaces + k.filledPlaces;
    if (demand < FILL_DEMAND_MIN || k.fillRate >= FILL_RATE_FLOOR) return [];
    const throughputDown = k.priorOrdersCompleted > 0 && k.ordersCompleted <= k.priorOrdersCompleted * (1 - THROUGHPUT_DROP);
    return [
      {
        ruleKey: "ceo_fill_rate_dropping",
        fingerprint: `ceo_fill_rate_dropping:${k.periodKey}`,
        subjectType: "platform",
        subjectId: "platform",
        severity: k.fillRate < FILL_RATE_URGENT ? "urgent" : "warning",
        summary: `Fill rate is ${pct(k.fillRate)} across ${k.openPlaces} open place(s)${throughputDown ? `, and completed shifts fell from ${k.priorOrdersCompleted} to ${k.ordersCompleted} week over week` : ""}. Review supply growth and pricing.`,
        inputs: { fillRate: k.fillRate, openPlaces: k.openPlaces, filledPlaces: k.filledPlaces, ordersCompleted: k.ordersCompleted, priorOrdersCompleted: k.priorOrdersCompleted, throughputDown },
        recommendedAction: null
      }
    ];
  }
};

/** A region with lots of open places and a low fill rate: queue a staff task to grow supply there. */
export const ceoSupplyDemandImbalanceRule: BrainRule<JoblopBrainContext> = {
  key: "ceo_supply_demand_imbalance",
  async detect({ ceo }, now) {
    const k = await ceo.data.platformKpis(now);
    const out: DetectedIssue[] = [];
    for (const s of k.segments) {
      if (s.openPlaces < SEGMENT_MIN_OPEN || segmentFillRate(s) >= SEGMENT_FILL_FLOOR) continue;
      out.push({
        ruleKey: "ceo_supply_demand_imbalance",
        fingerprint: `ceo_supply_demand_imbalance:${k.periodKey}:${s.key}`,
        subjectType: "platform_segment",
        subjectId: s.key,
        severity: "warning",
        summary: `${s.label}: ${s.openPlaces} place(s) open and only ${pct(segmentFillRate(s))} filled. Supply is short of demand here.`,
        inputs: {
          taskTitle: `Grow worker supply in ${s.label}`,
          segmentKey: s.key,
          openPlaces: s.openPlaces,
          filledPlaces: s.filledPlaces,
          fillRate: segmentFillRate(s)
        },
        recommendedAction: "ceo_queue_crm_task"
      });
    }
    return out;
  }
};

/** Employers who worked last week have gone quiet, or active-employer count fell sharply: follow up. */
export const ceoEmployerChurnRule: BrainRule<JoblopBrainContext> = {
  key: "ceo_employer_churn",
  async detect({ ceo }, now) {
    const k = await ceo.data.platformKpis(now);
    const sharpDrop = k.priorActiveEmployers >= CHURN_PRIOR_MIN && k.activeEmployers <= k.priorActiveEmployers * (1 - CHURN_DROP_RATIO);
    if (k.dormantEmployers < CHURN_MIN_DORMANT && !sharpDrop) return [];
    return [
      {
        ruleKey: "ceo_employer_churn",
        fingerprint: `ceo_employer_churn:${k.periodKey}`,
        subjectType: "platform",
        subjectId: "employers",
        severity: "warning",
        summary: `${k.dormantEmployers} employer(s) active last week posted nothing this week (active employers ${k.priorActiveEmployers}→${k.activeEmployers}). Re-engage them.`,
        inputs: {
          taskTitle: "Re-engage employers who went quiet this week",
          dormantEmployers: k.dormantEmployers,
          activeEmployers: k.activeEmployers,
          priorActiveEmployers: k.priorActiveEmployers
        },
        recommendedAction: "ceo_queue_crm_task"
      }
    ];
  }
};

/** Many requests submitted but few approved: the intake pipeline is stalling. */
export const ceoStalledPipelineRule: BrainRule<JoblopBrainContext> = {
  key: "ceo_stalled_pipeline",
  async detect({ ceo }, now) {
    const k = await ceo.data.platformKpis(now);
    if (k.requestsSubmitted < STALL_MIN_SUBMITTED) return [];
    const approvalRate = k.requestsApproved / k.requestsSubmitted;
    if (approvalRate >= STALL_APPROVE_FLOOR) return [];
    return [
      {
        ruleKey: "ceo_stalled_pipeline",
        fingerprint: `ceo_stalled_pipeline:${k.periodKey}`,
        subjectType: "platform",
        subjectId: "pipeline",
        severity: "warning",
        summary: `${k.requestsApproved} of ${k.requestsSubmitted} submitted requests were approved this week (${pct(approvalRate)}). Requests are stalling before dispatch.`,
        inputs: {
          taskTitle: "Clear the stalled request pipeline",
          requestsSubmitted: k.requestsSubmitted,
          requestsApproved: k.requestsApproved,
          approvalRate
        },
        recommendedAction: "ceo_queue_crm_task"
      }
    ];
  }
};

/** A sizeable pool of CASL-consented contacts has had no recent campaign: draft an outreach (not sent). */
export const ceoMarketingOpportunityRule: BrainRule<JoblopBrainContext> = {
  key: "ceo_marketing_opportunity",
  async detect({ ceo }, now) {
    const k = await ceo.data.platformKpis(now);
    if (k.caslConsentedNoRecentCampaign < MARKETING_MIN_CONSENTED) return [];
    return [
      {
        ruleKey: "ceo_marketing_opportunity",
        fingerprint: `ceo_marketing_opportunity:${k.periodKey}`,
        subjectType: "platform",
        subjectId: "marketing",
        severity: "info",
        summary: `${k.caslConsentedNoRecentCampaign} CASL-consented contact(s) have had no recent campaign. A re-engagement email could lift activity.`,
        inputs: {
          campaignName: `Re-engagement — consented contacts, ${k.periodKey}`,
          audience: "CASL-consented contacts with no recent campaign",
          subject: "There is work waiting for you on Joblop",
          bodyOutline: "Warm re-engagement: remind consented contacts what is new, link to open jobs / to post a job. Respect unsubscribe; re-check live consent before any send.",
          consentedNoRecentCampaign: k.caslConsentedNoRecentCampaign,
          consentedContacts: k.caslConsentedContacts
        },
        recommendedAction: "ceo_draft_campaign"
      }
    ];
  }
};

export const JOBLOP_CEO_RULES: readonly BrainRule<JoblopBrainContext>[] = [
  ceoFillRateDroppingRule,
  ceoSupplyDemandImbalanceRule,
  ceoEmployerChurnRule,
  ceoStalledPipelineRule,
  ceoMarketingOpportunityRule
];

/** CEO rule keys (for the admin UI's CEO section and tests). */
export const JOBLOP_CEO_RULE_KEYS = JOBLOP_CEO_RULES.map((r) => r.key);
