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
      "Invoice",
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
      expect(schema).not.toContain(`model ${deferredModel}`);
    }
  });

  it("keeps Timesheet as the final authoritative engine before the money contract kit", () => {
    const modelNames = Array.from(schema.matchAll(/^model\s+(\w+)\s+\{/gm)).map(
      (match) => match[1]
    );

    expect(modelNames).toContain("Timesheet");
    expect(modelNames).toContain("TimesheetCalculationSnapshot");

    const timesheetIndex = modelNames.indexOf("Timesheet");
    const postTimesheetModels = modelNames.slice(timesheetIndex + 1);

    expect(postTimesheetModels).toEqual([
      "TimesheetCalculationSnapshot",
      "AuditActorReference",
      "AuditEvent"
    ]);
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
  });

  it("serializes Worker Offer capacity validation and creation per dispatch", () => {
    expect(assignmentRuntime).toContain("rwos:worker-offer:dispatch:");
    expect(assignmentRuntime).toContain("pg_advisory_xact_lock");
    expect(assignmentRuntime).toContain("activeOfferCount >= input.capacityLimit");
  });
});
