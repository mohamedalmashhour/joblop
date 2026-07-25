-- Attendance Foundation
-- Scope: authoritative operational evidence only. Timesheets, payroll,
-- finance, invoices, break calculations, GPS providers, offline sync,
-- notifications, analytics, and AI execution remain deferred.

CREATE TYPE "AttendanceStatus" AS ENUM (
  'pending_start',
  'checked_in',
  'checked_out',
  'completed',
  'missed',
  'cancelled',
  'exception'
);

CREATE TABLE "attendance_records" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "assignment_id" UUID NOT NULL,
  "job_request_id" UUID NOT NULL,
  "worker_identity_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "residence_id" UUID NOT NULL,
  "department_id" UUID NOT NULL,
  "work_group_id" UUID NOT NULL,
  "role_definition_id" UUID NOT NULL,
  "status" "AttendanceStatus" NOT NULL DEFAULT 'pending_start',
  "scheduled_start_at" TIMESTAMPTZ(3) NOT NULL,
  "scheduled_end_at" TIMESTAMPTZ(3) NOT NULL,
  "timezone" TEXT NOT NULL,
  "assignment_status_snapshot" TEXT NOT NULL,
  "verification_method" TEXT NOT NULL DEFAULT 'none',
  "check_in_at" TIMESTAMPTZ(3),
  "check_in_method" TEXT,
  "check_in_evidence_summary" TEXT,
  "check_in_location_policy_result" TEXT,
  "check_out_at" TIMESTAMPTZ(3),
  "check_out_method" TEXT,
  "check_out_evidence_summary" TEXT,
  "check_out_location_policy_result" TEXT,
  "exception_category" TEXT,
  "supervisor_note" TEXT,
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID,
  "checked_in_by_user_id" UUID,
  "checked_out_by_user_id" UUID,
  "cancelled_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMPTZ(3),
  "cancelled_at" TIMESTAMPTZ(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "attendance_records_version_check" CHECK ("version" >= 1),
  CONSTRAINT "attendance_records_scheduled_end_after_start_check" CHECK ("scheduled_end_at" > "scheduled_start_at"),
  CONSTRAINT "attendance_records_checkout_after_checkin_check" CHECK (
    "check_out_at" IS NULL OR "check_in_at" IS NULL OR "check_out_at" >= "check_in_at"
  )
);

CREATE UNIQUE INDEX "attendance_records_assignment_id_key" ON "attendance_records"("assignment_id");
CREATE INDEX "attendance_records_assignment_id_status_idx" ON "attendance_records"("assignment_id", "status");
CREATE INDEX "attendance_records_organization_id_status_updated_at_idx" ON "attendance_records"("organization_id", "status", "updated_at");
CREATE INDEX "attendance_records_worker_identity_id_status_start_idx" ON "attendance_records"("worker_identity_id", "status", "scheduled_start_at");
CREATE INDEX "attendance_records_residence_department_start_idx" ON "attendance_records"("residence_id", "department_id", "scheduled_start_at");
CREATE INDEX "attendance_records_job_request_id_status_idx" ON "attendance_records"("job_request_id", "status");

ALTER TABLE "attendance_records"
  ADD CONSTRAINT "attendance_records_assignment_id_fkey"
  FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_records"
  ADD CONSTRAINT "attendance_records_job_request_id_fkey"
  FOREIGN KEY ("job_request_id") REFERENCES "job_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_records"
  ADD CONSTRAINT "attendance_records_worker_identity_id_fkey"
  FOREIGN KEY ("worker_identity_id") REFERENCES "worker_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_records"
  ADD CONSTRAINT "attendance_records_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_records"
  ADD CONSTRAINT "attendance_records_organization_residence_fkey"
  FOREIGN KEY ("organization_id", "residence_id") REFERENCES "residences"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_records"
  ADD CONSTRAINT "attendance_records_organization_residence_department_fkey"
  FOREIGN KEY ("organization_id", "residence_id", "department_id") REFERENCES "departments"("organization_id", "residence_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_records"
  ADD CONSTRAINT "attendance_records_work_group_id_fkey"
  FOREIGN KEY ("work_group_id") REFERENCES "work_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_records"
  ADD CONSTRAINT "attendance_records_work_group_role_fkey"
  FOREIGN KEY ("work_group_id", "role_definition_id") REFERENCES "role_definitions"("work_group_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_records"
  ADD CONSTRAINT "attendance_records_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_records"
  ADD CONSTRAINT "attendance_records_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_records"
  ADD CONSTRAINT "attendance_records_checked_in_by_user_id_fkey"
  FOREIGN KEY ("checked_in_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_records"
  ADD CONSTRAINT "attendance_records_checked_out_by_user_id_fkey"
  FOREIGN KEY ("checked_out_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_records"
  ADD CONSTRAINT "attendance_records_cancelled_by_user_id_fkey"
  FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
