// Worker late-cancellation penalty policy.
//
// Owner policy: if a worker cancels a CONFIRMED job within 24h of its start time, their account is
// suspended for 1 week; if they do it again, the account is closed permanently.
//
// This capsule is PURE and only CLASSIFIES — it decides what penalty the policy calls for. It never
// disables or closes an account itself; enforcement is a governed admin action that reads this. That
// separation matters: closing an account is irreversible, so a human admin applies it.

export const WORKER_CANCEL_CUTOFF_HOURS = 24; // within 24h of start is a "late" worker cancellation
export const WORKER_SUSPENSION_DAYS = 7; // first offence: 1-week suspension

export type WorkerCancellationPenalty = Readonly<{
  penalty: "none" | "suspend" | "permanent_close";
  suspensionDays: number; // 0 unless penalty === "suspend"
  reason: "outside_cutoff_window" | "first_late_cancellation" | "repeat_late_cancellation";
  hoursBeforeStart: number;
}>;

function hoursBeforeShiftStart(shiftStartIso: string, nowIso: string): number {
  const start = Date.parse(shiftStartIso);
  const now = Date.parse(nowIso);
  if (!Number.isFinite(start) || !Number.isFinite(now)) {
    throw new Error("A valid shift start and current time are required.");
  }
  return (start - now) / (1000 * 60 * 60);
}

// priorLateCancellations = how many LATE cancellations this worker already has on record (before
// this one). 0 → first offence → 7-day suspension; >= 1 → repeat → permanent close.
export function deriveWorkerCancellationPenalty(input: {
  shiftStartIso: string;
  nowIso: string;
  priorLateCancellations: number;
}): WorkerCancellationPenalty {
  if (!Number.isInteger(input.priorLateCancellations) || input.priorLateCancellations < 0) {
    throw new Error("priorLateCancellations must be a non-negative integer.");
  }
  const hoursBeforeStart = hoursBeforeShiftStart(input.shiftStartIso, input.nowIso);

  // On-time cancellation (>= 24h before start, or after it already started is handled as no-show
  // elsewhere): no penalty under this rule.
  if (hoursBeforeStart >= WORKER_CANCEL_CUTOFF_HOURS) {
    return { penalty: "none", suspensionDays: 0, reason: "outside_cutoff_window", hoursBeforeStart };
  }
  if (input.priorLateCancellations >= 1) {
    return { penalty: "permanent_close", suspensionDays: 0, reason: "repeat_late_cancellation", hoursBeforeStart };
  }
  return { penalty: "suspend", suspensionDays: WORKER_SUSPENSION_DAYS, reason: "first_late_cancellation", hoursBeforeStart };
}
