-- "Report my hours". Additive only: one new table; no existing table, column, row or constraint is
-- changed, so applying this migration changes nothing a running API does.
--   attendance_hours_reports  a worker's reported arrival/departure for a shift with no check-in,
--                             waiting for staff (pending), or approved / rejected by staff.
-- One PENDING report per attendance record (partial unique index). No money on this table.

-- CreateTable
CREATE TABLE "attendance_hours_reports" (
    "id" UUID NOT NULL,
    "attendance_record_id" UUID NOT NULL,
    "worker_identity_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reported_check_in_at" TIMESTAMPTZ(3) NOT NULL,
    "reported_check_out_at" TIMESTAMPTZ(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "submitted_by_user_id" UUID NOT NULL,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL,
    "approved_check_in_at" TIMESTAMPTZ(3),
    "approved_check_out_at" TIMESTAMPTZ(3),
    "decided_by_user_id" UUID,
    "decided_at" TIMESTAMPTZ(3),
    "decision_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "attendance_hours_reports_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "attendance_hours_reports_status_check" CHECK ("status" IN ('pending', 'approved', 'rejected')),
    CONSTRAINT "attendance_hours_reports_times_check" CHECK ("reported_check_out_at" > "reported_check_in_at")
);

-- CreateIndex
CREATE INDEX "attendance_hours_reports_attendance_status_idx" ON "attendance_hours_reports"("attendance_record_id", "status");

-- CreateIndex
CREATE INDEX "attendance_hours_reports_status_submitted_idx" ON "attendance_hours_reports"("status", "submitted_at");

-- One pending report per attendance record.
CREATE UNIQUE INDEX "attendance_hours_reports_one_pending_key" ON "attendance_hours_reports" ("attendance_record_id") WHERE "status" = 'pending';

-- AddForeignKey
ALTER TABLE "attendance_hours_reports" ADD CONSTRAINT "attendance_hours_reports_attendance_record_id_fkey" FOREIGN KEY ("attendance_record_id") REFERENCES "attendance_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
