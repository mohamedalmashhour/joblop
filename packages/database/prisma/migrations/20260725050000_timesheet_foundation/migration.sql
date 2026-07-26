-- Timesheet Foundation
-- Scope: governed time calculation and review only. Payroll, finance,
-- invoices, payment processing, accounting, tax calculations, notification
-- providers, AI execution, and country-specific payroll rules remain deferred.

CREATE TYPE "TimesheetStatus" AS ENUM (
  'draft',
  'calculation_pending',
  'review_required',
  'worker_review',
  'employer_review',
  'platform_review',
  'approved',
  'locked',
  'rejected',
  'correction_required',
  'cancelled'
);

CREATE TABLE "timesheets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "assignment_id" UUID NOT NULL,
  "attendance_record_id" UUID NOT NULL,
  "job_request_id" UUID NOT NULL,
  "worker_identity_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "residence_id" UUID NOT NULL,
  "department_id" UUID NOT NULL,
  "work_group_id" UUID NOT NULL,
  "role_definition_id" UUID NOT NULL,
  "status" "TimesheetStatus" NOT NULL DEFAULT 'draft',
  "attendance_version_snapshot" INTEGER NOT NULL,
  "assignment_version_snapshot" INTEGER NOT NULL,
  "scheduled_start_at" TIMESTAMPTZ(3) NOT NULL,
  "scheduled_end_at" TIMESTAMPTZ(3) NOT NULL,
  "actual_check_in_at" TIMESTAMPTZ(3),
  "actual_check_out_at" TIMESTAMPTZ(3),
  "timezone" TEXT NOT NULL,
  "raw_elapsed_minutes" INTEGER,
  "payable_minutes" INTEGER,
  "billable_minutes" INTEGER,
  "excluded_minutes" INTEGER NOT NULL DEFAULT 0,
  "break_minutes" INTEGER NOT NULL DEFAULT 0,
  "premium_candidate_minutes" INTEGER NOT NULL DEFAULT 0,
  "overtime_candidate_minutes" INTEGER NOT NULL DEFAULT 0,
  "rounding_adjustment_minutes" INTEGER NOT NULL DEFAULT 0,
  "exception_summary" TEXT,
  "worker_review_status" TEXT NOT NULL DEFAULT 'not_started',
  "worker_reviewed_at" TIMESTAMPTZ(3),
  "employer_review_status" TEXT NOT NULL DEFAULT 'not_started',
  "employer_reviewed_at" TIMESTAMPTZ(3),
  "platform_review_status" TEXT NOT NULL DEFAULT 'not_started',
  "platform_reviewed_at" TIMESTAMPTZ(3),
  "approved_at" TIMESTAMPTZ(3),
  "locked_at" TIMESTAMPTZ(3),
  "rejected_at" TIMESTAMPTZ(3),
  "cancelled_at" TIMESTAMPTZ(3),
  "correction_reason" TEXT,
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID,
  "worker_reviewed_by_user_id" UUID,
  "employer_reviewed_by_user_id" UUID,
  "platform_reviewed_by_user_id" UUID,
  "locked_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "timesheets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "timesheets_version_check" CHECK ("version" >= 1),
  CONSTRAINT "timesheets_scheduled_end_after_start_check" CHECK ("scheduled_end_at" > "scheduled_start_at"),
  CONSTRAINT "timesheets_actual_checkout_after_checkin_check" CHECK (
    "actual_check_out_at" IS NULL OR "actual_check_in_at" IS NULL OR "actual_check_out_at" >= "actual_check_in_at"
  ),
  CONSTRAINT "timesheets_minutes_non_negative_check" CHECK (
    ("raw_elapsed_minutes" IS NULL OR "raw_elapsed_minutes" >= 0)
    AND ("payable_minutes" IS NULL OR "payable_minutes" >= 0)
    AND ("billable_minutes" IS NULL OR "billable_minutes" >= 0)
    AND "excluded_minutes" >= 0
    AND "break_minutes" >= 0
    AND "premium_candidate_minutes" >= 0
    AND "overtime_candidate_minutes" >= 0
  )
);

CREATE TABLE "timesheet_calculation_snapshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "timesheet_id" UUID NOT NULL,
  "attendance_record_id" UUID NOT NULL,
  "attendance_version_snapshot" INTEGER NOT NULL,
  "assignment_id" UUID NOT NULL,
  "assignment_version_snapshot" INTEGER NOT NULL,
  "calculation_policy_version" TEXT NOT NULL,
  "country_pack_version" TEXT NOT NULL,
  "raw_check_in_at" TIMESTAMPTZ(3) NOT NULL,
  "raw_check_out_at" TIMESTAMPTZ(3) NOT NULL,
  "normalized_check_in_at" TIMESTAMPTZ(3) NOT NULL,
  "normalized_check_out_at" TIMESTAMPTZ(3) NOT NULL,
  "timezone" TEXT NOT NULL,
  "break_rule" TEXT NOT NULL,
  "rounding_rule" TEXT NOT NULL,
  "raw_elapsed_minutes" INTEGER NOT NULL,
  "payable_minutes" INTEGER NOT NULL,
  "billable_minutes" INTEGER NOT NULL,
  "excluded_minutes" INTEGER NOT NULL DEFAULT 0,
  "break_minutes" INTEGER NOT NULL DEFAULT 0,
  "premium_candidate_minutes" INTEGER NOT NULL DEFAULT 0,
  "overtime_candidate_minutes" INTEGER NOT NULL DEFAULT 0,
  "rounding_adjustment_minutes" INTEGER NOT NULL DEFAULT 0,
  "exception_flags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "calculation_engine_version" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "timesheet_calculation_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "timesheet_calculation_snapshots_versions_check" CHECK (
    "attendance_version_snapshot" >= 1 AND "assignment_version_snapshot" >= 1
  ),
  CONSTRAINT "timesheet_calculation_snapshots_checkout_after_checkin_check" CHECK ("raw_check_out_at" >= "raw_check_in_at"),
  CONSTRAINT "timesheet_calculation_snapshots_minutes_non_negative_check" CHECK (
    "raw_elapsed_minutes" >= 0
    AND "payable_minutes" >= 0
    AND "billable_minutes" >= 0
    AND "excluded_minutes" >= 0
    AND "break_minutes" >= 0
    AND "premium_candidate_minutes" >= 0
    AND "overtime_candidate_minutes" >= 0
  )
);

CREATE UNIQUE INDEX "timesheets_assignment_id_key" ON "timesheets"("assignment_id");
CREATE UNIQUE INDEX "timesheets_attendance_record_id_key" ON "timesheets"("attendance_record_id");
CREATE INDEX "timesheets_organization_id_status_updated_at_idx" ON "timesheets"("organization_id", "status", "updated_at");
CREATE INDEX "timesheets_worker_identity_id_status_start_idx" ON "timesheets"("worker_identity_id", "status", "scheduled_start_at");
CREATE INDEX "timesheets_residence_department_start_idx" ON "timesheets"("residence_id", "department_id", "scheduled_start_at");
CREATE INDEX "timesheets_job_request_id_status_idx" ON "timesheets"("job_request_id", "status");
CREATE INDEX "timesheets_attendance_record_id_status_idx" ON "timesheets"("attendance_record_id", "status");
CREATE INDEX "timesheet_calculation_snapshots_timesheet_created_idx" ON "timesheet_calculation_snapshots"("timesheet_id", "created_at");
CREATE INDEX "timesheet_calculation_snapshots_attendance_version_idx" ON "timesheet_calculation_snapshots"("attendance_record_id", "attendance_version_snapshot");

ALTER TABLE "timesheets"
  ADD CONSTRAINT "timesheets_assignment_id_fkey"
  FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "timesheets"
  ADD CONSTRAINT "timesheets_attendance_record_id_fkey"
  FOREIGN KEY ("attendance_record_id") REFERENCES "attendance_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "timesheets"
  ADD CONSTRAINT "timesheets_job_request_id_fkey"
  FOREIGN KEY ("job_request_id") REFERENCES "job_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "timesheets"
  ADD CONSTRAINT "timesheets_worker_identity_id_fkey"
  FOREIGN KEY ("worker_identity_id") REFERENCES "worker_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "timesheets"
  ADD CONSTRAINT "timesheets_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "timesheets"
  ADD CONSTRAINT "timesheets_organization_residence_fkey"
  FOREIGN KEY ("organization_id", "residence_id") REFERENCES "residences"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "timesheets"
  ADD CONSTRAINT "timesheets_organization_residence_department_fkey"
  FOREIGN KEY ("organization_id", "residence_id", "department_id") REFERENCES "departments"("organization_id", "residence_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "timesheets"
  ADD CONSTRAINT "timesheets_work_group_id_fkey"
  FOREIGN KEY ("work_group_id") REFERENCES "work_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "timesheets"
  ADD CONSTRAINT "timesheets_work_group_role_fkey"
  FOREIGN KEY ("work_group_id", "role_definition_id") REFERENCES "role_definitions"("work_group_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "timesheets"
  ADD CONSTRAINT "timesheets_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "timesheets"
  ADD CONSTRAINT "timesheets_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "timesheets"
  ADD CONSTRAINT "timesheets_worker_reviewed_by_user_id_fkey"
  FOREIGN KEY ("worker_reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "timesheets"
  ADD CONSTRAINT "timesheets_employer_reviewed_by_user_id_fkey"
  FOREIGN KEY ("employer_reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "timesheets"
  ADD CONSTRAINT "timesheets_platform_reviewed_by_user_id_fkey"
  FOREIGN KEY ("platform_reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "timesheets"
  ADD CONSTRAINT "timesheets_locked_by_user_id_fkey"
  FOREIGN KEY ("locked_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "timesheet_calculation_snapshots"
  ADD CONSTRAINT "timesheet_calculation_snapshots_timesheet_id_fkey"
  FOREIGN KEY ("timesheet_id") REFERENCES "timesheets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
