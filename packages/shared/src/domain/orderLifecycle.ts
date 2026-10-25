// Order lifecycle capsule — the single, shared derivation of where an order stands, for both the
// admin Control Room and the client calendar. It maps the underlying governed signals (worker
// coverage, timesheet lock, invoice, payment, payout, disputes) onto the owner's order states:
//   pending → accepted → processing → finished, with disputed/cancelled as overrides.
// Pure and deterministic — no DB, no money. Money-moving signals (paymentCaptured, payoutTransferred)
// are facts the caller passes in; this capsule never executes anything, it only classifies.

export type OrderLifecycleState =
  | "pending" // approved/published, no worker has accepted yet
  | "accepted" // a worker accepted; work not yet underway
  | "processing" // work underway or done and in the money flow (invoiced / payment held)
  | "finished" // worker paid out — the transaction is complete
  | "disputed" // an open dispute on the order (overrides, except cancelled)
  | "cancelled"; // the request was cancelled/expired

export type OrderLifecycleSignals = Readonly<{
  jobStatus: string; // the authoritative job_request status
  activeWorkerCount?: number; // confirmed/active assignments
  requestedWorkerCount?: number;
  attendanceUnderway?: boolean; // check-in happened / attendance window open
  timesheetLocked?: boolean; // hours finalized
  invoiceIssued?: boolean; // client invoice generated
  paymentCaptured?: boolean; // client payment received + held (gated/synthetic)
  payoutTransferred?: boolean; // worker paid out (gated/synthetic)
  hasOpenDispute?: boolean;
}>;

const CANCELLED_JOB_STATUSES = new Set(["cancelled", "expired"]);

export function deriveOrderLifecycle(signals: OrderLifecycleSignals): OrderLifecycleState {
  if (CANCELLED_JOB_STATUSES.has(signals.jobStatus)) return "cancelled";
  if (signals.hasOpenDispute) return "disputed";
  if (signals.payoutTransferred) return "finished";

  const active = signals.activeWorkerCount ?? 0;
  const requested = Math.max(1, signals.requestedWorkerCount ?? 1);
  const fullyStaffed = active >= requested;

  // Work is done or in motion once hours are locked, an invoice exists, payment is held, or
  // attendance is underway — the order is "processing" through to payout.
  if (signals.timesheetLocked || signals.invoiceIssued || signals.paymentCaptured || signals.attendanceUnderway) {
    return "processing";
  }
  if (fullyStaffed) return "accepted";
  return "pending";
}

export type OrderLifecycleCopy = Readonly<{ label: string; description: string }>;

// UI copy (English; the client calendar localizes its own status chips separately).
export function orderLifecycleCopy(state: OrderLifecycleState): OrderLifecycleCopy {
  switch (state) {
    case "pending":
      return { label: "Pending", description: "Approved and open to workers; no one has accepted yet." };
    case "accepted":
      return { label: "Accepted", description: "A worker accepted. The shift is confirmed." };
    case "processing":
      return { label: "Processing", description: "Work is underway or done; invoicing and payment in progress." };
    case "finished":
      return { label: "Finished", description: "The worker has been paid. The transaction is complete." };
    case "disputed":
      return { label: "Disputed", description: "An open dispute is being resolved before settlement." };
    case "cancelled":
      return { label: "Cancelled", description: "This order was cancelled or expired." };
  }
}
