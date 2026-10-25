-- Finance readiness: persist the worker compensation (3h) alongside the client obligation (6h) on a
-- late cancellation, so the governed Finance ledger carries both when FINANCE_LIVE opens. No money.
ALTER TABLE "employer_cancellation_obligations"
  ADD COLUMN "worker_compensation_minor" INTEGER NOT NULL DEFAULT 0;
