import { createHash } from "node:crypto";
import { retentionDays, type QaResetConfig } from "./config";

export const ownedEntityTypes = [
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
] as const;
export type OwnedEntityType = (typeof ownedEntityTypes)[number];

export type SyntheticFixturePayload =
  | Readonly<{
      kind: "employer_organization";
      publicId: string;
      legalName: string;
      displayName: string;
      status: "active";
    }>
  | Readonly<{
      kind: "work_group";
      key: string;
      displayLabel: string;
      status: "active";
      displayOrder: number;
    }>
  | Readonly<{
      kind: "role_definition";
      workGroupId: string;
      key: string;
      displayLabel: string;
      status: "active";
      displayOrder: number;
    }>
  | Readonly<{
      kind: "access_role_definition";
      key: "ORGANIZATION_OWNER";
      status: "active";
      referenceOnly: true;
    }>
  | Readonly<{
      kind: "user";
      publicId: string;
      emailNormalized: `${string}@${string}.invalid`;
      displayName: string;
      status: "active";
    }>
  | Readonly<{
      kind: "user_identity";
      userId: string;
      provider: "dev_test";
      providerSubject: string;
      emailVerifiedAt: string;
      passwordHashReference: null;
    }>
  | Readonly<{
      kind: "membership";
      organizationId: string;
      userId: string;
      status: "active";
      acceptedAt: string;
    }>
  | Readonly<{
      kind: "membership_access_role";
      membershipId: string;
      accessRoleDefinitionId: string;
      accessRoleKey: "ORGANIZATION_OWNER";
    }>
  | Readonly<{
      kind: "worker_identity";
      userId: string;
      displayName: string;
      preferredLanguage: "en-CA";
      status: "active";
    }>
  | Readonly<{
      kind: "residence";
      organizationId: string;
      publicId: string;
      name: string;
      status: "active";
    }>
  | Readonly<{
      kind: "department";
      organizationId: string;
      residenceId: string;
      publicId: string;
      name: string;
      status: "active";
    }>
  | Readonly<{
      kind: "job_request";
      organizationId: string;
      residenceId: string;
      departmentId: string;
      workGroupId: string;
      roleDefinitionId: string;
      creatorUserId: string;
      createdByUserId: string;
      jobRequestNumber: string;
      title: string;
      numberOfWorkers: 1;
      urgency: "normal";
      requestType: "single_day";
      timezone: "America/Toronto";
      startAt: string;
      endAt: string;
      status: "approved_for_dispatch";
    }>
  | Readonly<{
      kind: "staffing_request_calendar_profile";
      jobRequestId: string;
      organizationId: string;
      residenceId: string;
      dutiesSummary: string;
      qualifications: readonly string[];
      addressSummary: null;
      specialInstructions: null;
      contractVerificationState: "pending";
      paymentMethodReadinessState: "pending";
      locationVerificationState: "pending";
      createdByUserId: string;
      updatedByUserId: string;
    }>
  | Readonly<{
      kind: "dispatch_review";
      jobRequestId: string;
      organizationId: string;
      residenceId: string;
      departmentId: string;
      workGroupId: string;
      roleDefinitionId: string;
      state: "offer_preparation";
      priority: "normal";
      requiredWorkerCount: 1;
      createdByUserId: string;
    }>
  | Readonly<{
      kind: "dispatch_candidate";
      dispatchReviewId: string;
      workerIdentityId: string;
      candidateSourceType: "internal_worker_profile";
      candidateSourceReference: string;
      approvedDisplayName: string;
      workGroupMatch: "match";
      roleDefinitionMatch: "match";
      qualificationSummaryState: "meets_requirements";
      verificationSummaryState: "meets_requirements";
      availabilityState: "available";
      scheduleConflictState: "conflict_free";
      serviceAreaState: "inside_service_area";
      travelSuitabilityState: "suitable";
      transportConstraintState: "available";
      recommendationState: "recommended";
      shortlistState: "shortlisted";
      shortlistOrder: 1;
      sourceFreshnessAt: string;
      lastEvaluatedAt: string;
      evaluationVersion: 1;
      addedByUserId: string;
    }>
  | Readonly<{
      kind: "worker_offer";
      dispatchReviewId: string;
      jobRequestId: string;
      organizationId: string;
      residenceId: string;
      departmentId: string;
      workerIdentityId: string;
      currentTermsVersionId: string;
      status: "accepted";
      createdAt: string;
      expiresAt: string;
      createdByUserId: string;
    }>
  | Readonly<{
      kind: "worker_offer_delivery_attempt";
      workerOfferId: string;
      status: "delivered";
      providerBoundary: "synthetic_no_provider";
      reason: "synthetic_fixture_only";
      attemptedAt: string;
      deliveredAt: string;
      createdByUserId: string;
    }>
  | Readonly<{
      kind: "worker_offer_terms";
      workerOfferId: string;
      versionNumber: 1;
      workerVisibleTitle: string;
      workerVisibleSummary: string;
      timezone: "America/Toronto";
      startAt: string;
      endAt: string;
      workGroupId: string;
      roleDefinitionId: string;
      compensationSummary: null;
      policySummary: string;
      createdByUserId: string;
    }>
  | Readonly<{
      kind: "worker_offer_response";
      workerOfferId: string;
      workerIdentityId: string;
      termsVersionId: string;
      responseType: "accepted";
    }>
  | Readonly<{
      kind: "assignment";
      jobRequestId: string;
      dispatchReviewId: string;
      workerOfferId: string;
      workerOfferTermsVersionId: string;
      workerIdentityId: string;
      organizationId: string;
      residenceId: string;
      departmentId: string;
      workGroupId: string;
      roleDefinitionId: string;
      status: "confirmed";
      confirmedStartAt: string;
      confirmedEndAt: string;
      timezone: "America/Toronto";
      confirmedTitle: string;
      confirmedCompensationSummary: null;
      capacityCheckedAt: string;
      conflictCheckedAt: string;
      confirmedAt: string;
      createdByUserId: string;
    }>
  | Readonly<{
      kind: "attendance_record";
      assignmentId: string;
      jobRequestId: string;
      workerIdentityId: string;
      organizationId: string;
      residenceId: string;
      departmentId: string;
      workGroupId: string;
      roleDefinitionId: string;
      status: "pending_start";
      scheduledStartAt: string;
      scheduledEndAt: string;
      timezone: "America/Toronto";
      assignmentStatusSnapshot: "confirmed";
      verificationMethod: "none";
      checkInAt: null;
      checkOutAt: null;
      checkInLocationPolicyResult: null;
      checkOutLocationPolicyResult: null;
      createdByUserId: string;
    }>
  | Readonly<{
      kind: "timesheet";
      assignmentId: string;
      attendanceRecordId: string;
      jobRequestId: string;
      workerIdentityId: string;
      organizationId: string;
      residenceId: string;
      departmentId: string;
      workGroupId: string;
      roleDefinitionId: string;
      status: "draft";
      attendanceVersionSnapshot: 1;
      assignmentVersionSnapshot: 1;
      scheduledStartAt: string;
      scheduledEndAt: string;
      actualCheckInAt: null;
      actualCheckOutAt: null;
      timezone: "America/Toronto";
      rawElapsedMinutes: null;
      payableMinutes: null;
      billableMinutes: null;
      createdByUserId: string;
    }>
  | Readonly<{
      kind: "audit_actor_reference";
      actorType: "system";
      userId: null;
      organizationId: null;
      displayLabel: string;
    }>
  | Readonly<{
      kind: "audit_event";
      actorReferenceId: string;
      organizationId: null;
      entityType: "qa_reset_evidence";
      entityId: string;
      entityPublicReference: string;
      action: "synthetic_fixture_prepared";
      priorState: null;
      newState: "retained";
      reason: "deterministic_qa_fixture";
      source: "system";
      correlationId: string;
      policyVersion: "qa-reset-v1";
    }>;

export type ManifestRecord = Readonly<{
  synthetic: true;
  namespace: string;
  tenantId: string;
  entityType: OwnedEntityType;
  manifestRecordKey: string;
  recordId: string;
  payload: SyntheticFixturePayload;
  ownership: "manifest_owned" | "approved_reference";
}>;

export function isSharedManifestRecord(record: ManifestRecord) {
  return record.manifestRecordKey.startsWith("syn:shared:");
}

export type ResetManifest = Readonly<{
  version: 1;
  synthetic: true;
  releaseSha: string;
  projectId: string;
  clusterId: string;
  databaseId: string;
  authorityId: string;
  tenantIds: readonly string[];
  namespace: string;
  manifestId: string;
  approvalReferences: Readonly<Record<"dry-run" | "prepare" | "cleanup", string>>;
  createdAt: string;
  expiresAt: string;
  controlEvidenceRetentionDays: 30;
  retentionUntil: string;
  preparationOrder: readonly OwnedEntityType[];
  cleanupOrder: readonly OwnedEntityType[];
  maximumRecordCounts: Readonly<Record<OwnedEntityType, number>>;
  records: readonly ManifestRecord[];
  checksum: string;
}>;

export function createResetManifest(config: QaResetConfig): ResetManifest {
  const preparationOrder = [...ownedEntityTypes];
  const records = [
    ...catalogueTemplate(config),
    ...tenantTemplate(config, config.tenantAId, "tenant-a"),
    ...tenantTemplate(config, config.tenantBId, "tenant-b")
  ];
  const retentionUntil = new Date(
    config.manifestCreatedAt.getTime() + retentionDays * 86_400_000
  ).toISOString();
  const unsigned = {
    version: 1 as const,
    synthetic: true as const,
    releaseSha: config.releaseSha,
    projectId: config.projectId,
    clusterId: config.clusterId,
    databaseId: config.databaseId,
    authorityId: config.authorityId,
    tenantIds: [config.tenantAId, config.tenantBId] as const,
    namespace: config.namespace,
    manifestId: config.manifestId,
    approvalReferences: {
      "dry-run": config.dryRunApprovalReference,
      prepare: config.prepareApprovalReference,
      cleanup: config.cleanupApprovalReference
    },
    createdAt: config.manifestCreatedAt.toISOString(),
    expiresAt: config.manifestExpiresAt.toISOString(),
    controlEvidenceRetentionDays: retentionDays as 30,
    retentionUntil,
    preparationOrder,
    cleanupOrder: [...preparationOrder].reverse(),
    maximumRecordCounts: Object.fromEntries(
      ownedEntityTypes.map((entityType) => [
        entityType,
        records.filter((record) => record.entityType === entityType).length
      ])
    ) as Record<OwnedEntityType, number>,
    records
  };
  return { ...unsigned, checksum: checksumValue(unsigned) };
}

function catalogueTemplate(config: QaResetConfig): ManifestRecord[] {
  const record = (
    entityType: OwnedEntityType,
    recordId: string,
    payload: SyntheticFixturePayload,
    ownership: ManifestRecord["ownership"] = "manifest_owned"
  ): ManifestRecord => ({
    synthetic: true,
    namespace: config.namespace,
    tenantId: config.tenantAId,
    entityType,
    manifestRecordKey: `syn:shared:${entityType}:01`,
    recordId,
    payload,
    ownership
  });
  return [
    record("work_group", config.workGroupId, {
      kind: "work_group",
      key: "RWOS_QA_STAGING_WORK_GROUP",
      displayLabel: "Synthetic staging work group",
      status: "active",
      displayOrder: 9_900
    }),
    record("role_definition", config.roleDefinitionId, {
      kind: "role_definition",
      workGroupId: config.workGroupId,
      key: "RWOS_QA_STAGING_ROLE",
      displayLabel: "Synthetic staging role",
      status: "active",
      displayOrder: 9_900
    }),
    record(
      "access_role_definition",
      config.organizationOwnerAccessRoleId,
      {
        kind: "access_role_definition",
        key: "ORGANIZATION_OWNER",
        status: "active",
        referenceOnly: true
      },
      "approved_reference"
    )
  ];
}

function tenantTemplate(
  config: QaResetConfig,
  tenantId: string,
  alias: "tenant-a" | "tenant-b"
): ManifestRecord[] {
  const organizationLabel =
    alias === "tenant-a" ? "Test Employer Organization A" : "Test Employer Organization B";
  const createdAt = config.manifestCreatedAt.toISOString();
  const shiftStart = "2026-08-24T09:00:00-04:00";
  const shiftEnd = "2026-08-24T17:00:00-04:00";
  const id = (entityType: OwnedEntityType) =>
    deterministicUuid(`${config.namespace}:${config.manifestId}:syn:${alias}:${entityType}:01`);
  const employerUserId = id("synthetic_user");
  const workerUserId = deterministicUuid(
    `${config.namespace}:${config.manifestId}:syn:${alias}:synthetic_user:worker`
  );
  const membershipId = id("membership");
  const workerIdentityId = id("worker_identity");
  const residenceId = id("residence");
  const departmentId = id("department");
  const jobRequestId = id("job_request");
  const dispatchReviewId = id("dispatch_review");
  const calendarProfileId = id("staffing_request_calendar_profile");
  const dispatchCandidateId = id("dispatch_candidate");
  const workerOfferId = id("worker_offer");
  const termsVersionId = id("worker_offer_terms");
  const assignmentId = id("assignment");
  const attendanceRecordId = id("attendance_record");
  const auditActorReferenceId = id("audit_actor_reference");
  const auditEventId = id("audit_event");

  const record = (
    entityType: OwnedEntityType,
    payload: SyntheticFixturePayload,
    recordId = id(entityType),
    suffix = "01",
    ownership: ManifestRecord["ownership"] = "manifest_owned"
  ): ManifestRecord => ({
    synthetic: true,
    namespace: config.namespace,
    tenantId,
    entityType,
    manifestRecordKey: `syn:${alias}:${entityType}:${suffix}`,
    recordId,
    payload,
    ownership
  });

  return [
    record(
      "employer_organization",
      {
        kind: "employer_organization",
        publicId: `rwos-${alias}-organization`,
        legalName: organizationLabel,
        displayName: organizationLabel,
        status: "active"
      },
      tenantId
    ),
    record("synthetic_user", {
      kind: "user",
      publicId: `rwos-${alias}-employer`,
      emailNormalized: `employer-${alias}@rwos-staging.invalid`,
      displayName: `${organizationLabel} Employer`,
      status: "active"
    }),
    record(
      "synthetic_user",
      {
        kind: "user",
        publicId: `rwos-${alias}-worker`,
        emailNormalized: `worker-${alias}@rwos-staging.invalid`,
        displayName: `${organizationLabel} Worker`,
        status: "active"
      },
      workerUserId,
      "02"
    ),
    record("user_identity", {
      kind: "user_identity",
      userId: employerUserId,
      provider: "dev_test",
      providerSubject: `employer-${alias}@rwos-staging.invalid`,
      emailVerifiedAt: createdAt,
      passwordHashReference: null
    }),
    record(
      "user_identity",
      {
        kind: "user_identity",
        userId: workerUserId,
        provider: "dev_test",
        providerSubject: `worker-${alias}@rwos-staging.invalid`,
        emailVerifiedAt: createdAt,
        passwordHashReference: null
      },
      deterministicUuid(
        `${config.namespace}:${config.manifestId}:syn:${alias}:user_identity:worker`
      ),
      "02"
    ),
    record("membership", {
      kind: "membership",
      organizationId: tenantId,
      userId: employerUserId,
      status: "active",
      acceptedAt: createdAt
    }),
    record("membership_access_role", {
      kind: "membership_access_role",
      membershipId,
      accessRoleDefinitionId: config.organizationOwnerAccessRoleId,
      accessRoleKey: "ORGANIZATION_OWNER"
    }),
    record("worker_identity", {
      kind: "worker_identity",
      userId: workerUserId,
      displayName: `${organizationLabel} Worker`,
      preferredLanguage: "en-CA",
      status: "active"
    }),
    record("residence", {
      kind: "residence",
      organizationId: tenantId,
      publicId: `rwos-${alias}-residence`,
      name: `${organizationLabel} Test Location`,
      status: "active"
    }),
    record("department", {
      kind: "department",
      organizationId: tenantId,
      residenceId,
      publicId: `rwos-${alias}-department`,
      name: "Synthetic staffing department",
      status: "active"
    }),
    record("job_request", {
      kind: "job_request",
      organizationId: tenantId,
      residenceId,
      departmentId,
      workGroupId: config.workGroupId,
      roleDefinitionId: config.roleDefinitionId,
      creatorUserId: employerUserId,
      createdByUserId: employerUserId,
      jobRequestNumber: `QA-2026-${alias === "tenant-a" ? "A" : "B"}-001`,
      title: "Synthetic weekday staffing validation",
      numberOfWorkers: 1,
      urgency: "normal",
      requestType: "single_day",
      timezone: "America/Toronto",
      startAt: shiftStart,
      endAt: shiftEnd,
      status: "approved_for_dispatch"
    }),
    record(
      "staffing_request_calendar_profile",
      {
        kind: "staffing_request_calendar_profile",
        jobRequestId,
        organizationId: tenantId,
        residenceId,
        dutiesSummary: "Synthetic staffing validation duties.",
        qualifications: ["synthetic_fixture_qualification"],
        addressSummary: null,
        specialInstructions: null,
        contractVerificationState: "pending",
        paymentMethodReadinessState: "pending",
        locationVerificationState: "pending",
        createdByUserId: employerUserId,
        updatedByUserId: employerUserId
      },
      calendarProfileId
    ),
    record("dispatch_review", {
      kind: "dispatch_review",
      jobRequestId,
      organizationId: tenantId,
      residenceId,
      departmentId,
      workGroupId: config.workGroupId,
      roleDefinitionId: config.roleDefinitionId,
      state: "offer_preparation",
      priority: "normal",
      requiredWorkerCount: 1,
      createdByUserId: employerUserId
    }),
    record(
      "dispatch_candidate",
      {
        kind: "dispatch_candidate",
        dispatchReviewId,
        workerIdentityId,
        candidateSourceType: "internal_worker_profile",
        candidateSourceReference: `syn-${alias}-candidate-001`,
        approvedDisplayName: `${organizationLabel} Worker`,
        workGroupMatch: "match",
        roleDefinitionMatch: "match",
        qualificationSummaryState: "meets_requirements",
        verificationSummaryState: "meets_requirements",
        availabilityState: "available",
        scheduleConflictState: "conflict_free",
        serviceAreaState: "inside_service_area",
        travelSuitabilityState: "suitable",
        transportConstraintState: "available",
        recommendationState: "recommended",
        shortlistState: "shortlisted",
        shortlistOrder: 1,
        sourceFreshnessAt: createdAt,
        lastEvaluatedAt: createdAt,
        evaluationVersion: 1,
        addedByUserId: employerUserId
      },
      dispatchCandidateId
    ),
    record("worker_offer", {
      kind: "worker_offer",
      dispatchReviewId,
      jobRequestId,
      organizationId: tenantId,
      residenceId,
      departmentId,
      workerIdentityId,
      currentTermsVersionId: termsVersionId,
      status: "accepted",
      // created_at is anchored to the manifest window (not the DB default now()) so the
      // worker_offers_expires_after_created_check (expires_at > created_at) holds regardless
      // of the current date — the fixture expiry (2026-08-23) stays after this created_at.
      createdAt,
      expiresAt: "2026-08-23T23:59:00-04:00",
      createdByUserId: employerUserId
    }),
    record("worker_offer_terms", {
      kind: "worker_offer_terms",
      workerOfferId,
      versionNumber: 1,
      workerVisibleTitle: "Synthetic weekday staffing validation",
      workerVisibleSummary: "Synthetic staging-only assignment validation.",
      timezone: "America/Toronto",
      startAt: shiftStart,
      endAt: shiftEnd,
      workGroupId: config.workGroupId,
      roleDefinitionId: config.roleDefinitionId,
      compensationSummary: null,
      policySummary: "Synthetic staging policy; no economic terms.",
      createdByUserId: employerUserId
    }),
    record("worker_offer_delivery_attempt", {
      kind: "worker_offer_delivery_attempt",
      workerOfferId,
      status: "delivered",
      providerBoundary: "synthetic_no_provider",
      reason: "synthetic_fixture_only",
      attemptedAt: createdAt,
      deliveredAt: createdAt,
      createdByUserId: employerUserId
    }),
    record("worker_offer_response", {
      kind: "worker_offer_response",
      workerOfferId,
      workerIdentityId,
      termsVersionId,
      responseType: "accepted"
    }),
    record(
      "assignment",
      {
        kind: "assignment",
        jobRequestId,
        dispatchReviewId,
        workerOfferId,
        workerOfferTermsVersionId: termsVersionId,
        workerIdentityId,
        organizationId: tenantId,
        residenceId,
        departmentId,
        workGroupId: config.workGroupId,
        roleDefinitionId: config.roleDefinitionId,
        status: "confirmed",
        confirmedStartAt: shiftStart,
        confirmedEndAt: shiftEnd,
        timezone: "America/Toronto",
        confirmedTitle: "Synthetic weekday staffing validation",
        confirmedCompensationSummary: null,
        capacityCheckedAt: createdAt,
        conflictCheckedAt: createdAt,
        confirmedAt: createdAt,
        createdByUserId: employerUserId
      },
      assignmentId
    ),
    record(
      "attendance_record",
      {
        kind: "attendance_record",
        assignmentId,
        jobRequestId,
        workerIdentityId,
        organizationId: tenantId,
        residenceId,
        departmentId,
        workGroupId: config.workGroupId,
        roleDefinitionId: config.roleDefinitionId,
        status: "pending_start",
        scheduledStartAt: shiftStart,
        scheduledEndAt: shiftEnd,
        timezone: "America/Toronto",
        assignmentStatusSnapshot: "confirmed",
        verificationMethod: "none",
        checkInAt: null,
        checkOutAt: null,
        checkInLocationPolicyResult: null,
        checkOutLocationPolicyResult: null,
        createdByUserId: employerUserId
      },
      attendanceRecordId
    ),
    record("timesheet", {
      kind: "timesheet",
      assignmentId,
      attendanceRecordId,
      jobRequestId,
      workerIdentityId,
      organizationId: tenantId,
      residenceId,
      departmentId,
      workGroupId: config.workGroupId,
      roleDefinitionId: config.roleDefinitionId,
      status: "draft",
      attendanceVersionSnapshot: 1,
      assignmentVersionSnapshot: 1,
      scheduledStartAt: shiftStart,
      scheduledEndAt: shiftEnd,
      actualCheckInAt: null,
      actualCheckOutAt: null,
      timezone: "America/Toronto",
      rawElapsedMinutes: null,
      payableMinutes: null,
      billableMinutes: null,
      createdByUserId: employerUserId
    }),
    record(
      "audit_actor_reference",
      {
        kind: "audit_actor_reference",
        actorType: "system",
        userId: null,
        organizationId: null,
        displayLabel: "Synthetic QA reset evidence actor"
      },
      auditActorReferenceId
    ),
    record(
      "audit_event",
      {
        kind: "audit_event",
        actorReferenceId: auditActorReferenceId,
        organizationId: null,
        entityType: "qa_reset_evidence",
        entityId: auditEventId,
        entityPublicReference: `${config.namespace}:${alias}:retained-evidence`,
        action: "synthetic_fixture_prepared",
        priorState: null,
        newState: "retained",
        reason: "deterministic_qa_fixture",
        source: "system",
        correlationId: `syn-${alias}-qa-reset-001`,
        policyVersion: "qa-reset-v1"
      },
      auditEventId
    )
  ];
}

export function checksumValue(value: unknown) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function manifestReady(manifest: ResetManifest, config: QaResetConfig, now = new Date()) {
  const recordIds = manifest.records.map((record) => record.recordId);
  const recordKeys = manifest.records.map((record) => record.manifestRecordKey);
  const expectedRetentionUntil = new Date(
    Date.parse(manifest.createdAt) + retentionDays * 86_400_000
  ).toISOString();
  return (
    manifest.synthetic &&
    manifest.releaseSha === config.releaseSha &&
    manifest.checksum === config.manifestChecksum &&
    manifest.manifestId === config.manifestId &&
    manifest.projectId === config.projectId &&
    manifest.clusterId === config.clusterId &&
    manifest.databaseId === config.databaseId &&
    manifest.authorityId === config.authorityId &&
    manifest.tenantIds.length === 2 &&
    new Set(manifest.tenantIds).size === 2 &&
    manifest.tenantIds.every((tenantId) =>
      [config.tenantAId, config.tenantBId].includes(tenantId)
    ) &&
    manifest.controlEvidenceRetentionDays === retentionDays &&
    manifest.retentionUntil === expectedRetentionUntil &&
    new Date(manifest.expiresAt) > now &&
    manifest.records.length <= ownedEntityTypes.length * 2 * 10 &&
    new Set(recordIds).size === recordIds.length &&
    new Set(recordKeys).size === recordKeys.length &&
    validOrganizationIsolation(manifest) &&
    ownedEntityTypes.every(
      (entityType) => manifest.maximumRecordCounts[entityType] === count(manifest, entityType)
    ) &&
    manifest.records.every(
      (record) =>
        record.synthetic &&
        record.namespace === config.namespace &&
        manifest.tenantIds.includes(record.tenantId) &&
        ownedEntityTypes.includes(record.entityType) &&
        /^syn:(?:tenant-[ab]|shared):[a-z_]+:\d{2}$/.test(record.manifestRecordKey) &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
          record.recordId
        ) &&
        validTemplateRecord(record)
    )
  );
}

const tenantReferenceFields: Readonly<
  Partial<Record<SyntheticFixturePayload["kind"], readonly string[]>>
> = {
  user_identity: ["userId"],
  membership: ["organizationId", "userId"],
  membership_access_role: ["membershipId"],
  worker_identity: ["userId"],
  residence: ["organizationId"],
  department: ["organizationId", "residenceId"],
  job_request: [
    "organizationId",
    "residenceId",
    "departmentId",
    "creatorUserId",
    "createdByUserId"
  ],
  staffing_request_calendar_profile: [
    "jobRequestId",
    "organizationId",
    "residenceId",
    "createdByUserId",
    "updatedByUserId"
  ],
  dispatch_review: [
    "jobRequestId",
    "organizationId",
    "residenceId",
    "departmentId",
    "createdByUserId"
  ],
  dispatch_candidate: ["dispatchReviewId", "workerIdentityId", "addedByUserId"],
  worker_offer: [
    "dispatchReviewId",
    "jobRequestId",
    "organizationId",
    "residenceId",
    "departmentId",
    "workerIdentityId",
    "currentTermsVersionId",
    "createdByUserId"
  ],
  worker_offer_terms: ["workerOfferId", "createdByUserId"],
  worker_offer_delivery_attempt: ["workerOfferId", "createdByUserId"],
  worker_offer_response: ["workerOfferId", "workerIdentityId", "termsVersionId"],
  assignment: [
    "jobRequestId",
    "dispatchReviewId",
    "workerOfferId",
    "workerOfferTermsVersionId",
    "workerIdentityId",
    "organizationId",
    "residenceId",
    "departmentId",
    "createdByUserId"
  ],
  attendance_record: [
    "assignmentId",
    "jobRequestId",
    "workerIdentityId",
    "organizationId",
    "residenceId",
    "departmentId",
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
    "createdByUserId"
  ],
  audit_event: ["actorReferenceId"]
};

function validOrganizationIsolation(manifest: ResetManifest) {
  const ownerByRecordId = new Map(
    manifest.records.map((record) => [record.recordId, record.tenantId] as const)
  );
  return manifest.records.every((record) => {
    const payload = record.payload as unknown as Record<string, unknown>;
    return (tenantReferenceFields[record.payload.kind] ?? []).every((field) => {
      const referencedId = payload[field];
      return (
        typeof referencedId === "string" && ownerByRecordId.get(referencedId) === record.tenantId
      );
    });
  });
}

function count(manifest: ResetManifest, entityType: OwnedEntityType) {
  return manifest.records.filter((record) => record.entityType === entityType).length;
}

function validTemplateRecord(record: ManifestRecord) {
  const expectedKinds: Record<OwnedEntityType, SyntheticFixturePayload["kind"]> = {
    employer_organization: "employer_organization",
    work_group: "work_group",
    role_definition: "role_definition",
    access_role_definition: "access_role_definition",
    synthetic_user: "user",
    user_identity: "user_identity",
    membership: "membership",
    membership_access_role: "membership_access_role",
    worker_identity: "worker_identity",
    residence: "residence",
    department: "department",
    job_request: "job_request",
    staffing_request_calendar_profile: "staffing_request_calendar_profile",
    dispatch_review: "dispatch_review",
    dispatch_candidate: "dispatch_candidate",
    worker_offer: "worker_offer",
    worker_offer_terms: "worker_offer_terms",
    worker_offer_delivery_attempt: "worker_offer_delivery_attempt",
    worker_offer_response: "worker_offer_response",
    assignment: "assignment",
    attendance_record: "attendance_record",
    timesheet: "timesheet",
    audit_actor_reference: "audit_actor_reference",
    audit_event: "audit_event"
  };
  if (record.payload.kind !== expectedKinds[record.entityType]) return false;
  if (record.payload.kind === "access_role_definition") {
    return record.ownership === "approved_reference" && record.payload.referenceOnly;
  }
  if (record.ownership !== "manifest_owned") return false;
  if (record.payload.kind === "user") return record.payload.emailNormalized.endsWith(".invalid");
  if (record.payload.kind === "worker_offer_terms") {
    return (
      record.payload.compensationSummary === null &&
      validTorontoWeekdayWindow(record.payload.startAt, record.payload.endAt)
    );
  }
  if (record.payload.kind === "assignment") {
    const assignment = record.payload;
    const checkedAt = [
      assignment.capacityCheckedAt,
      assignment.conflictCheckedAt,
      assignment.confirmedAt
    ].map(Date.parse);
    return (
      assignment.confirmedCompensationSummary === null &&
      checkedAt.every(Number.isFinite) &&
      checkedAt.every((timestamp) => timestamp <= Date.parse(assignment.confirmedStartAt)) &&
      validTorontoWeekdayWindow(assignment.confirmedStartAt, assignment.confirmedEndAt)
    );
  }
  if (record.payload.kind === "job_request") {
    return validTorontoWeekdayWindow(record.payload.startAt, record.payload.endAt);
  }
  if (record.payload.kind === "attendance_record") {
    return (
      record.payload.verificationMethod === "none" &&
      record.payload.checkInAt === null &&
      record.payload.checkOutAt === null &&
      record.payload.checkInLocationPolicyResult === null &&
      record.payload.checkOutLocationPolicyResult === null &&
      validTorontoWeekdayWindow(record.payload.scheduledStartAt, record.payload.scheduledEndAt)
    );
  }
  if (record.payload.kind === "timesheet") {
    return (
      record.payload.status === "draft" &&
      record.payload.actualCheckInAt === null &&
      record.payload.actualCheckOutAt === null &&
      record.payload.rawElapsedMinutes === null &&
      record.payload.payableMinutes === null &&
      record.payload.billableMinutes === null &&
      validTorontoWeekdayWindow(record.payload.scheduledStartAt, record.payload.scheduledEndAt)
    );
  }
  if (record.payload.kind === "worker_offer_delivery_attempt") {
    return record.payload.providerBoundary === "synthetic_no_provider";
  }
  if (record.payload.kind === "audit_actor_reference") {
    return (
      record.payload.actorType === "system" &&
      record.payload.userId === null &&
      record.payload.organizationId === null &&
      record.payload.displayLabel === "Synthetic QA reset evidence actor"
    );
  }
  if (record.payload.kind === "audit_event") {
    return (
      record.payload.organizationId === null &&
      record.payload.entityType === "qa_reset_evidence" &&
      record.payload.entityId === record.recordId &&
      record.payload.entityPublicReference.startsWith(`${record.namespace}:`) &&
      record.payload.newState === "retained"
    );
  }
  if (record.payload.kind === "staffing_request_calendar_profile") {
    return (
      record.payload.addressSummary === null &&
      record.payload.specialInstructions === null &&
      record.payload.locationVerificationState === "pending"
    );
  }
  return true;
}

function validTorontoWeekdayWindow(startValue: string, endValue: string) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (
    Number.isNaN(start.valueOf()) ||
    Number.isNaN(end.valueOf()) ||
    start >= end ||
    !startValue.endsWith("-04:00") ||
    !endValue.endsWith("-04:00")
  ) {
    return false;
  }
  const weekday = new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    timeZone: "America/Toronto"
  }).format(start);
  return !["Sat", "Sun"].includes(weekday);
}

function deterministicUuid(seed: string) {
  const value = createHash("sha256").update(seed).digest("hex").slice(0, 32).split("");
  value[12] = "4";
  value[16] = ["8", "9", "a", "b"][Number.parseInt(value[16]!, 16) % 4]!;
  const compact = value.join("");
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}
