-- CreateEnum
CREATE TYPE "EmployerCancellationCause" AS ENUM ('EMPLOYER_CANCELLED', 'WORKER_CANCELLED', 'WORKER_NO_SHOW', 'PLATFORM_UNABLE_TO_FILL', 'PLATFORM_CANCELLED', 'MUTUALLY_CANCELLED');

-- CreateEnum
CREATE TYPE "EmployerRequestCancellationStatus" AS ENUM ('requested', 'assignment_cancellation_pending', 'completed', 'failed', 'requires_reconciliation');

-- CreateEnum
CREATE TYPE "EmployerCancellationObligationStatus" AS ENUM ('RECORDED', 'VOIDED', 'ADJUSTED');

-- CreateTable
CREATE TABLE "employer_request_cancellations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "job_request_id" UUID NOT NULL,
    "cause" "EmployerCancellationCause" NOT NULL,
    "status" "EmployerRequestCancellationStatus" NOT NULL DEFAULT 'requested',
    "affected_confirmed_workers" INTEGER NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "initiated_by_user_id" UUID NOT NULL,
    "initiated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handoff_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_handoff_at" TIMESTAMPTZ(3),
    "reconciliation_note" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "employer_request_cancellations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employer_cancellation_obligations" (
    "id" UUID NOT NULL,
    "cancellation_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "job_request_id" UUID NOT NULL,
    "cause" "EmployerCancellationCause" NOT NULL,
    "confirmed_worker_count" INTEGER NOT NULL,
    "governed_rate_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "minimum_shift_hours" INTEGER NOT NULL,
    "cutoff_hours" INTEGER NOT NULL,
    "contract_id" UUID,
    "contract_version" TEXT,
    "amount_minor" INTEGER NOT NULL,
    "status" "EmployerCancellationObligationStatus" NOT NULL DEFAULT 'RECORDED',
    "computed_by_user_id" UUID NOT NULL,
    "computed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "employer_cancellation_obligations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employer_request_cancellations_job_request_id_key" ON "employer_request_cancellations"("job_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "employer_request_cancellations_idempotency_key_key" ON "employer_request_cancellations"("idempotency_key");

-- CreateIndex
CREATE INDEX "employer_request_cancellations_org_status_idx" ON "employer_request_cancellations"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "employer_cancellation_obligations_cancellation_id_key" ON "employer_cancellation_obligations"("cancellation_id");

-- CreateIndex
CREATE INDEX "employer_cancellation_obligations_org_status_idx" ON "employer_cancellation_obligations"("organization_id", "status");

-- AddForeignKey
ALTER TABLE "employer_request_cancellations" ADD CONSTRAINT "employer_request_cancellations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employer_request_cancellations" ADD CONSTRAINT "employer_request_cancellations_job_request_id_fkey" FOREIGN KEY ("job_request_id") REFERENCES "job_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employer_cancellation_obligations" ADD CONSTRAINT "employer_cancellation_obligations_cancellation_id_fkey" FOREIGN KEY ("cancellation_id") REFERENCES "employer_request_cancellations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employer_cancellation_obligations" ADD CONSTRAINT "employer_cancellation_obligations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employer_cancellation_obligations" ADD CONSTRAINT "employer_cancellation_obligations_job_request_id_fkey" FOREIGN KEY ("job_request_id") REFERENCES "job_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
