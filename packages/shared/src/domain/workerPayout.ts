// Worker payout lifecycle (pure). The platform owes the worker their W-based net pay for a locked
// payroll calculation. There are TWO distinct timers, anchored on two different events:
//
//  1. DISPUTE / CONFIRMATION WINDOW — 48 hours anchored on JOB COMPLETION (the shift/assignment end).
//     During this window the money is NOT yet the worker's to count on: the client may still flag
//     something wrong. If a dispute is raised, the payout is paused (held). After 48h with no dispute,
//     the amount is CONFIRMED / "registered in the worker's account" and the worker is notified then.
//
//  2. TRANSFER HOLD — 14 days anchored on the PAY-PERIOD END (the practical stand-in for "two weeks
//     after the work" while payroll aggregates per period). Only AFTER the payout is registered does
//     this hold gate the actual release → the external (TEST) send that moves the money.
//
// Lifecycle: finish → 48h dispute window → (no dispute) → REGISTERED + notify worker → 14-day hold →
// released → paid. A dispute at any open point pauses the payout (held). Release only clears the money
// to be sent; the external send and its confirmation ("paid") are a provider integration handled
// outside this module.

export type WorkerPayoutStatus = "pending" | "released" | "paid" | "held" | "cancelled";

/** The transfer hold before a registered payout is released, in days (anchored on pay-period end). */
export const WORKER_PAYOUT_HOLD_DAYS = 14;

/** The dispute/confirmation window before a payout is registered, in hours (anchored on job completion). */
export const WORKER_PAYOUT_DISPUTE_WINDOW_HOURS = 48;

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

/** When a payout anchored at `anchorMs` (the pay-period end) becomes releasable for transfer. */
export function workerPayoutHoldUntilMs(anchorMs: number): number {
  return anchorMs + WORKER_PAYOUT_HOLD_DAYS * DAY_MS;
}

/** When a payout anchored at `completionMs` (the job completion / shift end) may be registered — i.e.
 *  the 48h dispute window has elapsed. Before this the worker must NOT be told the money is theirs. */
export function workerPayoutRegisterableAtMs(completionMs: number): number {
  return completionMs + WORKER_PAYOUT_DISPUTE_WINDOW_HOURS * HOUR_MS;
}

/**
 * Whether a payout may be REGISTERED now: the 48h dispute window (from job completion) must have
 * elapsed, it must still be pending and not yet registered, and no dispute may be open. Registration
 * is the moment the amount becomes confirmed/"registered in the worker's account".
 */
export function canRegisterWorkerPayout(input: {
  status: WorkerPayoutStatus;
  isRegistered: boolean;
  completionMs: number;
  nowMs: number;
  hasOpenDispute: boolean;
}): boolean {
  if (input.status !== "pending") return false;
  if (input.isRegistered) return false;
  if (input.hasOpenDispute) return false;
  return input.nowMs >= workerPayoutRegisterableAtMs(input.completionMs);
}

/**
 * Whether a pending payout may be released for transfer now: it must already be REGISTERED (the 48h
 * dispute window closed clean), the 14-day transfer hold must have elapsed, and no dispute may be open.
 * A payout that is already released/paid/held/cancelled is never (re-)released here.
 */
export function canReleaseWorkerPayout(input: {
  status: WorkerPayoutStatus;
  isRegistered: boolean;
  holdUntilMs: number;
  nowMs: number;
  hasOpenDispute: boolean;
}): boolean {
  if (input.status !== "pending") return false;
  if (!input.isRegistered) return false;
  if (input.hasOpenDispute) return false;
  return input.nowMs >= input.holdUntilMs;
}

/**
 * The status a payout should move to given the current world. Pure decision helper:
 *  - an open dispute on a pending payout -> held;
 *  - a held payout whose dispute has resolved -> back to pending (the windows are re-evaluated);
 *  - a REGISTERED pending payout whose transfer hold has elapsed and has no dispute -> released;
 *  - otherwise unchanged.
 * Registration (the 48h confirmation step) is a separate, timestamp-driven transition — see
 * canRegisterWorkerPayout — and is not expressed as a status here.
 */
export function nextWorkerPayoutStatus(input: {
  status: WorkerPayoutStatus;
  isRegistered: boolean;
  holdUntilMs: number;
  nowMs: number;
  hasOpenDispute: boolean;
}): WorkerPayoutStatus {
  if (input.status === "pending" && input.hasOpenDispute) return "held";
  if (input.status === "held" && !input.hasOpenDispute) return "pending";
  if (canReleaseWorkerPayout(input)) return "released";
  return input.status;
}

/**
 * The worker-facing stage of a payout: the three stages the worker should see, plus the paused state.
 *  - "review_window": within the 48h dispute window — NOT yet confirmed earnings;
 *  - "registered": confirmed/"registered in your account", awaiting the transfer (incl. released);
 *  - "paid": transferred;
 *  - "held": paused by an open dispute;
 *  - "cancelled".
 */
export type WorkerPayoutStage = "review_window" | "registered" | "paid" | "held" | "cancelled";

export function workerPayoutStage(input: {
  status: WorkerPayoutStatus;
  isRegistered: boolean;
}): WorkerPayoutStage {
  if (input.status === "paid") return "paid";
  if (input.status === "cancelled") return "cancelled";
  if (input.status === "held") return "held";
  // pending or released: registered → "registered" (awaiting transfer), else still in the review window.
  return input.isRegistered ? "registered" : "review_window";
}
