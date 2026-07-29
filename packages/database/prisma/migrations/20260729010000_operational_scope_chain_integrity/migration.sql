-- Operational scope chain integrity
-- Binds every duplicated organization/work-scope column to its authoritative
-- upstream record. This is an unapplied migration; deployment remains gated.

CREATE UNIQUE INDEX "job_requests_operational_scope_key"
  ON "job_requests"(
    "id", "organization_id", "residence_id", "department_id",
    "work_group_id", "role_definition_id"
  );

CREATE UNIQUE INDEX "dispatch_reviews_operational_scope_key"
  ON "dispatch_reviews"(
    "id", "job_request_id", "organization_id", "residence_id", "department_id"
  );

CREATE UNIQUE INDEX "worker_offers_operational_scope_key"
  ON "worker_offers"(
    "id", "dispatch_review_id", "job_request_id", "organization_id",
    "residence_id", "department_id", "worker_identity_id"
  );

CREATE UNIQUE INDEX "assignments_operational_scope_key"
  ON "assignments"(
    "id", "job_request_id", "worker_identity_id", "organization_id",
    "residence_id", "department_id", "work_group_id", "role_definition_id"
  );

CREATE UNIQUE INDEX "attendance_records_operational_scope_key"
  ON "attendance_records"(
    "id", "assignment_id", "job_request_id", "worker_identity_id",
    "organization_id", "residence_id", "department_id",
    "work_group_id", "role_definition_id"
  );

ALTER TABLE "dispatch_reviews"
  ADD CONSTRAINT "dispatch_reviews_job_request_scope_fkey"
  FOREIGN KEY (
    "job_request_id", "organization_id", "residence_id", "department_id",
    "work_group_id", "role_definition_id"
  )
  REFERENCES "job_requests"(
    "id", "organization_id", "residence_id", "department_id",
    "work_group_id", "role_definition_id"
  )
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "worker_offers"
  ADD CONSTRAINT "worker_offers_dispatch_scope_fkey"
  FOREIGN KEY (
    "dispatch_review_id", "job_request_id", "organization_id",
    "residence_id", "department_id"
  )
  REFERENCES "dispatch_reviews"(
    "id", "job_request_id", "organization_id", "residence_id", "department_id"
  )
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "assignments"
  ADD CONSTRAINT "assignments_worker_offer_scope_fkey"
  FOREIGN KEY (
    "worker_offer_id", "dispatch_review_id", "job_request_id",
    "organization_id", "residence_id", "department_id", "worker_identity_id"
  )
  REFERENCES "worker_offers"(
    "id", "dispatch_review_id", "job_request_id",
    "organization_id", "residence_id", "department_id", "worker_identity_id"
  )
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "attendance_records"
  ADD CONSTRAINT "attendance_records_assignment_scope_fkey"
  FOREIGN KEY (
    "assignment_id", "job_request_id", "worker_identity_id", "organization_id",
    "residence_id", "department_id", "work_group_id", "role_definition_id"
  )
  REFERENCES "assignments"(
    "id", "job_request_id", "worker_identity_id", "organization_id",
    "residence_id", "department_id", "work_group_id", "role_definition_id"
  )
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "timesheets"
  ADD CONSTRAINT "timesheets_attendance_scope_fkey"
  FOREIGN KEY (
    "attendance_record_id", "assignment_id", "job_request_id",
    "worker_identity_id", "organization_id", "residence_id", "department_id",
    "work_group_id", "role_definition_id"
  )
  REFERENCES "attendance_records"(
    "id", "assignment_id", "job_request_id",
    "worker_identity_id", "organization_id", "residence_id", "department_id",
    "work_group_id", "role_definition_id"
  )
  ON DELETE RESTRICT ON UPDATE CASCADE;
