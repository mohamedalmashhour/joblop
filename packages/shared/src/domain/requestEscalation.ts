// Owner-escalation of a role line (pure). A role the AI manager or an admin flags for the platform
// owners is tracked as an escalation: open until an owner resolves or dismisses it. The actual
// approval still flows through the governed intake transition — resolving an escalation is a human
// decision, never an automatic money action.

export type RequestEscalationStatus = "open" | "resolved" | "dismissed";

export function isOpenEscalation(status: RequestEscalationStatus): boolean {
  return status === "open";
}

/** Only an open escalation can be resolved or dismissed. */
export function canCloseEscalation(status: RequestEscalationStatus): boolean {
  return status === "open";
}

export const ESCALATION_REASON_MAX = 1000;

/** Trim and bound an escalation reason; empty after trimming is not valid. */
export function normalizeEscalationReason(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length < 4) return null;
  return trimmed.slice(0, ESCALATION_REASON_MAX);
}
