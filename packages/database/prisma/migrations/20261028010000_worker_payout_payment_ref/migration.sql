-- Money-flow Phase 2: record the TEST payment reference on a worker payout when it is marked paid via
-- the gated test-mode execution (a Stripe TEST transfer id when a test connected account is configured,
-- otherwise a synthetic reference). Never a real (live) send. Null until paid.
ALTER TABLE "worker_payouts" ADD COLUMN "payment_ref" TEXT;
