import type { BrainAction, StoredIssue } from "@rwos/brain";
import type { JoblopBrainContext } from "./joblopRules";
import type { CeoCampaignDraftInput, CeoCrmTaskInput } from "./joblopCeoEffects";

// The CEO persona's actions. There are EXACTLY TWO, and both are money-free governed actions: queue a
// CRM task, and draft (never send) a marketing campaign. Every other CEO recommendation is an advisory
// card with no action (recommendedAction === null), so a person decides. None moves money; the engine
// also refuses to register any action whose movesMoney is not literally false.

export const JOBLOP_CEO_ACTION_KEYS = ["ceo_queue_crm_task", "ceo_draft_campaign"] as const;
export type JoblopCeoActionKey = (typeof JOBLOP_CEO_ACTION_KEYS)[number];

const str = (issue: StoredIssue, key: string, fallback: string): string => {
  const v = issue.inputs[key];
  return typeof v === "string" && v.trim() ? v : fallback;
};

export const ceoQueueCrmTaskAction: BrainAction<JoblopBrainContext> = {
  key: "ceo_queue_crm_task",
  movesMoney: false,
  dailyCap: 20,
  undoHint: "No one-click undo: open the CRM and remove the task if it is not wanted. Nothing was sent.",
  describe: (issue) => `queue a CRM follow-up task for staff: ${str(issue, "taskTitle", "follow up on this trend")}`,
  run: (issue, { ceo }) => {
    const input: CeoCrmTaskInput = {
      title: str(issue, "taskTitle", issue.summary).slice(0, 160),
      body: issue.summary.slice(0, 1000),
      signalKey: issue.fingerprint,
      segmentKey: typeof issue.inputs.segmentKey === "string" ? issue.inputs.segmentKey : null
    };
    return ceo.effects.queueCrmTask(input);
  }
};

export const ceoDraftCampaignAction: BrainAction<JoblopBrainContext> = {
  key: "ceo_draft_campaign",
  movesMoney: false,
  dailyCap: 5,
  undoHint: "No one-click undo: open Campaigns and delete the draft if it is not wanted. Nothing was sent — a person reviews and sends it.",
  describe: (issue) => `draft (not send) a marketing campaign: ${str(issue, "campaignName", "re-engagement")}`,
  run: (issue, { ceo }) => {
    const input: CeoCampaignDraftInput = {
      name: str(issue, "campaignName", `Re-engagement — ${issue.subjectId}`).slice(0, 160),
      audience: str(issue, "audience", "CASL-consented contacts").slice(0, 200),
      subject: str(issue, "subject", "An update from Joblop").slice(0, 200),
      body: str(issue, "bodyOutline", issue.summary).slice(0, 2000),
      signalKey: issue.fingerprint
    };
    return ceo.effects.draftMarketingCampaign(input);
  }
};

export const JOBLOP_CEO_ACTIONS: readonly BrainAction<JoblopBrainContext>[] = [ceoQueueCrmTaskAction, ceoDraftCampaignAction];
