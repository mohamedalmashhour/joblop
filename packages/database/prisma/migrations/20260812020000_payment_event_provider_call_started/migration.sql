-- Stage 2b.4-C1: additive audit/reconciliation fields on employer_payment_events so a
-- `provider_call_started` event, written ATOMICALLY with the `processing` claim, can carry the exact
-- in-flight operation (operation, requested amount, currency, provider identity, and the DIGEST of the
-- outbound idempotency key). Recording operation_amount_minor at claim time is what makes later
-- deterministic reconciliation of PARTIAL refunds safe (the attempt row only holds cumulative totals).
--
-- All columns are NULLABLE and additive: no default, no CHECK, no data rewrite. Existing event rows
-- (created / provider_webhook / finalize) are unaffected and leave these columns null. This does NOT
-- add or alter any CAD constraint. Reversible by dropping the five added columns.
ALTER TABLE "employer_payment_events"
  ADD COLUMN "operation" TEXT,
  ADD COLUMN "operation_amount_minor" BIGINT,
  ADD COLUMN "operation_currency" CHAR(3),
  ADD COLUMN "provider" TEXT,
  ADD COLUMN "idempotency_key_digest" CHAR(64);
