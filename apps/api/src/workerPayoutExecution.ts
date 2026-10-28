import type { PrismaClient } from "@rwos/database";
import { isStripeTestConfigured } from "./cvProStripeCheckout";
import { createWorkerPayoutTransfer, type WorkerPayoutTransferMode } from "./workerPayoutStripeTransfer";

// Money-flow Phase 2 — worker payout TEST execution orchestration. Mirrors the Phase 1 employer-invoice
// collection: a gated, idempotent transition of an already-RELEASED worker payout to `paid`, recording
// the TEST payment reference. Everything here is gated behind PAYOUT_TEST_MODE_ENABLED *and* the Stripe
// TEST keys. FINANCE_LIVE_ENABLED is never consulted or touched; this path cannot move real money.
//
// The released→paid eligibility (two-week hold elapsed, no open dispute) is owned by the existing pure
// lifecycle (workerPayoutRepository / @rwos/shared workerPayout). This module only executes the
// terminal money step for a payout the lifecycle has already moved to `released`.

/** Whether the worker-payout Stripe TEST execution path is enabled. Default OFF. */
export function isPayoutTestExecutionEnabled(): boolean {
  return process.env.PAYOUT_TEST_MODE_ENABLED === "enabled";
}

export type PayoutExecutionView = Readonly<{
  id: string;
  workerIdentityId: string;
  amountMinor: number;
  currency: string;
  status: string;
  paymentRef: string | null;
  paidAt: string | null;
  mode: WorkerPayoutTransferMode | "already_paid";
}>;

export type ExecutePayoutResult =
  | { ok: true; payout: PayoutExecutionView }
  | {
      ok: false;
      reason:
        | "execution_disabled"
        | "stripe_unconfigured"
        | "payout_not_found"
        | "payout_not_released"
        | "conflict";
    };

type PayoutRow = {
  id: string;
  workerIdentityId: string;
  amountMinor: number;
  currency: string;
  status: string;
  paymentRef: string | null;
  paidAt: Date | null;
};

function toView(row: PayoutRow, mode: PayoutExecutionView["mode"]): PayoutExecutionView {
  return {
    id: row.id,
    workerIdentityId: row.workerIdentityId,
    amountMinor: row.amountMinor,
    currency: row.currency,
    status: row.status,
    paymentRef: row.paymentRef,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    mode
  };
}

/** Execute a TEST payout: mark a RELEASED payout `paid` via a Stripe TEST transfer (to a configured
 *  test connected account) or a recorded synthetic reference. Never trusts a client amount — the
 *  amount comes from the ledger row. Idempotent: a payout already `paid` returns success unchanged. */
export async function executeTestWorkerPayout(
  prisma: PrismaClient,
  input: { payoutId: string }
): Promise<ExecutePayoutResult> {
  if (!isPayoutTestExecutionEnabled()) return { ok: false, reason: "execution_disabled" };
  if (!isStripeTestConfigured()) return { ok: false, reason: "stripe_unconfigured" };

  const row = (await prisma.workerPayout.findUnique({
    where: { id: input.payoutId },
    select: {
      id: true,
      workerIdentityId: true,
      amountMinor: true,
      currency: true,
      status: true,
      paymentRef: true,
      paidAt: true
    }
  })) as PayoutRow | null;
  if (!row) return { ok: false, reason: "payout_not_found" };

  // Already settled (a prior execution got there first) → idempotent success, no second transfer.
  if (row.status === "paid") return { ok: true, payout: toView(row, "already_paid") };

  // Only a RELEASED payout may be paid: the hold must have elapsed with no open dispute. A pending,
  // held, or cancelled payout is refused here (surfacing it is the lifecycle's job, not this module's).
  if (row.status !== "released") return { ok: false, reason: "payout_not_released" };

  const transfer = await createWorkerPayoutTransfer({
    payoutId: row.id,
    workerReference: row.workerIdentityId,
    amountMinor: row.amountMinor,
    currency: row.currency
  });

  // Status-guarded write — only flip a row that is still `released`, so a concurrent executor cannot
  // double-pay. If the guard matched nothing, re-read: if it is now paid, treat as idempotent success.
  const paidAt = new Date();
  const updated = await prisma.workerPayout.updateMany({
    where: { id: row.id, status: "released" },
    data: { status: "paid", paidAt, paymentRef: transfer.reference }
  });
  if (updated.count === 0) {
    const reread = (await prisma.workerPayout.findUnique({
      where: { id: row.id },
      select: {
        id: true,
        workerIdentityId: true,
        amountMinor: true,
        currency: true,
        status: true,
        paymentRef: true,
        paidAt: true
      }
    })) as PayoutRow | null;
    if (reread && reread.status === "paid") return { ok: true, payout: toView(reread, "already_paid") };
    return { ok: false, reason: "conflict" };
  }

  return {
    ok: true,
    payout: toView(
      { ...row, status: "paid", paidAt, paymentRef: transfer.reference },
      transfer.mode
    )
  };
}
