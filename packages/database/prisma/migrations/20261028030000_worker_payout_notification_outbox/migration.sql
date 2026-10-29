-- Money-flow Phase 2 (reliable notification): durable delivery markers for the two worker-payout
-- notices, so a failed or never-attempted send is retried by the background progression job until it
-- is delivered, and never sent twice. Both nullable and additive: a null marker means "not yet
-- delivered" (the retry sweep will attempt it); the marker is stamped once the send succeeds.
ALTER TABLE "worker_payouts" ADD COLUMN "registered_notified_at" TIMESTAMPTZ(3);
ALTER TABLE "worker_payouts" ADD COLUMN "paid_notified_at" TIMESTAMPTZ(3);
