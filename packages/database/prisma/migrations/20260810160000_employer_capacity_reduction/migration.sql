-- CreateEnum
CREATE TYPE "EmployerCapacityReductionStatus" AS ENUM ('requested', 'assignment_cancellation_pending', 'completed', 'requires_reconciliation', 'failed');

-- CreateTable
CREATE TABLE "employer_capacity_reductions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "job_request_id" UUID NOT NULL,
    "initiated_by_user_id" UUID NOT NULL,
    "cause" "EmployerCancellationCause" NOT NULL DEFAULT 'EMPLOYER_CANCELLED',
    "status" "EmployerCapacityReductionStatus" NOT NULL DEFAULT 'requested',
    "previous_target" INTEGER NOT NULL,
    "new_target" INTEGER NOT NULL,
    "removed_unfilled_capacity" INTEGER NOT NULL,
    "affected_confirmed_count" INTEGER NOT NULL,
    "selected_assignment_ids" JSONB NOT NULL,
    "expected_request_version" INTEGER NOT NULL,
    "obligation_amount_minor" INTEGER,
    "governed_rate_minor" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "minimum_shift_hours" INTEGER,
    "cutoff_hours" INTEGER,
    "contract_id" UUID,
    "contract_version" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "handoff_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_handoff_at" TIMESTAMPTZ(3),
    "reconciliation_note" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "employer_capacity_reductions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employer_capacity_reductions_idempotency_key_key" ON "employer_capacity_reductions"("idempotency_key");

-- CreateIndex
CREATE INDEX "employer_capacity_reductions_org_status_idx" ON "employer_capacity_reductions"("organization_id", "status");

-- CreateIndex
CREATE INDEX "employer_capacity_reductions_job_request_id_idx" ON "employer_capacity_reductions"("job_request_id");

-- AddForeignKey
ALTER TABLE "employer_capacity_reductions" ADD CONSTRAINT "employer_capacity_reductions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employer_capacity_reductions" ADD CONSTRAINT "employer_capacity_reductions_job_request_id_fkey" FOREIGN KEY ("job_request_id") REFERENCES "job_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
