import { createStripeTestClient } from "./stripeTestProvider";
import { stripeTestEnvFromProcess } from "./cvProStripeCheckout";

// Money-flow Phase 2 — worker payout execution via Stripe, TEST MODE ONLY. Mirrors the Phase 1
// employer-invoice checkout: reuse the shared Stripe test provider, which refuses any non-`sk_test_`
// secret, so no live transfer can ever be created here. A payout "paid" is one of two TEST outcomes:
//   • a Stripe TEST transfer (tr_...) to a configured TEST connected account (acct_...), or
//   • a recorded SYNTHETIC reference when no connected account is configured.
// It never moves real funds and never reads FINANCE_LIVE_ENABLED. The correlation metadata on the
// Stripe object is our opaque payout id + worker reference — never any raw payment data.
//
// Real-Stripe-payout follow-up (OUT OF SCOPE here, needs money-transmitter/payout licensing + KYC/AML
// + CPA sign-off): a production payout would use Stripe Connect transfers/payouts to a verified,
// onboarded connected account, reconciled by `transfer.*`/`payout.*` webhooks. This module keeps the
// shape (destination connected account + metadata) so that path can be wired without re-architecting.

export type WorkerPayoutTransferMode = "stripe_transfer" | "synthetic";

export type WorkerPayoutTransferResult = Readonly<{
  reference: string;
  mode: WorkerPayoutTransferMode;
}>;

/** Resolve the configured TEST connected account (acct_...), if any. */
export function testPayoutConnectedAccountFromProcess(): string | undefined {
  const value = process.env.STRIPE_TEST_PAYOUT_CONNECTED_ACCOUNT?.trim();
  return value && value.startsWith("acct_") ? value : undefined;
}

/** Execute a TEST payout for a released worker payout. Attempts a Stripe TEST transfer only when a
 *  TEST connected account is configured; otherwise records a synthetic reference. Idempotent per
 *  payout via the Stripe idempotency key. Returns the reference to store on the payout ledger row. */
export async function createWorkerPayoutTransfer(input: {
  payoutId: string;
  workerReference: string;
  amountMinor: number;
  currency: string;
}): Promise<WorkerPayoutTransferResult> {
  // Live mode is collection-only: real payouts need Connect onboarding, licensing and CPA review.
  if (process.env.STRIPE_LIVE_MODE_ENABLED === "enabled") {
    throw new Error("Worker payouts are not available in Stripe live mode.");
  }
  const connectedAccount = testPayoutConnectedAccountFromProcess();
  if (!connectedAccount) {
    // No TEST connected account onboarded — record a synthetic, clearly-labelled test reference. This
    // is the realistic default on a plain Stripe TEST sandbox (no Connect connected accounts).
    return { reference: `payout-test-synthetic-${input.payoutId}`, mode: "synthetic" };
  }

  // A real Stripe TEST transfer to the configured TEST connected account. Still test-mode only: the
  // client rejects any non-`sk_test_` secret, so this can never move live funds.
  const client = createStripeTestClient(stripeTestEnvFromProcess());
  const transfer = await client.transfers.create(
    {
      amount: input.amountMinor,
      currency: input.currency.toLowerCase(),
      destination: connectedAccount,
      transfer_group: `worker-payout-${input.payoutId}`,
      metadata: { workerPayoutId: input.payoutId, workerReference: input.workerReference }
    },
    { idempotencyKey: `worker-payout-transfer-${input.payoutId}` }
  );
  return { reference: transfer.id, mode: "stripe_transfer" };
}
