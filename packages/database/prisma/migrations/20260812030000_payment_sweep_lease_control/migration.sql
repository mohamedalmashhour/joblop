-- Stage 2b.4-C3-F4 (G-a): durable safety infrastructure for the aged-processing reconciliation
-- sweeper. Two additive tables, no changes to any existing table, no CHECK, no default rewrite, no
-- data movement. This adds NO scheduler, NO provider binding, and does NOT activate anything.
--
-- payment_sweep_lease: the durable cross-instance lease. One row per logical lock name. Acquisition
-- is a single atomic INSERT ... ON CONFLICT DO UPDATE ... WHERE (owner IS NULL OR expired), so two
-- workers can never both hold the same valid lease and an expired lease is reclaimed atomically. The
-- fencing_token increments on every acquisition, so a stalled previous owner cannot release or act
-- after ownership changed. The lease is defense-in-depth; it never moves money and never replaces the
-- existing optimistic payment version/state guards.
CREATE TABLE "payment_sweep_lease" (
  "name" TEXT NOT NULL,
  "owner" TEXT,
  "fencing_token" BIGINT NOT NULL DEFAULT 0,
  "acquired_at" TIMESTAMPTZ(3),
  "expires_at" TIMESTAMPTZ(3),
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_sweep_lease_pkey" PRIMARY KEY ("name")
);

-- payment_sweep_control: the durable, fail-closed kill switch. enabled defaults to false (OFF); a
-- MISSING row is also treated as OFF by the reader. Operators flip this row to enable/disable the
-- sweeper WITHOUT an application deployment. Checked before candidate selection / reconciliation.
CREATE TABLE "payment_sweep_control" (
  "name" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_sweep_control_pkey" PRIMARY KEY ("name")
);
