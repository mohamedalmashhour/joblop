// AI manager (pure). The admin's AI manager TRIAGES each order role line and produces a
// RECOMMENDATION — it never decides. Consistent with the platform's frozen AI boundaries
// ("Recommendation != Decision", "AI suggestion != Human decision"): a human admin applies the
// governed action, and hard cases are escalated to the owners. This is a deterministic policy; a
// learned model can later sit behind the same interface without changing callers.
import { resolveMarginPpm } from "./platformPricing";

export type AiManagerRecommendation = "approve" | "escalate";

export type AiManagerReasonCode = "standard" | "urgent_premium" | "immediate_urgency" | "high_headcount";

export type AiManagerDecision = Readonly<{
  recommendation: AiManagerRecommendation;
  suggestedMarginPpm: number;
  reasonCodes: readonly AiManagerReasonCode[];
}>;

/** Above this headcount on a single role line, the AI manager escalates to the owners for a look. */
export const AI_WORKER_ESCALATION_THRESHOLD = 10;

/**
 * Triage one role line. Escalate to owners when the request is an emergency (immediate urgency) or
 * unusually large (headcount over the threshold) — those warrant a human owner's eyes. Otherwise
 * recommend approval at the default (or supplied) margin. An urgent (not immediate) line is still a
 * recommended approve, flagged so the admin sees the premium applies. The admin always confirms.
 */
export function recommendOrderRole(input: {
  urgency: string;
  numberOfWorkers: number;
  defaultMarginPpm?: number | null;
}): AiManagerDecision {
  const reasonCodes: AiManagerReasonCode[] = [];
  let recommendation: AiManagerRecommendation = "approve";

  if (input.urgency === "immediate") {
    recommendation = "escalate";
    reasonCodes.push("immediate_urgency");
  }
  if (Number.isFinite(input.numberOfWorkers) && input.numberOfWorkers > AI_WORKER_ESCALATION_THRESHOLD) {
    recommendation = "escalate";
    reasonCodes.push("high_headcount");
  }
  if (input.urgency === "urgent") {
    reasonCodes.push("urgent_premium");
  }
  if (reasonCodes.length === 0) {
    reasonCodes.push("standard");
  }

  return {
    recommendation,
    suggestedMarginPpm: resolveMarginPpm(input.defaultMarginPpm),
    reasonCodes
  };
}
