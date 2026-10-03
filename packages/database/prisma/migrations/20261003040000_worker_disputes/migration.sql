-- CreateEnum: worker dispute lifecycle
CREATE TYPE "WorkerDisputeStatus" AS ENUM ('open', 'resolved', 'withdrawn');

-- CreateTable: worker_disputes — a worker contests what they are owed for a finished shift (its
-- payroll calculation / payout). While a dispute is open it pauses that payout (the payout moves to
-- held and is never released until the dispute is resolved or withdrawn). Linked by
-- payroll_calculation_id (1:1 with a worker_payouts row). Admin resolution is handled separately.
CREATE TABLE "worker_disputes" (
    "id" UUID NOT NULL,
    "worker_identity_id" UUID NOT NULL,
    "payroll_calculation_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "status" "WorkerDisputeStatus" NOT NULL DEFAULT 'open',
    "category" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "resolution" TEXT,
    "resolved_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "worker_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "worker_disputes_worker_status_idx" ON "worker_disputes"("worker_identity_id", "status");

-- CreateIndex
CREATE INDEX "worker_disputes_calc_status_idx" ON "worker_disputes"("payroll_calculation_id", "status");

-- AddForeignKey
ALTER TABLE "worker_disputes" ADD CONSTRAINT "worker_disputes_worker_identity_id_fkey" FOREIGN KEY ("worker_identity_id") REFERENCES "worker_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
