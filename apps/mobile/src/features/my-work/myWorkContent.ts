// Pure labels + copy for the worker's "My Shifts" screen (their real applications + confirmed
// assignments). UI-free so the status mapping is unit-tested without React Native.

export type BadgeTone = "neutral" | "success" | "warning" | "danger";

const INTEREST_LABELS: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  not_selected: "Not selected",
  withdrawn: "Withdrawn",
  offer_created: "Offer sent to you",
  offer_accepted: "Offer accepted"
};

const INTEREST_TONES: Record<string, BadgeTone> = {
  submitted: "neutral",
  under_review: "neutral",
  shortlisted: "success",
  not_selected: "danger",
  withdrawn: "warning",
  offer_created: "success",
  offer_accepted: "success"
};

export function interestStatusLabel(status: string): string {
  return INTEREST_LABELS[status] ?? status;
}

export function interestStatusTone(status: string): BadgeTone {
  return INTEREST_TONES[status] ?? "neutral";
}

const ASSIGNMENT_LABELS: Record<string, string> = {
  pending_validation: "Pending",
  confirmed: "Confirmed",
  worker_acknowledged: "Acknowledged",
  ready_for_attendance: "Ready to start",
  in_attendance_window: "In progress",
  attendance_handoff: "Wrapping up",
  worker_withdrawn: "Withdrawn",
  employer_cancelled: "Cancelled",
  platform_cancelled: "Cancelled",
  replacement_required: "Needs replacement",
  expired_before_start: "Expired",
  closed: "Closed"
};

const ASSIGNMENT_TONES: Record<string, BadgeTone> = {
  pending_validation: "neutral",
  confirmed: "success",
  worker_acknowledged: "success",
  ready_for_attendance: "success",
  in_attendance_window: "success",
  attendance_handoff: "neutral",
  worker_withdrawn: "warning",
  employer_cancelled: "danger",
  platform_cancelled: "danger",
  replacement_required: "warning",
  expired_before_start: "danger",
  closed: "neutral"
};

export function assignmentStatusLabel(status: string): string {
  return ASSIGNMENT_LABELS[status] ?? status;
}

export function assignmentStatusTone(status: string): BadgeTone {
  return ASSIGNMENT_TONES[status] ?? "neutral";
}

export const myWorkCopy = {
  title: "My shifts",
  intro: "Your applications to open shifts and the shifts you've been confirmed for. This reflects real activity on your account; it never guarantees an assignment.",
  signInRequired: "Sign in to see your applications and confirmed shifts.",
  applicationsTitle: "My applications",
  applicationsEmpty: "You haven't applied to any open shifts yet.",
  assignmentsTitle: "My confirmed shifts",
  assignmentsEmpty: "You have no confirmed shifts yet.",
  loadError: "This could not be loaded right now.",
  offerSentNote: "An offer linked to this application is waiting in your Calendar."
} as const;
