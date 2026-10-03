// Worker payout lifecycle (pure). The platform owes the worker their W-based net pay for a locked
// payroll calculation. The amount is held for a fixed period (anchored to the pay-period end as the
// practical stand-in for "two weeks after the work"), then released automatically — unless a dispute
// is open, which pauses it. Release only clears the money to be sent; the external Interac/EFT send
// and its confirmation ("paid") are a provider integration handled outside this module.

export type WorkerPayoutStatus = "pending" | "released" | "paid" | "held" | "cancelled";

/** The hold period before a worker payout is released, in days. */
export const WORKER_PAYOUT_HOLD_DAYS = 14;

const DAY_MS = 86_400_000;

/** When a payout anchored at `anchorMs` (the pay-period end) becomes releasable. */
export function workerPayoutHoldUntilMs(anchorMs: number): number {
  return anchorMs + WORKER_PAYOUT_HOLD_DAYS * DAY_MS;
}

/**
 * Whether a pending payout may be released now: the hold must have elapsed and no dispute may be open.
 * A payout that is already released/paid/held/cancelled is never (re-)released here.
 */
export function canReleaseWorkerPayout(input: {
  status: WorkerPayoutStatus;
  holdUntilMs: number;
  nowMs: number;
  hasOpenDispute: boolean;
}): boolean {
  if (input.status !== "pending") return false;
  if (input.hasOpenDispute) return false;
  return input.nowMs >= input.holdUntilMs;
}

/**
 * The status a payout should move to given the current world. Pure decision helper:
 *  - an open dispute on a pending payout -> held;
 *  - a pending payout whose hold has elapsed and has no dispute -> released;
 *  - a held payout whose dispute has resolved -> back to pending (the hold is re-evaluated);
 *  - otherwise unchanged.
 */
export function nextWorkerPayoutStatus(input: {
  status: WorkerPayoutStatus;
  holdUntilMs: number;
  nowMs: number;
  hasOpenDispute: boolean;
}): WorkerPayoutStatus {
  if (input.status === "pending" && input.hasOpenDispute) return "held";
  if (input.status === "held" && !input.hasOpenDispute) return "pending";
  if (canReleaseWorkerPayout(input)) return "released";
  return input.status;
}
