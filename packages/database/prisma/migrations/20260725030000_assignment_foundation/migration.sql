-- Assignment Foundation
-- Scope: authoritative assignment commitment only. Worker Calendar, Attendance,
-- timesheets, payroll, finance, notifications, GPS, and AI execution remain deferred.

CREATE TYPE "AssignmentStatus" AS ENUM (
  'pending_validation',
  'confirmed',
  'worker_acknowledged',
  'ready_for_attendance',
  'in_attendance_window',
  'attendance_handoff',
  'worker_withdrawn',
  'employer_cancelled',
  'platform_cancelled',
  'replacement_required',
  'expired_before_start',
  'closed'
);

CREATE TABLE "assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "job_request_id" UUID NOT NULL,
  "dispatch_review_id" UUID NOT NULL,
  "worker_offer_id" UUID NOT NULL,
  "worker_offer_terms_version_id" UUID NOT NULL,
  "worker_identity_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "residence_id" UUID NOT NULL,
  "department_id" UUID NOT NULL,
  "work_group_id" UUID NOT NULL,
  "role_definition_id" UUID NOT NULL,
  "status" "AssignmentStatus" NOT NULL DEFAULT 'confirmed',
  "confirmed_start_at" TIMESTAMPTZ(3) NOT NULL,
  "confirmed_end_at" TIMESTAMPTZ(3) NOT NULL,
  "timezone" TEXT NOT NULL,
  "confirmed_title" TEXT NOT NULL,
  "confirmed_role_summary" TEXT,
  "confirmed_worksite_summary" TEXT,
  "confirmed_department_summary" TEXT,
  "confirmed_responsibility_summary" TEXT,
  "confirmed_policy_summary" TEXT,
  "confirmed_compensation_summary" TEXT,
  "validation_snapshot" JSONB,
  "capacity_checked_at" TIMESTAMPTZ(3) NOT NULL,
  "conflict_checked_at" TIMESTAMPTZ(3) NOT NULL,
  "confirmed_at" TIMESTAMPTZ(3) NOT NULL,
  "worker_acknowledged_at" TIMESTAMPTZ(3),
  "ready_for_attendance_at" TIMESTAMPTZ(3),
  "attendance_window_started_at" TIMESTAMPTZ(3),
  "attendance_handoff_at" TIMESTAMPTZ(3),
  "worker_withdrawn_at" TIMESTAMPTZ(3),
  "cancelled_at" TIMESTAMPTZ(3),
  "replacement_required_at" TIMESTAMPTZ(3),
  "closed_at" TIMESTAMPTZ(3),
  "cancellation_reason_category" TEXT,
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID,
  "confirmed_by_user_id" UUID,
  "cancelled_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "assignments_version_check" CHECK ("version" >= 1),
  CONSTRAINT "assignments_confirmed_end_after_start_check" CHECK ("confirmed_end_at" > "confirmed_start_at")
);

CREATE UNIQUE INDEX "assignments_worker_offer_id_key" ON "assignments"("worker_offer_id");
CREATE INDEX "assignments_job_request_id_status_idx" ON "assignments"("job_request_id", "status");
CREATE INDEX "assignments_dispatch_review_id_status_idx" ON "assignments"("dispatch_review_id", "status");
CREATE INDEX "assignments_organization_id_status_updated_at_idx" ON "assignments"("organization_id", "status", "updated_at");
CREATE INDEX "assignments_worker_identity_id_status_start_idx" ON "assignments"("worker_identity_id", "status", "confirmed_start_at");
CREATE INDEX "assignments_residence_department_start_idx" ON "assignments"("residence_id", "department_id", "confirmed_start_at");

ALTER TABLE "assignments"
  ADD CONSTRAINT "assignments_job_request_id_fkey"
  FOREIGN KEY ("job_request_id") REFERENCES "job_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignments"
  ADD CONSTRAINT "assignments_dispatch_review_id_fkey"
  FOREIGN KEY ("dispatch_review_id") REFERENCES "dispatch_reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignments"
  ADD CONSTRAINT "assignments_worker_offer_id_fkey"
  FOREIGN KEY ("worker_offer_id") REFERENCES "worker_offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignments"
  ADD CONSTRAINT "assignments_worker_offer_terms_version_id_fkey"
  FOREIGN KEY ("worker_offer_terms_version_id") REFERENCES "worker_offer_terms_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignments"
  ADD CONSTRAINT "assignments_worker_identity_id_fkey"
  FOREIGN KEY ("worker_identity_id") REFERENCES "worker_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignments"
  ADD CONSTRAINT "assignments_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "employer_organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignments"
  ADD CONSTRAINT "assignments_organization_residence_fkey"
  FOREIGN KEY ("organization_id", "residence_id") REFERENCES "residences"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignments"
  ADD CONSTRAINT "assignments_organization_residence_department_fkey"
  FOREIGN KEY ("organization_id", "residence_id", "department_id") REFERENCES "departments"("organization_id", "residence_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignments"
  ADD CONSTRAINT "assignments_work_group_id_fkey"
  FOREIGN KEY ("work_group_id") REFERENCES "work_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignments"
  ADD CONSTRAINT "assignments_work_group_role_fkey"
  FOREIGN KEY ("work_group_id", "role_definition_id") REFERENCES "role_definitions"("work_group_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignments"
  ADD CONSTRAINT "assignments_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignments"
  ADD CONSTRAINT "assignments_updated_by_user_id_fkey"
  FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assignments"
  ADD CONSTRAINT "assignments_confirmed_by_user_id_fkey"
  FOREIGN KEY ("confirmed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assignments"
  ADD CONSTRAINT "assignments_cancelled_by_user_id_fkey"
  FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
