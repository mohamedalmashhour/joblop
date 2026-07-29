import type { ManifestRecord, OwnedEntityType } from "./manifest";
import { approvedIdentityColumnsForEntity, approvedTableForEntity } from "./mutationPlan";
import {
  QaResetPersistenceConflictError,
  createExactRecordMutator,
  type SqlConnection
} from "./postgresRepository";

const omittedPayloadFields = new Set([
  "kind",
  "referenceOnly",
  "accessRoleKey",
  "passwordHashReference"
]);

const requiresExplicitUpdatedAt = new Set<OwnedEntityType>([
  "employer_organization",
  "work_group",
  "role_definition",
  "synthetic_user",
  "user_identity",
  "residence",
  "department",
  "job_request",
  "staffing_request_calendar_profile",
  "dispatch_review",
  "dispatch_candidate"
]);

const payloadFields: Readonly<Record<OwnedEntityType, readonly string[]>> = {
  employer_organization: ["publicId", "legalName", "displayName", "status"],
  work_group: ["key", "displayLabel", "status", "displayOrder"],
  role_definition: ["workGroupId", "key", "displayLabel", "status", "displayOrder"],
  access_role_definition: ["key", "status", "referenceOnly"],
  synthetic_user: ["publicId", "emailNormalized", "displayName", "status"],
  user_identity: [
    "userId",
    "provider",
    "providerSubject",
    "emailVerifiedAt",
    "passwordHashReference"
  ],
  membership: ["organizationId", "userId", "status", "acceptedAt"],
  membership_access_role: ["membershipId", "accessRoleDefinitionId", "accessRoleKey"],
  worker_identity: ["userId", "displayName", "preferredLanguage", "status"],
  residence: ["organizationId", "publicId", "name", "status"],
  department: ["organizationId", "residenceId", "publicId", "name", "status"],
  job_request: [
    "organizationId",
    "residenceId",
    "departmentId",
    "workGroupId",
    "roleDefinitionId",
    "creatorUserId",
    "createdByUserId",
    "jobRequestNumber",
    "title",
    "numberOfWorkers",
    "urgency",
    "requestType",
    "timezone",
    "startAt",
    "endAt",
    "status"
  ],
  staffing_request_calendar_profile: [
    "jobRequestId",
    "organizationId",
    "residenceId",
    "dutiesSummary",
    "qualifications",
    "addressSummary",
    "specialInstructions",
    "contractVerificationState",
    "paymentMethodReadinessState",
    "locationVerificationState",
    "createdByUserId",
    "updatedByUserId"
  ],
  dispatch_review: [
    "jobRequestId",
    "organizationId",
    "residenceId",
    "departmentId",
    "workGroupId",
    "roleDefinitionId",
    "state",
    "priority",
    "requiredWorkerCount",
    "createdByUserId"
  ],
  dispatch_candidate: [
    "dispatchReviewId",
    "workerIdentityId",
    "candidateSourceType",
    "candidateSourceReference",
    "approvedDisplayName",
    "workGroupMatch",
    "roleDefinitionMatch",
    "qualificationSummaryState",
    "verificationSummaryState",
    "availabilityState",
    "scheduleConflictState",
    "serviceAreaState",
    "travelSuitabilityState",
    "transportConstraintState",
    "recommendationState",
    "shortlistState",
    "shortlistOrder",
    "sourceFreshnessAt",
    "lastEvaluatedAt",
    "evaluationVersion",
    "addedByUserId"
  ],
  worker_offer: [
    "dispatchReviewId",
    "jobRequestId",
    "organizationId",
    "residenceId",
    "departmentId",
    "workerIdentityId",
    "currentTermsVersionId",
    "status",
    "expiresAt",
    "createdByUserId"
  ],
  worker_offer_terms: [
    "workerOfferId",
    "versionNumber",
    "workerVisibleTitle",
    "workerVisibleSummary",
    "timezone",
    "startAt",
    "endAt",
    "workGroupId",
    "roleDefinitionId",
    "compensationSummary",
    "policySummary",
    "createdByUserId"
  ],
  worker_offer_delivery_attempt: [
    "workerOfferId",
    "status",
    "providerBoundary",
    "reason",
    "attemptedAt",
    "deliveredAt",
    "createdByUserId"
  ],
  worker_offer_response: ["workerOfferId", "workerIdentityId", "termsVersionId", "responseType"],
  assignment: [
    "jobRequestId",
    "dispatchReviewId",
    "workerOfferId",
    "workerOfferTermsVersionId",
    "workerIdentityId",
    "organizationId",
    "residenceId",
    "departmentId",
    "workGroupId",
    "roleDefinitionId",
    "status",
    "confirmedStartAt",
    "confirmedEndAt",
    "timezone",
    "confirmedTitle",
    "confirmedCompensationSummary",
    "capacityCheckedAt",
    "conflictCheckedAt",
    "confirmedAt",
    "createdByUserId"
  ],
  attendance_record: [
    "assignmentId",
    "jobRequestId",
    "workerIdentityId",
    "organizationId",
    "residenceId",
    "departmentId",
    "workGroupId",
    "roleDefinitionId",
    "status",
    "scheduledStartAt",
    "scheduledEndAt",
    "timezone",
    "assignmentStatusSnapshot",
    "verificationMethod",
    "checkInAt",
    "checkOutAt",
    "checkInLocationPolicyResult",
    "checkOutLocationPolicyResult",
    "createdByUserId"
  ],
  timesheet: [
    "assignmentId",
    "attendanceRecordId",
    "jobRequestId",
    "workerIdentityId",
    "organizationId",
    "residenceId",
    "departmentId",
    "workGroupId",
    "roleDefinitionId",
    "status",
    "attendanceVersionSnapshot",
    "assignmentVersionSnapshot",
    "scheduledStartAt",
    "scheduledEndAt",
    "actualCheckInAt",
    "actualCheckOutAt",
    "timezone",
    "rawElapsedMinutes",
    "payableMinutes",
    "billableMinutes",
    "createdByUserId"
  ],
  audit_actor_reference: ["actorType", "userId", "organizationId", "displayLabel"],
  audit_event: [
    "actorReferenceId",
    "organizationId",
    "entityType",
    "entityId",
    "entityPublicReference",
    "action",
    "priorState",
    "newState",
    "reason",
    "source",
    "correlationId",
    "policyVersion"
  ]
};

/**
 * The deliberately small relational implementation of the manifest mutator.
 *
 * SQL remains behind prismaExecutor's entity/table/shape allow-list. No table or
 * column name is accepted from a caller: both are derived from the closed
 * manifest entity union and the payload is converted to fixed snake-case names.
 */
export function createFixedEntityMutator() {
  return createExactRecordMutator(
    {
      prepare: prepareRecord,
      cleanup: cleanupRecord
    },
    allSupportedEntityTypes
  );
}

const allSupportedEntityTypes: readonly OwnedEntityType[] = [
  "employer_organization",
  "work_group",
  "role_definition",
  "access_role_definition",
  "synthetic_user",
  "user_identity",
  "membership",
  "membership_access_role",
  "worker_identity",
  "residence",
  "department",
  "job_request",
  "staffing_request_calendar_profile",
  "dispatch_review",
  "dispatch_candidate",
  "worker_offer",
  "worker_offer_terms",
  "worker_offer_delivery_attempt",
  "worker_offer_response",
  "assignment",
  "attendance_record",
  "timesheet",
  "audit_actor_reference",
  "audit_event"
];

async function prepareRecord(connection: SqlConnection, record: ManifestRecord) {
  assertRecordShape(record);
  if (record.entityType === "access_role_definition") {
    const result = await connection.query(
      `/* qa-reset:entity-prepare:access_role_definition */
       SELECT id
         FROM access_role_definitions
        WHERE id = $1 AND key = $2 AND status = $3`,
      [record.recordId, "ORGANIZATION_OWNER", "active"]
    );
    return exactOne(result.rowCount);
  }

  const payload = record.payload as unknown as Record<string, unknown>;
  const entries = Object.entries(payload)
    .filter(([field]) => !omittedPayloadFields.has(field))
    .filter(
      ([field]) => !(record.entityType === "worker_offer" && field === "currentTermsVersionId")
    );
  const identityEntries =
    record.entityType === "membership_access_role" ? [] : ([["id", record.recordId]] as const);
  const columnsAndValues = [...identityEntries, ...entries].map(([field, value]) => ({
    column: field === "passwordHashReference" ? "password_hash" : snakeCase(field),
    value: field === "qualifications" ? JSON.stringify(value) : value,
    json: field === "qualifications"
  }));
  const columns = [
    ...columnsAndValues.map(({ column }) => column),
    ...(requiresExplicitUpdatedAt.has(record.entityType) ? ["updated_at"] : [])
  ];
  const placeholders = [
    ...columnsAndValues.map(({ json }, index) => `$${index + 1}${json ? "::jsonb" : ""}`),
    ...(requiresExplicitUpdatedAt.has(record.entityType) ? ["CURRENT_TIMESTAMP"] : [])
  ];
  const inserted = await connection.query(
    `/* qa-reset:entity-prepare:${record.entityType} */
     INSERT INTO ${approvedTableForEntity(record.entityType)}
       (${columns.join(", ")})
     VALUES (${placeholders.join(", ")})`,
    columnsAndValues.map(({ value }) => value)
  );
  exactOne(inserted.rowCount);

  if (record.entityType !== "worker_offer_terms") return 1;
  const workerOfferId = String(payload.workerOfferId);
  const bound = await connection.query(
    `/* qa-reset:entity-prepare:worker_offer */
     UPDATE worker_offers
        SET current_terms_version_id = $2
      WHERE id = $1 AND current_terms_version_id IS NULL`,
    [workerOfferId, record.recordId]
  );
  return exactOne(bound.rowCount);
}

async function cleanupRecord(connection: SqlConnection, record: ManifestRecord) {
  assertRecordShape(record);
  if (record.entityType === "access_role_definition") return 1;
  if (record.entityType === "audit_actor_reference" || record.entityType === "audit_event") {
    return verifyRetainedEvidence(connection, record);
  }

  if (record.entityType === "worker_offer_terms") {
    const payload = record.payload as unknown as Record<string, unknown>;
    const unbound = await connection.query(
      `/* qa-reset:entity-prepare:worker_offer */
       UPDATE worker_offers
          SET current_terms_version_id = NULL
        WHERE id = $1 AND current_terms_version_id = $2`,
      [String(payload.workerOfferId), record.recordId]
    );
    exactOne(unbound.rowCount);
  }

  const identityColumns = approvedIdentityColumnsForEntity(record.entityType);
  const payload = record.payload as unknown as Record<string, unknown>;
  const identityValues =
    record.entityType === "membership_access_role"
      ? [payload.membershipId, payload.accessRoleDefinitionId]
      : [record.recordId];
  const predicate = identityColumns
    .map((column, index) => `${column} = $${index + 1}`)
    .join(" AND ");
  const deleted = await connection.query(
    `/* qa-reset:entity-cleanup:${record.entityType} */
     DELETE FROM ${approvedTableForEntity(record.entityType)}
      WHERE ${predicate}`,
    identityValues
  );
  return exactOne(deleted.rowCount);
}

async function verifyRetainedEvidence(connection: SqlConnection, record: ManifestRecord) {
  const payload = record.payload as unknown as Record<string, unknown>;
  const fields = payloadFields[record.entityType];
  const columns = ["id", ...fields.map(snakeCase)];
  const result = await connection.query(
    `/* qa-reset:entity-cleanup:${record.entityType} */
     SELECT id
       FROM ${approvedTableForEntity(record.entityType)}
      WHERE ${columns.map((column, index) => `${column} IS NOT DISTINCT FROM $${index + 1}`).join(" AND ")}`,
    [record.recordId, ...fields.map((field) => payload[field])]
  );
  return exactOne(result.rowCount);
}

function exactOne(rowCount: number) {
  if (rowCount !== 1) throw new QaResetPersistenceConflictError();
  return 1;
}

function assertRecordShape(record: ManifestRecord) {
  const actualFields = Object.keys(record.payload)
    .filter((field) => field !== "kind")
    .sort();
  const expectedFields = [...payloadFields[record.entityType]].sort();
  if (
    record.payload.kind !== payloadKind(record.entityType) ||
    JSON.stringify(actualFields) !== JSON.stringify(expectedFields) ||
    (record.entityType === "access_role_definition") !== (record.ownership === "approved_reference")
  ) {
    throw new QaResetPersistenceConflictError();
  }
}

function payloadKind(entityType: OwnedEntityType) {
  if (entityType === "synthetic_user") return "user";
  return entityType;
}

function snakeCase(value: string) {
  return value.replaceAll(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}
