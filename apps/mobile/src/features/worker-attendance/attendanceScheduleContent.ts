// Pure labels + action gating for the worker's real attendance schedule. UI-free so the status and
// check-in/out gating are unit-tested without React Native. The backend remains authoritative — it
// enforces the attendance-window policy and rejects an out-of-window action; this only decides which
// button to offer, from the record's own timestamps.

export type BadgeTone = "neutral" | "success" | "warning" | "danger";

const LABELS: Record<string, string> = {
  pending_start: "Not started",
  checked_in: "Checked in",
  checked_out: "Checked out",
  completed: "Completed",
  missed: "Missed",
  cancelled: "Cancelled",
  exception: "Needs review"
};

const TONES: Record<string, BadgeTone> = {
  pending_start: "neutral",
  checked_in: "success",
  checked_out: "success",
  completed: "success",
  missed: "danger",
  cancelled: "danger",
  exception: "warning"
};

export function attendanceStatusLabel(status: string): string {
  return LABELS[status] ?? status;
}

export function attendanceStatusTone(status: string): BadgeTone {
  return TONES[status] ?? "neutral";
}

export type AttendanceAction = "check_in" | "check_out" | "none";

/** Which action the worker can take, from the record's timestamps. A terminal record offers none. */
export function attendanceAction(record: { status: string; checkInAt: string | null; checkOutAt: string | null }): AttendanceAction {
  if (record.status === "cancelled" || record.status === "missed" || record.status === "completed") return "none";
  if (record.checkInAt === null) return "check_in";
  if (record.checkOutAt === null) return "check_out";
  return "none";
}

export const attendanceCopy = {
  title: "My schedule",
  intro: "Your upcoming and recent shifts. Check in when you arrive and check out when you finish — your check-in/out times feed your timesheet.",
  signInRequired: "Sign in to see your schedule and check in to shifts.",
  empty: "You have no scheduled shifts yet.",
  loadError: "Your schedule could not be loaded right now.",
  checkInCta: "Check in",
  checkOutCta: "Check out",
  conflict: "That couldn't be done right now — your shift may be outside its check-in window. Pull to refresh.",
  denied: "Sign in required.",
  actionError: "That couldn't be completed right now."
} as const;
