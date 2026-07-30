import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const migration = readFileSync(
  new URL("../prisma/migrations/20260725000000_phase_01_foundation/migration.sql", import.meta.url),
  "utf8"
);
const dispatchMigration = readFileSync(
  new URL("../prisma/migrations/20260725010000_dispatch_foundation/migration.sql", import.meta.url),
  "utf8"
);
const candidateProvenanceMigration = readFileSync(
  new URL(
    "../prisma/migrations/20260727010000_dispatch_candidate_worker_provenance/migration.sql",
    import.meta.url
  ),
  "utf8"
);
const candidateWorkerIdentityUniquenessMigration = readFileSync(
  new URL(
    "../prisma/migrations/20260727020000_dispatch_candidate_worker_identity_uniqueness/migration.sql",
    import.meta.url
  ),
  "utf8"
);
const localDurableStateMigration = readFileSync(
  new URL(
    "../prisma/migrations/20260729000000_qa_reset_and_synthetic_delivery_state/migration.sql",
    import.meta.url
  ),
  "utf8"
);
const operationalScopeMigration = readFileSync(
  new URL(
    "../prisma/migrations/20260729010000_operational_scope_chain_integrity/migration.sql",
    import.meta.url
  ),
  "utf8"
);
const secureDocumentMigration = readFileSync(
  new URL(
    "../prisma/migrations/20260730030000_secure_document_upload/migration.sql",
    import.meta.url
  ),
  "utf8"
);
const assignmentRuntime = readFileSync(new URL("../../auth/src/index.ts", import.meta.url), "utf8");

describe("Prisma Phase 01 schema boundary", () => {
  it("contains every approved Phase 01 entity", () => {
    for (const modelName of [
      "User",
      "UserIdentity",
      "Session",
      "EmployerOrganization",
      "OrganizationMembership",
      "Residence",
      "Department",
      "WorkGroup",
      "RoleDefinition",
      "AccessRoleDefinition",
      "PermissionDefinition",
      "AccessRolePermission",
      "MembershipAccessRole",
      "JobRequestSequence",
      "JobRequest",
      "StaffingRequestCalendarProfile",
      "DispatchReview",
      "DispatchCandidate",
      "WorkerIdentity",
      "WorkerOffer",
      "WorkerOfferTermsVersion",
      "WorkerOfferDeliveryAttempt",
      "WorkerOfferResponse",
      "Assignment",
      "AttendanceRecord",
      "Timesheet",
      "TimesheetCalculationSnapshot",
      "AuditActorReference",
      "AuditEvent"
    ]) {
      expect(schema).toContain(`model ${modelName}`);
    }
  });

  it("keeps deferred workflow entities out of Phase 01", () => {
    for (const deferredModel of [
      "AttendanceEvidence",
      "AttendanceBreak",
      "AttendanceException",
      "AttendanceOfflineSubmission",
      "TimesheetLine",
      "TimesheetAdjustment",
      "TimesheetApproval",
      "TimesheetDispute",
      "PayrollHandoffReference",
      "FinanceHandoffReference",
      "PayrollRun",
      "PayrollRecord",
      "PayrollCalculationSnapshot",
      "PayrollDeduction",
      "PayrollAdjustment",
      "WorkerPayObligation",
      "EmployerFundingObligation",
      "PlatformRevenueEntitlement",
      "WorkerClassificationRecord",
      "JurisdictionEmploymentProfile",
      "WorkerCompensationTerms",
      "EmployerCommercialTerms",
      "EmployerPayment",
      "WorkerPayable",
      "PaymentExecutionReference",
      "SettlementReference",
      "ReversalReference",
      "ReconciliationRecord",
      "EscrowAccount",
      "HeldFundsLedger",
      "Notification",
      "SupportCase"
    ]) {
      expect(schema).not.toMatch(new RegExp(`^model ${deferredModel} \\\\{`, "m"));
    }
  });

  it("keeps Invoice and authorized local payment orchestration downstream from Timesheet", () => {
    const modelNames = Array.from(schema.matchAll(/^model\s+(\w+)\s+\{/gm)).map(
      (match) => match[1]
    );

    expect(modelNames).toContain("Timesheet");
    expect(modelNames).toContain("TimesheetCalculationSnapshot");
    expect(modelNames).toContain("Invoice");

    const timesheetIndex = modelNames.indexOf("Timesheet");
    const postTimesheetModels = modelNames.slice(timesheetIndex + 1);

    expect(postTimesheetModels).toEqual([
      "TimesheetCalculationSnapshot",
      "Invoice",
      "InvoiceCreditNote",
      "InvoiceDeliveryReceipt",
      "InvoiceConfigurationVersion",
      "InvoiceNumberSequence",
      "PaymentPolicyVersion",
      "EmployerPaymentMethod",
      "EmployerPaymentAttempt",
      "EmployerPaymentEvent",
      "EmployerPaymentAllocation",
      "EmployerPaymentRefund",
      "UploadedDocument",
      "UploadedDocumentAudit",
      "AuditActorReference",
      "AuditEvent",
      "QaResetManifestOwnership",
      "QaResetManifestTenant",
      "QaResetOwnedRecord",
      "QaResetControlRun",
      "QaResetControlEvent",
      "SyntheticDeliveryIdempotency",
      "SyntheticDeliveryAttempt"
    ]);
  });

  it("keeps uploaded document bytes private and metadata organization-scoped", () => {
    expect(schema).toContain("model UploadedDocument");
    expect(schema).toContain("model UploadedDocumentAudit");
    expect(secureDocumentMigration).toContain("uploaded_documents_replacement_scope_fkey");
    expect(secureDocumentMigration).toContain("uploaded_document_audits_document_scope_fkey");
    expect(secureDocumentMigration).toContain("uploaded_documents_content_type_check");
    expect(secureDocumentMigration).toContain("uploaded_documents_size_check");
    expect(secureDocumentMigration).toContain("ON DELETE RESTRICT");
    expect(secureDocumentMigration).not.toMatch(
      /document_body|document_content|public_url|ON DELETE CASCADE|TRUNCATE|DROP TABLE/
    );
  });

  it("keeps local QA reset and synthetic delivery state staging-only and bounded", () => {
    for (const modelName of [
      "QaResetManifestOwnership",
      "QaResetManifestTenant",
      "QaResetOwnedRecord",
      "QaResetControlRun",
      "QaResetControlEvent",
      "SyntheticDeliveryIdempotency",
      "SyntheticDeliveryAttempt"
    ]) {
      expect(schema).toContain(`model ${modelName}`);
    }
    expect(localDurableStateMigration).toContain("qa_reset_manifests_staging_only_check");
    expect(localDurableStateMigration).toContain("qa_reset_manifests_namespace_check");
    expect(localDurableStateMigration).toContain("qa_reset_owned_records_manifest_tenant_fkey");
    expect(localDurableStateMigration).toContain("qa_reset_control_runs_retention_check");
    expect(localDurableStateMigration).toContain("synthetic_delivery_staging_only_check");
    expect(localDurableStateMigration).toContain("synthetic_delivery_retention_check");
    expect(localDurableStateMigration).toContain("synthetic_delivery_idempotency_scope_key");
    expect(localDurableStateMigration).toContain("ON DELETE RESTRICT");
    expect(localDurableStateMigration).not.toMatch(/ON DELETE CASCADE|TRUNCATE|DROP TABLE/);
  });

  it("preserves Job Request number and ordering constraints", () => {
    expect(schema).toContain("jobRequestNumber");
    expect(schema).toContain("model JobRequestSequence");
    expect(migration).toContain("job_requests_number_of_workers_check");
    expect(migration).toContain("job_requests_end_after_start_check");
    expect(migration).toContain("job_request_sequences_last_value_check");
  });

  it("prevents RoleDefinition from becoming an access-control role", () => {
    expect(schema).toContain("model RoleDefinition");
    expect(schema).toContain("model AccessRoleDefinition");
    expect(schema).toContain("work_group_id");
    expect(schema).toContain("scope");
  });

  it("enforces one non-terminal dispatch review per Job Request in PostgreSQL", () => {
    expect(dispatchMigration).toContain(
      'CREATE UNIQUE INDEX "dispatch_reviews_one_non_terminal_per_job_request_idx"'
    );
    expect(dispatchMigration).toContain('ON "dispatch_reviews"("job_request_id")');
    for (const state of [
      "draft",
      "active",
      "candidate_review",
      "shortlist_ready",
      "offer_preparation",
      "paused"
    ]) {
      expect(dispatchMigration).toContain(`'${state}'`);
    }
    expect(schema).not.toMatch(/@@unique\(\[jobRequestId\]/);
  });

  it("serializes Assignment creation across accepted offer, job capacity, and worker schedule", () => {
    expect(assignmentRuntime).toContain("createAssignmentFromAcceptedOfferAtomically");
    expect(assignmentRuntime).toContain("FOR UPDATE");
    expect(assignmentRuntime).toContain("rwos:assignment:job:");
    expect(assignmentRuntime).toContain("rwos:assignment:worker:");
    expect(assignmentRuntime.match(/\)::text AS lock_acquired/g)?.length).toBeGreaterThanOrEqual(3);
    expect(assignmentRuntime).toContain('isolationLevel: "Serializable"');
    expect(assignmentRuntime).toContain("assignment.validation_passed");
    expect(assignmentRuntime).toContain("assignment.confirmed");
    expect(assignmentRuntime).not.toContain("createAssignmentFromAcceptedOffer(input)");
    expect(schema).toContain('@unique @map("worker_offer_id")');
  });

  it("requires explicit persisted worker provenance for dispatch candidates", () => {
    expect(schema).toContain("workerIdentityId");
    expect(schema).toContain("dispatchCandidates DispatchCandidate[]");
    expect(candidateProvenanceMigration).toContain('ADD COLUMN "worker_identity_id" UUID');
    expect(candidateProvenanceMigration).toContain(
      'CONSTRAINT "dispatch_candidates_worker_identity_id_fkey"'
    );
    expect(candidateProvenanceMigration).toContain(
      '"dispatch_candidates_review_worker_shortlist_idx"'
    );
    expect(candidateWorkerIdentityUniquenessMigration).toContain(
      'CREATE UNIQUE INDEX "dispatch_candidates_review_worker_identity_key"'
    );
    expect(candidateWorkerIdentityUniquenessMigration).toContain(
      'WHERE "worker_identity_id" IS NOT NULL'
    );
  });

  it("serializes Worker Offer capacity validation and creation per dispatch", () => {
    expect(assignmentRuntime).toContain("rwos:worker-offer:dispatch:");
    expect(assignmentRuntime).toContain("pg_advisory_xact_lock");
    expect(assignmentRuntime).toContain("activeOfferCount >= input.capacityLimit");
  });

  it("binds every operational record to one organization and work-scope chain", () => {
    for (const constraint of [
      "dispatch_reviews_job_request_scope_fkey",
      "worker_offers_dispatch_scope_fkey",
      "assignments_worker_offer_scope_fkey",
      "attendance_records_assignment_scope_fkey",
      "timesheets_attendance_scope_fkey"
    ]) {
      expect(operationalScopeMigration).toContain(constraint);
    }
    expect(operationalScopeMigration).toContain(
      '"attendance_record_id", "assignment_id", "job_request_id"'
    );
    expect(operationalScopeMigration).toContain(
      '"worker_identity_id", "organization_id", "residence_id", "department_id"'
    );
    expect(operationalScopeMigration).toContain('"work_group_id", "role_definition_id"');
    expect(operationalScopeMigration).toContain("ON DELETE RESTRICT");
    expect(operationalScopeMigration).not.toMatch(/ON DELETE CASCADE|TRUNCATE|DROP TABLE/);
  });
});
