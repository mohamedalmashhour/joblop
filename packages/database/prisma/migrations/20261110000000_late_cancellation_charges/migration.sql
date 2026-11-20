-- Late employer cancellation charges: one row per confirmed worker billed 6 hours when an employer
-- cancels less than 24 hours before the start. Additive only: one new table, no existing column
-- touched. Unique assignment_id and idempotency_key make a charge impossible to apply twice.
-- CreateTable
CREATE TABLE "late_cancellation_charges" (
    "id" UUID NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "job_request_id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "worker_identity_id" UUID NOT NULL,
    "cancellation_id" UUID,
    "source" TEXT NOT NULL,
    "cancelled_by_user_id" UUID NOT NULL,
    "cancelled_at" TIMESTAMPTZ(3) NOT NULL,
    "shift_start_at" TIMESTAMPTZ(3) NOT NULL,
    "minutes_before_start" INTEGER NOT NULL,
    "charge_hours" INTEGER NOT NULL,
    "employer_hourly_rate_minor" INTEGER NOT NULL,
    "subtotal_minor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "timesheet_id" UUID,
    "invoice_id" UUID,
    "invoice_error" TEXT,
    "worker_follow_up" TEXT NOT NULL DEFAULT 'pending_review',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "late_cancellation_charges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "late_cancellation_charges_idempotency_key" ON "late_cancellation_charges"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "late_cancellation_charges_assignment_key" ON "late_cancellation_charges"("assignment_id");

-- CreateIndex
CREATE UNIQUE INDEX "late_cancellation_charges_timesheet_key" ON "late_cancellation_charges"("timesheet_id");

-- CreateIndex
CREATE INDEX "late_cancellation_charges_org_created_idx" ON "late_cancellation_charges"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "late_cancellation_charges_job_request_idx" ON "late_cancellation_charges"("job_request_id");

-- AddForeignKey
ALTER TABLE "late_cancellation_charges" ADD CONSTRAINT "late_cancellation_charges_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "late_cancellation_charges" ADD CONSTRAINT "late_cancellation_charges_job_request_id_fkey" FOREIGN KEY ("job_request_id") REFERENCES "job_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "late_cancellation_charges" ADD CONSTRAINT "late_cancellation_charges_timesheet_id_fkey" FOREIGN KEY ("timesheet_id") REFERENCES "timesheets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

