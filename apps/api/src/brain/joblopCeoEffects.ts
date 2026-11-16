import type { ActionOutcome } from "@rwos/brain";

// Write adapter for the Joblop "CEO" persona. By deliberate design it has EXACTLY TWO capabilities, and
// both are money-free and send-free:
//   queueCrmTask        — records a follow-up task for staff in the CRM.
//   draftMarketingCampaign — prepares a campaign DRAFT. It never sends anything.
//
// There is NO pay / lock / payout / refund / transfer / send method here, and there never will be: the
// CEO persona advises, and in `live` mode may only queue a CRM task or draft a campaign. Everything else
// stays a recommendation card for a person. The CASL-marketing phase wires these two to the real CRM
// task API (PR #180's apps/crm) and to Brevo draft creation; until then the default implementation below
// is a governed stub that records the task/draft in the brain's own action log (the audit trail staff
// see) without reaching any other system.

export type CeoCrmTaskInput = Readonly<{
  /** Short task title for staff, e.g. "Re-engage dormant employers (Laval)". */
  title: string;
  /** The recommendation body (the signal's plain-language summary). */
  body: string;
  /** The originating signal's fingerprint, for de-duplication and traceability. */
  signalKey: string;
  /** The segment this task is about, when the signal is segment-scoped (region/category). */
  segmentKey?: string | null;
}>;

export type CeoCampaignDraftInput = Readonly<{
  /** Internal name for the draft, e.g. "Win-back — consented contacts, 2026-W46". */
  name: string;
  /** Who the draft targets, in words, e.g. "CASL-consented contacts with no recent campaign". */
  audience: string;
  subject: string;
  body: string;
  signalKey: string;
}>;

export interface JoblopCeoEffects {
  /** Record a follow-up task for staff in the CRM. Money-free; nothing is sent. */
  queueCrmTask(input: CeoCrmTaskInput): Promise<ActionOutcome>;
  /** Prepare a marketing campaign DRAFT. It is NEVER sent — a person reviews and sends it later. */
  draftMarketingCampaign(input: CeoCampaignDraftInput): Promise<ActionOutcome>;
}

/** The two capability keys the CEO persona is allowed to exercise on its own. Used by the guardrail test. */
export const JOBLOP_CEO_EFFECT_KEYS = ["queueCrmTask", "draftMarketingCampaign"] as const;

export type JoblopCeoEffectsDeps = Readonly<{
  /** Plain-value structured log (counts/keys only — never message text or personal details). */
  log?: (event: string, fields?: Readonly<Record<string, unknown>>) => void;
}>;

/**
 * Default governed implementation: the task/draft is recorded only in the brain's action log (via the
 * returned outcome detail). No CRM write, no email, no money. The CASL-marketing phase replaces this with
 * a CRM-task-API-backed queueCrmTask and a Brevo draft-backed draftMarketingCampaign (still never
 * sending on its own).
 */
export function createJoblopCeoEffects(deps: JoblopCeoEffectsDeps = {}): JoblopCeoEffects {
  const log = deps.log ?? (() => undefined);
  const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
  return {
    async queueCrmTask(input) {
      log("brain.ceo.crm_task_queued", { signalKey: input.signalKey, segmentKey: input.segmentKey ?? null });
      return {
        status: "done",
        detail: clip(`Queued CRM task for staff: ${input.title}`, 300),
        undo: null,
        // Advisory follow-up: a strategy task does not "resolve" the standing trend, so the weekly card
        // stays visible until the trend clears. Keeping the issue open avoids re-queuing (slot is claimed).
        resolvesIssue: false
      };
    },
    async draftMarketingCampaign(input) {
      log("brain.ceo.campaign_drafted", { signalKey: input.signalKey });
      return {
        status: "done",
        detail: clip(`Drafted campaign "${input.name}" for ${input.audience} (NOT sent — a person reviews and sends it).`, 300),
        undo: null,
        resolvesIssue: false
      };
    }
  };
}
