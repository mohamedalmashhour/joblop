-- CreateEnum: worker payout lifecycle
CREATE TYPE "WorkerPayoutStatus" AS ENUM ('pending', 'released', 'paid', 'held', 'cancelled');

-- CreateTable: worker_payouts — the money owed to a worker for a locked payroll calculation (net pay,
-- W-based) and its release lifecycle. The two-week hold anchors to the pay-period end; release is
-- automatic once the hold elapses with no open dispute; a dispute moves it to held. The actual
-- Interac/EFT send is a provider integration wired separately.
CREATE TABLE "worker_payouts" (
    "id" UUID NOT NULL,
    "worker_identity_id" UUID NOT NULL,
    "payroll_calculation_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "currency" TEXT NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "status" "WorkerPayoutStatus" NOT NULL DEFAULT 'pending',
    "hold_until" TIMESTAMPTZ(3) NOT NULL,
    "released_at" TIMESTAMPTZ(3),
    "paid_at" TIMESTAMPTZ(3),
    "held_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "worker_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "worker_payouts_payroll_calculation_id_key" ON "worker_payouts"("payroll_calculation_id");

-- CreateIndex
CREATE INDEX "worker_payouts_worker_status_idx" ON "worker_payouts"("worker_identity_id", "status");

-- CreateIndex
CREATE INDEX "worker_payouts_status_hold_idx" ON "worker_payouts"("status", "hold_until");

-- AddForeignKey
ALTER TABLE "worker_payouts" ADD CONSTRAINT "worker_payouts_worker_identity_id_fkey" FOREIGN KEY ("worker_identity_id") REFERENCES "worker_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
