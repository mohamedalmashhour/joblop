import {
  checksumValue,
  isSharedManifestRecord,
  ownedEntityTypes,
  type ManifestRecord,
  type OwnedEntityType,
  type ResetManifest
} from "./manifest";

export type ApprovedMutationTarget = Readonly<{
  table: string;
  prepare: "insert_exact" | "insert_exact_and_bind_offer" | "verify_reference";
  cleanup: "delete_exact" | "preserve_reference" | "retain_evidence";
}>;

const approvedMutationTargets: Readonly<Record<OwnedEntityType, ApprovedMutationTarget>> = {
  employer_organization: {
    table: "employer_organizations",
    prepare: "insert_exact",
    cleanup: "delete_exact"
  },
  work_group: { table: "work_groups", prepare: "insert_exact", cleanup: "delete_exact" },
  role_definition: {
    table: "role_definitions",
    prepare: "insert_exact",
    cleanup: "delete_exact"
  },
  access_role_definition: {
    table: "access_role_definitions",
    prepare: "verify_reference",
    cleanup: "preserve_reference"
  },
  synthetic_user: { table: "users", prepare: "insert_exact", cleanup: "delete_exact" },
  user_identity: {
    table: "user_identities",
    prepare: "insert_exact",
    cleanup: "delete_exact"
  },
  membership: {
    table: "organization_memberships",
    prepare: "insert_exact",
    cleanup: "delete_exact"
  },
  membership_access_role: {
    table: "membership_access_roles",
    prepare: "insert_exact",
    cleanup: "delete_exact"
  },
  worker_identity: {
    table: "worker_identities",
    prepare: "insert_exact",
    cleanup: "delete_exact"
  },
  residence: { table: "residences", prepare: "insert_exact", cleanup: "delete_exact" },
  department: { table: "departments", prepare: "insert_exact", cleanup: "delete_exact" },
  job_request: { table: "job_requests", prepare: "insert_exact", cleanup: "delete_exact" },
  staffing_request_calendar_profile: {
    table: "staffing_request_calendar_profiles",
    prepare: "insert_exact",
    cleanup: "delete_exact"
  },
  dispatch_review: {
    table: "dispatch_reviews",
    prepare: "insert_exact",
    cleanup: "delete_exact"
  },
  dispatch_candidate: {
    table: "dispatch_candidates",
    prepare: "insert_exact",
    cleanup: "delete_exact"
  },
  worker_offer: {
    table: "worker_offers",
    prepare: "insert_exact",
    cleanup: "delete_exact"
  },
  worker_offer_terms: {
    table: "worker_offer_terms_versions",
    prepare: "insert_exact_and_bind_offer",
    cleanup: "delete_exact"
  },
  worker_offer_delivery_attempt: {
    table: "worker_offer_delivery_attempts",
    prepare: "insert_exact",
    cleanup: "delete_exact"
  },
  worker_offer_response: {
    table: "worker_offer_responses",
    prepare: "insert_exact",
    cleanup: "delete_exact"
  },
  assignment: { table: "assignments", prepare: "insert_exact", cleanup: "delete_exact" },
  attendance_record: {
    table: "attendance_records",
    prepare: "insert_exact",
    cleanup: "delete_exact"
  },
  timesheet: { table: "timesheets", prepare: "insert_exact", cleanup: "delete_exact" },
  audit_actor_reference: {
    table: "audit_actor_references",
    prepare: "insert_exact",
    cleanup: "retain_evidence"
  },
  audit_event: { table: "audit_events", prepare: "insert_exact", cleanup: "retain_evidence" }
};

export function approvedTableForEntity(entityType: OwnedEntityType) {
  return approvedMutationTargets[entityType].table;
}

export function approvedIdentityColumnsForEntity(entityType: OwnedEntityType): readonly string[] {
  return entityType === "membership_access_role"
    ? ["membership_id", "access_role_definition_id"]
    : ["id"];
}

export type MutationPlanStep = Readonly<{
  sequence: number;
  operation: "prepare" | "cleanup";
  entityType: OwnedEntityType;
  table: string;
  recordId: string;
  tenantId: string;
  namespace: string;
  action: ApprovedMutationTarget["prepare"] | ApprovedMutationTarget["cleanup"];
}>;

export function createExactMutationPlan(
  manifest: ResetManifest,
  operation: MutationPlanStep["operation"]
): readonly MutationPlanStep[] {
  assertCompletePolicy();
  assertDependencyGraph(manifest);
  const order = operation === "prepare" ? manifest.preparationOrder : manifest.cleanupOrder;
  const steps: MutationPlanStep[] = [];
  for (const entityType of order) {
    const target = approvedMutationTargets[entityType];
    for (const record of sortedRecords(manifest, entityType)) {
      assertRecordPolicy(record, target);
      steps.push({
        sequence: steps.length + 1,
        operation,
        entityType,
        table: target.table,
        recordId: record.recordId,
        tenantId: record.tenantId,
        namespace: record.namespace,
        action: operation === "prepare" ? target.prepare : target.cleanup
      });
    }
  }
  if (steps.length !== manifest.records.length) throw new Error("RWOS_QA_RESET_PLAN_DENIED");
  return steps;
}

export function exactMutationPlanChecksum(
  manifest: ResetManifest,
  operation: MutationPlanStep["operation"],
  tenantIds: readonly string[]
) {
  return checksumValue({
    manifestChecksum: manifest.checksum,
    operation,
    tenantIds: [...tenantIds].sort(),
    steps: createScopedExactMutationPlan(manifest, operation, tenantIds)
  });
}

export function createScopedExactMutationPlan(
  manifest: ResetManifest,
  operation: MutationPlanStep["operation"],
  tenantIds: readonly string[]
) {
  const allowed = new Set(tenantIds);
  const fullScope = tenantIds.length === manifest.tenantIds.length;
  const recordsById = new Map(manifest.records.map((record) => [record.recordId, record]));
  return createExactMutationPlan(manifest, operation).filter(
    (step) =>
      allowed.has(step.tenantId) &&
      !(
        operation === "cleanup" &&
        !fullScope &&
        isSharedManifestRecord(recordsById.get(step.recordId)!)
      )
  );
}

function assertCompletePolicy() {
  if (
    Object.keys(approvedMutationTargets).length !== ownedEntityTypes.length ||
    ownedEntityTypes.some((entityType) => !approvedMutationTargets[entityType])
  ) {
    throw new Error("RWOS_QA_RESET_PLAN_DENIED");
  }
}

function assertRecordPolicy(record: ManifestRecord, target: ApprovedMutationTarget) {
  const reference = record.ownership === "approved_reference";
  if (
    (reference &&
      (target.prepare !== "verify_reference" || target.cleanup !== "preserve_reference")) ||
    (!reference &&
      (!["insert_exact", "insert_exact_and_bind_offer"].includes(target.prepare) ||
        !["delete_exact", "retain_evidence"].includes(target.cleanup)))
  ) {
    throw new Error("RWOS_QA_RESET_PLAN_DENIED");
  }
}

type Dependency = Readonly<{
  field: string;
  target: OwnedEntityType;
  deferred?: true;
}>;

const dependencies: Readonly<Partial<Record<OwnedEntityType, readonly Dependency[]>>> = {
  role_definition: [{ field: "workGroupId", target: "work_group" }],
  user_identity: [{ field: "userId", target: "synthetic_user" }],
  membership: [
    { field: "organizationId", target: "employer_organization" },
    { field: "userId", target: "synthetic_user" }
  ],
  membership_access_role: [
    { field: "membershipId", target: "membership" },
    { field: "accessRoleDefinitionId", target: "access_role_definition" }
  ],
  worker_identity: [{ field: "userId", target: "synthetic_user" }],
  residence: [{ field: "organizationId", target: "employer_organization" }],
  department: [
    { field: "organizationId", target: "employer_organization" },
    { field: "residenceId", target: "residence" }
  ],
  job_request: [
    { field: "organizationId", target: "employer_organization" },
    { field: "residenceId", target: "residence" },
    { field: "departmentId", target: "department" },
    { field: "workGroupId", target: "work_group" },
    { field: "roleDefinitionId", target: "role_definition" },
    { field: "creatorUserId", target: "synthetic_user" },
    { field: "createdByUserId", target: "synthetic_user" }
  ],
  staffing_request_calendar_profile: [
    { field: "jobRequestId", target: "job_request" },
    { field: "organizationId", target: "employer_organization" },
    { field: "residenceId", target: "residence" },
    { field: "createdByUserId", target: "synthetic_user" },
    { field: "updatedByUserId", target: "synthetic_user" }
  ],
  dispatch_review: [
    { field: "jobRequestId", target: "job_request" },
    { field: "organizationId", target: "employer_organization" },
    { field: "residenceId", target: "residence" },
    { field: "departmentId", target: "department" },
    { field: "workGroupId", target: "work_group" },
    { field: "roleDefinitionId", target: "role_definition" },
    { field: "createdByUserId", target: "synthetic_user" }
  ],
  dispatch_candidate: [
    { field: "dispatchReviewId", target: "dispatch_review" },
    { field: "workerIdentityId", target: "worker_identity" },
    { field: "addedByUserId", target: "synthetic_user" }
  ],
  worker_offer: [
    { field: "dispatchReviewId", target: "dispatch_review" },
    { field: "jobRequestId", target: "job_request" },
    { field: "organizationId", target: "employer_organization" },
    { field: "residenceId", target: "residence" },
    { field: "departmentId", target: "department" },
    { field: "workerIdentityId", target: "worker_identity" },
    { field: "currentTermsVersionId", target: "worker_offer_terms", deferred: true },
    { field: "createdByUserId", target: "synthetic_user" }
  ],
  worker_offer_terms: [
    { field: "workerOfferId", target: "worker_offer" },
    { field: "workGroupId", target: "work_group" },
    { field: "roleDefinitionId", target: "role_definition" },
    { field: "createdByUserId", target: "synthetic_user" }
  ],
  worker_offer_delivery_attempt: [
    { field: "workerOfferId", target: "worker_offer" },
    { field: "createdByUserId", target: "synthetic_user" }
  ],
  worker_offer_response: [
    { field: "workerOfferId", target: "worker_offer" },
    { field: "workerIdentityId", target: "worker_identity" },
    { field: "termsVersionId", target: "worker_offer_terms" }
  ],
  assignment: [
    { field: "jobRequestId", target: "job_request" },
    { field: "dispatchReviewId", target: "dispatch_review" },
    { field: "workerOfferId", target: "worker_offer" },
    { field: "workerOfferTermsVersionId", target: "worker_offer_terms" },
    { field: "workerIdentityId", target: "worker_identity" },
    { field: "organizationId", target: "employer_organization" },
    { field: "residenceId", target: "residence" },
    { field: "departmentId", target: "department" },
    { field: "workGroupId", target: "work_group" },
    { field: "roleDefinitionId", target: "role_definition" },
    { field: "createdByUserId", target: "synthetic_user" }
  ],
  attendance_record: [
    { field: "assignmentId", target: "assignment" },
    { field: "jobRequestId", target: "job_request" },
    { field: "workerIdentityId", target: "worker_identity" },
    { field: "organizationId", target: "employer_organization" },
    { field: "residenceId", target: "residence" },
    { field: "departmentId", target: "department" },
    { field: "workGroupId", target: "work_group" },
    { field: "roleDefinitionId", target: "role_definition" },
    { field: "createdByUserId", target: "synthetic_user" }
  ],
  timesheet: [
    { field: "assignmentId", target: "assignment" },
    { field: "attendanceRecordId", target: "attendance_record" },
    { field: "jobRequestId", target: "job_request" },
    { field: "workerIdentityId", target: "worker_identity" },
    { field: "organizationId", target: "employer_organization" },
    { field: "residenceId", target: "residence" },
    { field: "departmentId", target: "department" },
    { field: "workGroupId", target: "work_group" },
    { field: "roleDefinitionId", target: "role_definition" },
    { field: "createdByUserId", target: "synthetic_user" }
  ],
  audit_event: [{ field: "actorReferenceId", target: "audit_actor_reference" }]
};

function assertDependencyGraph(manifest: ResetManifest) {
  const recordsById = new Map(manifest.records.map((record) => [record.recordId, record]));
  const orderIndex = new Map(
    manifest.preparationOrder.map((entityType, index) => [entityType, index])
  );
  for (const record of manifest.records) {
    const payload = record.payload as unknown as Record<string, unknown>;
    for (const dependency of dependencies[record.entityType] ?? []) {
      const target = recordsById.get(String(payload[dependency.field] ?? ""));
      if (
        !target ||
        target.entityType !== dependency.target ||
        (!dependency.deferred &&
          (orderIndex.get(target.entityType) ?? Number.POSITIVE_INFINITY) >=
            (orderIndex.get(record.entityType) ?? Number.NEGATIVE_INFINITY))
      ) {
        throw new Error("RWOS_QA_RESET_PLAN_DENIED");
      }
    }
  }
}

function sortedRecords(manifest: ResetManifest, entityType: OwnedEntityType) {
  return manifest.records
    .filter((record) => record.entityType === entityType)
    .sort((left, right) => left.recordId.localeCompare(right.recordId));
}
