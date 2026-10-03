// Worker dispute (pure). A worker can dispute what they are owed for a finished shift (its payroll
// calculation / payout). While a dispute is open it PAUSES that payout: the payout moves to `held`
// and is never released until the dispute is resolved or withdrawn. Admin resolution is handled
// outside this module; here we only model the worker-side shape and the open/closed decision.

export type WorkerDisputeStatus = "open" | "resolved" | "withdrawn";

/** What a worker can dispute. Kept small and explicit so inputs are validated, not free-form. */
export const WORKER_DISPUTE_CATEGORIES = ["hours", "pay_amount", "conditions", "other"] as const;
export type WorkerDisputeCategory = (typeof WORKER_DISPUTE_CATEGORIES)[number];

export function isWorkerDisputeCategory(value: unknown): value is WorkerDisputeCategory {
  return typeof value === "string" && (WORKER_DISPUTE_CATEGORIES as readonly string[]).includes(value);
}

/** Only an open dispute pauses a payout. Resolved and withdrawn disputes do not. */
export function isOpenWorkerDispute(status: WorkerDisputeStatus): boolean {
  return status === "open";
}

/** Whether any dispute in the set is open (i.e. its payout must stay held). */
export function hasOpenWorkerDispute(statuses: readonly WorkerDisputeStatus[]): boolean {
  return statuses.some(isOpenWorkerDispute);
}

/** A worker may only withdraw a dispute that is still open. */
export function canWithdrawWorkerDispute(status: WorkerDisputeStatus): boolean {
  return status === "open";
}

/** Trim and bound the worker's free-text reason; empty after trimming is not a valid reason. */
export const WORKER_DISPUTE_REASON_MAX = 2000;
export function normalizeWorkerDisputeReason(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, WORKER_DISPUTE_REASON_MAX);
}
