-- Money-flow Phase 2 (two-timer hold): add the 48h dispute/confirmation window anchors to worker_payouts.
-- completion_at is the JOB COMPLETION anchor (latest shift end across the calculation's worked time) the
-- 48h window counts from; registered_at is set when that window closes clean and the amount becomes
-- CONFIRMED / "registered in the worker's account" (and the worker is notified). Both nullable and
-- additive — safe for existing rows (completion_at backfills on read; registered_at is set once). The
-- separate 14-day transfer hold (hold_until, period-end anchored) is unchanged and now applies only
-- after a payout is registered.
ALTER TABLE "worker_payouts" ADD COLUMN "completion_at" TIMESTAMPTZ(3);
ALTER TABLE "worker_payouts" ADD COLUMN "registered_at" TIMESTAMPTZ(3);
