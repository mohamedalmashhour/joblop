// Pure labels + review gating for the worker's real timesheet list. UI-free so the mapping is
// unit-tested without React Native. The backend stays authoritative — it enforces the state machine
// and rejects a review action that isn't allowed; this only decides which buttons to offer.

export type BadgeTone = "neutral" | "success" | "warning" | "danger";

const LABELS: Record<string, string> = {
  draft: "Draft",
  calculation_pending: "Calculating",
  review_required: "Review required",
  worker_review: "Your review",
  employer_review: "Employer review",
  platform_review: "Platform review",
  approved: "Approved",
  locked: "Finalised",
  rejected: "Rejected",
  correction_required: "Correction needed",
  cancelled: "Cancelled"
};

const TONES: Record<string, BadgeTone> = {
  draft: "neutral",
  calculation_pending: "neutral",
  review_required: "warning",
  worker_review: "warning",
  employer_review: "neutral",
  platform_review: "neutral",
  approved: "success",
  locked: "success",
  rejected: "danger",
  correction_required: "warning",
  cancelled: "danger"
};

export function timesheetStatusLabel(status: string): string {
  return LABELS[status] ?? status;
}

export function timesheetStatusTone(status: string): BadgeTone {
  return TONES[status] ?? "neutral";
}

/** The worker can confirm/dispute only while the timesheet is awaiting THEIR review. */
export function canWorkerReview(status: string): boolean {
  return status === "worker_review";
}

/** Payable time as "6h 30m" from minutes; "—" when not yet computed. */
export function formatMinutes(minutes: number | null): string {
  if (minutes === null || minutes < 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export const timesheetCopy = {
  title: "My timesheets",
  intro: "The recorded time for your shifts. When a timesheet is awaiting your review, confirm it if it's right or dispute it if something's wrong. This never calculates payroll or pays you.",
  signInRequired: "Sign in to review your timesheets.",
  empty: "You have no timesheets yet.",
  loadError: "Your timesheets could not be loaded right now.",
  payableLabel: "Payable time",
  confirmCta: "Confirm time",
  disputeCta: "Dispute",
  disputeReasonLabel: "What's wrong?",
  disputeReasonPlaceholder: "Briefly describe the issue",
  conflict: "That couldn't be done — the timesheet may have moved on. Pull to refresh.",
  invalid: "Add a short reason to dispute.",
  actionError: "That couldn't be completed right now."
} as const;
