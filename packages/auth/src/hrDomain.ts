// HR domain — pure rules (no I/O), so expiry + lifecycle behavior is deterministic + testable.

export type HrStanding = "active" | "review_required" | "restricted" | "suspended" | "inactive";
export type HrCredentialStatus = "valid" | "expiring" | "expired" | "renewed" | "replaced" | "revoked";
export type HrCaseStatus = "opened" | "under_review" | "action_required" | "resolved" | "closed";

export const HR_STANDINGS: readonly HrStanding[] = ["active", "review_required", "restricted", "suspended", "inactive"];

// Standings in which a worker is considered in "good standing" (a possible eligibility input
// later — HR-1 keeps eligibility permissive).
export function isGoodStanding(standing: HrStanding): boolean {
  return standing === "active";
}

// Terminal credential statuses represent history and are never recomputed from expiry.
const TERMINAL_CREDENTIAL_STATUSES: readonly HrCredentialStatus[] = ["renewed", "replaced", "revoked"];

export const DEFAULT_CREDENTIAL_WARNING_DAYS = 30;

// Derive the effective credential status at read time. Expiry is first-class: a once-valid
// credential is NEVER permanently valid. Terminal (history) statuses are preserved as-is.
export function deriveCredentialStatus(input: {
  storedStatus: HrCredentialStatus;
  expiresAt: string | null;
  now: Date;
  warningDays?: number;
}): HrCredentialStatus {
  if (TERMINAL_CREDENTIAL_STATUSES.includes(input.storedStatus)) return input.storedStatus;
  if (!input.expiresAt) return "valid";
  const expires = new Date(input.expiresAt).getTime();
  const now = input.now.getTime();
  if (expires <= now) return "expired";
  const warningMs = (input.warningDays ?? DEFAULT_CREDENTIAL_WARNING_DAYS) * 24 * 60 * 60 * 1000;
  if (expires <= now + warningMs) return "expiring";
  return "valid";
}

// Governed case lifecycle: opened → under_review → action_required → resolved/closed.
const CASE_TRANSITIONS: Record<HrCaseStatus, readonly HrCaseStatus[]> = {
  opened: ["under_review", "closed"],
  under_review: ["action_required", "resolved", "closed"],
  action_required: ["under_review", "resolved", "closed"],
  resolved: ["closed"],
  closed: []
};

export function canTransitionCase(from: HrCaseStatus, to: HrCaseStatus): boolean {
  return CASE_TRANSITIONS[from].includes(to);
}

// A standing change is a governed decision; any normalized standing is a legal target (the
// authority + audit are what make it valid), but the value itself must be a known standing.
export function isValidStanding(value: string): value is HrStanding {
  return (HR_STANDINGS as readonly string[]).includes(value);
}
