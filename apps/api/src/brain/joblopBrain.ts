import type { BrainLog, BrainStore } from "@rwos/brain";
import { createBrain } from "@rwos/brain";
import { DAILY_SUMMARY_SWITCH, JOBLOP_BRAIN_ACTIONS } from "./joblopActions";
import { JOBLOP_CEO_ACTIONS } from "./joblopCeoActions";
import type { JoblopCeoData, KpiSnapshot } from "./joblopCeoRules";
import { JOBLOP_CEO_RULES } from "./joblopCeoRules";
import type { JoblopCeoEffects } from "./joblopCeoEffects";
import { createJoblopCeoEffects } from "./joblopCeoEffects";
import type { JoblopBrainData, JoblopBrainEffects } from "./joblopRules";
import { JOBLOP_BRAIN_RULES } from "./joblopRules";

// A zero snapshot: the CEO rules find nothing. Used only when a caller (e.g. a test) does not wire a
// CEO read model. Production wires a real Prisma CEO adapter.
const ZERO_KPIS: KpiSnapshot = {
  periodKey: "0000-W00",
  activeWorkers: 0, priorActiveWorkers: 0, activeEmployers: 0, priorActiveEmployers: 0,
  openJobs: 0, openPlaces: 0, filledPlaces: 0, fillRate: 1,
  offersSent: 0, offersAccepted: 0, acceptanceRate: 0, priorAcceptanceRate: 0,
  ordersCompleted: 0, priorOrdersCompleted: 0, requestsSubmitted: 0, requestsApproved: 0,
  dormantEmployers: 0, caslConsentedContacts: 0, caslConsentedNoRecentCampaign: 0, segments: []
};
const inertCeoData: JoblopCeoData = { platformKpis: async () => ZERO_KPIS };

// Joblop's plug-in to the platform-neutral brain: Joblop rules + Joblop actions + Joblop adapters
// (data, effects) on top of the shared engine. Another platform does the same with its own pieces.
//
// Two personas share the one engine and the one off/watch/live master switch:
//   - Operations: the original per-shift / per-timesheet rules and actions.
//   - CEO: platform-strategy rules; advisory by nature, with two money-free governed actions
//     (queue a CRM task, draft a campaign) each behind its own switch.

export function createJoblopBrain(input: {
  store: BrainStore;
  data: JoblopBrainData;
  effects: JoblopBrainEffects;
  /** CEO persona read model (platform KPIs) and its two money-free governed capabilities. When a caller
   *  omits them (some tests), the CEO rules run against an inert zero snapshot and the stub effects. */
  ceoData?: JoblopCeoData;
  ceoEffects?: JoblopCeoEffects;
  /** More switches stored with the brain settings (phase 2: the assistant's switches). */
  extraSwitches?: readonly string[];
  now?: () => Date;
  log?: BrainLog;
}) {
  return createBrain({
    store: input.store,
    rules: [...JOBLOP_BRAIN_RULES, ...JOBLOP_CEO_RULES],
    actions: [...JOBLOP_BRAIN_ACTIONS, ...JOBLOP_CEO_ACTIONS],
    context: { data: input.data, effects: input.effects, ceo: { data: input.ceoData ?? inertCeoData, effects: input.ceoEffects ?? createJoblopCeoEffects() } },
    extraSwitches: [DAILY_SUMMARY_SWITCH, ...(input.extraSwitches ?? [])],
    ...(input.now ? { now: input.now } : {}),
    ...(input.log ? { log: input.log } : {})
  });
}
