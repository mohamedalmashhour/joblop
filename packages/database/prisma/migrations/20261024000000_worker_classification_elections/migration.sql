-- Two-channel pay (CRA / Revenu Québec): a worker's employee-vs-independent status becomes a signed,
-- append-only election instead of a mutable flag on worker_identities. A change supersedes the prior
-- active row and inserts a new one; the row history is the audit trail. Payroll reads the single
-- `active` row. See docs/finance/TWO_CHANNEL_PAYROLL_DESIGN.md.
--
-- Safety: additive only. Creates one new table; no column dropped, no data changed. The existing
-- worker_identities.classification column is left in place for now (Phase 1 backfills elections from
-- it and the payroll resolver is switched to read the active election in a later step).
CREATE TABLE "worker_classification_elections" (
    "id" UUID NOT NULL,
    "worker_identity_id" UUID NOT NULL,
    "classification" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "agreement_document_id" UUID,
    "agreement_version" TEXT,
    "determination_ref" TEXT,
    "reason" TEXT,
    "effective_from" TIMESTAMPTZ(3) NOT NULL,
    "effective_to" TIMESTAMPTZ(3),
    "elected_by_user_id" UUID NOT NULL,
    "approved_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
    CONSTRAINT "worker_classification_elections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "wce_worker_status_idx" ON "worker_classification_elections" ("worker_identity_id", "status");

-- At most one ACTIVE election per worker (the single source of truth payroll reads).
CREATE UNIQUE INDEX "wce_one_active_per_worker" ON "worker_classification_elections" ("worker_identity_id") WHERE "status" = 'active';

ALTER TABLE "worker_classification_elections" ADD CONSTRAINT "wce_classification_check" CHECK ("classification" IN ('employee', 'contractor'));
ALTER TABLE "worker_classification_elections" ADD CONSTRAINT "wce_status_check" CHECK ("status" IN ('active', 'superseded', 'revoked'));

ALTER TABLE "worker_classification_elections"
    ADD CONSTRAINT "wce_worker_fk" FOREIGN KEY ("worker_identity_id") REFERENCES "worker_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
