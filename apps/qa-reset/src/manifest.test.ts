import { describe, expect, it } from "vitest";
import {
  checksumValue,
  createResetManifest,
  manifestReady,
  ownedEntityTypes,
  type ManifestRecord,
  type SyntheticFixturePayload
} from "./manifest";
import { testConfig, testManifest } from "./testFixture";

describe("staging QA reset manifest template", () => {
  it("is deterministic, bounded and contains both approved test employer organization graphs", () => {
    const repeated = createResetManifest(testConfig);

    expect(repeated).toEqual(testManifest);
    expect(repeated.checksum).toBe(testManifest.checksum);
    expect(new Set(repeated.records.map((record) => record.recordId)).size).toBe(
      repeated.records.length
    );
    expect(new Set(repeated.records.map((record) => record.manifestRecordKey)).size).toBe(
      repeated.records.length
    );
    expect(new Set(repeated.records.map((record) => record.entityType))).toEqual(
      new Set(ownedEntityTypes)
    );
    expect(repeated.tenantIds).toEqual([testConfig.tenantAId, testConfig.tenantBId]);
    expect(manifestReady(repeated, testConfig, testConfig.manifestCreatedAt)).toBe(true);
  });

  it("uses approved human-facing organization labels while retaining internal tenant identifiers", () => {
    const organizations = records("employer_organization");
    expect(
      organizations.map(({ payload }) =>
        payload.kind === "employer_organization" ? payload.displayName : null
      )
    ).toEqual(["Test Employer Organization A", "Test Employer Organization B"]);
    expect(testManifest.tenantIds).toEqual([testConfig.tenantAId, testConfig.tenantBId]);
    expect(organizations.map(({ manifestRecordKey }) => manifestRecordKey)).toEqual([
      "syn:tenant-a:employer_organization:01",
      "syn:tenant-b:employer_organization:01"
    ]);

    const humanFacingKeys = new Set([
      "legalName",
      "displayName",
      "displayLabel",
      "name",
      "title",
      "dutiesSummary",
      "approvedDisplayName",
      "workerVisibleTitle",
      "workerVisibleSummary",
      "policySummary",
      "confirmedTitle"
    ]);
    const labels = testManifest.records.flatMap(({ payload }) =>
      Object.entries(payload)
        .filter(([key, value]) => humanFacingKeys.has(key) && typeof value === "string")
        .map(([, value]) => value as string)
    );
    expect(labels).not.toHaveLength(0);
    expect(labels.every((label) => !/\b(?:tenant|resident|apartment|company)\b/i.test(label))).toBe(
      true
    );
  });

  it("uses only verified synthetic identities and minimum application roles", () => {
    const users = records("synthetic_user");
    const identities = records("user_identity");
    const membershipRoles = records("membership_access_role");
    const accessRole = records("access_role_definition");

    expect(users).toHaveLength(4);
    expect(
      users.every(
        ({ payload }) =>
          payload.kind === "user" &&
          payload.status === "active" &&
          payload.emailNormalized.endsWith(".invalid")
      )
    ).toBe(true);
    expect(identities).toHaveLength(4);
    expect(
      identities.every(
        ({ payload }) =>
          payload.kind === "user_identity" &&
          payload.provider === "dev_test" &&
          Boolean(payload.emailVerifiedAt) &&
          payload.passwordHashReference === null
      )
    ).toBe(true);
    expect(membershipRoles).toHaveLength(2);
    expect(
      membershipRoles.every(
        ({ payload }) =>
          payload.kind === "membership_access_role" &&
          payload.accessRoleKey === "ORGANIZATION_OWNER"
      )
    ).toBe(true);
    expect(accessRole).toHaveLength(1);
    expect(accessRole[0]?.ownership).toBe("approved_reference");
  });

  it("defines an assignment-ready Toronto weekday workflow without economics", () => {
    for (const tenantId of testManifest.tenantIds) {
      const tenantRecords = testManifest.records.filter((record) => record.tenantId === tenantId);
      expect(tenantRecords.some((record) => record.entityType === "employer_organization")).toBe(
        true
      );
      expect(tenantRecords.some((record) => record.entityType === "worker_offer_response")).toBe(
        true
      );
      expect(tenantRecords.map((record) => record.entityType)).toEqual(
        expect.arrayContaining([
          "staffing_request_calendar_profile",
          "dispatch_candidate",
          "worker_offer_delivery_attempt",
          "attendance_record",
          "timesheet",
          "audit_actor_reference",
          "audit_event"
        ])
      );
      expect(
        tenantRecords.some(
          (record) =>
            record.payload.kind === "worker_offer_response" &&
            record.payload.responseType === "accepted"
        )
      ).toBe(true);

      const terms = tenantRecords.find((record) => record.entityType === "worker_offer_terms");
      const assignment = tenantRecords.find((record) => record.entityType === "assignment");
      expect(terms?.payload).toMatchObject({
        kind: "worker_offer_terms",
        timezone: "America/Toronto",
        startAt: "2026-08-24T09:00:00-04:00",
        endAt: "2026-08-24T17:00:00-04:00",
        compensationSummary: null
      });
      expect(assignment?.payload).toMatchObject({
        kind: "assignment",
        status: "confirmed",
        timezone: "America/Toronto",
        confirmedCompensationSummary: null,
        capacityCheckedAt: "2026-07-28T00:00:00.000Z",
        conflictCheckedAt: "2026-07-28T00:00:00.000Z",
        confirmedAt: "2026-07-28T00:00:00.000Z"
      });
    }
  });

  it("preserves the platform exclusions in synthetic fixture payloads", () => {
    const payload = JSON.stringify(testManifest.records.map((record) => record.payload));
    expect(payload).not.toMatch(
      /payroll|workerPayment|employerInvoice|taxAmount|notificationDestination|automatedEmploymentDecision|latitude|longitude/iu
    );
    expect(
      records("worker_offer_terms").every(({ payload }) =>
        payload.kind === "worker_offer_terms" ? payload.compensationSummary === null : false
      )
    ).toBe(true);
    expect(
      records("assignment").every(({ payload }) =>
        payload.kind === "assignment" ? payload.confirmedCompensationSummary === null : false
      )
    ).toBe(true);
    expect(
      records("worker_offer_delivery_attempt").every(({ payload }) =>
        payload.kind === "worker_offer_delivery_attempt"
          ? payload.providerBoundary === "synthetic_no_provider"
          : false
      )
    ).toBe(true);
    expect(
      records("attendance_record").every(({ payload }) =>
        payload.kind === "attendance_record"
          ? payload.verificationMethod === "none" &&
            payload.checkInAt === null &&
            payload.checkOutAt === null
          : false
      )
    ).toBe(true);
    expect(
      records("timesheet").every(({ payload }) =>
        payload.kind === "timesheet"
          ? payload.status === "draft" &&
            payload.payableMinutes === null &&
            payload.billableMinutes === null
          : false
      )
    ).toBe(true);
  });

  it("makes all synthetic records removable and keeps the approved role reference external", () => {
    const externalReferences = testManifest.records.filter(
      (record) => record.ownership === "approved_reference"
    );
    expect(externalReferences).toHaveLength(1);
    expect(externalReferences[0]?.entityType).toBe("access_role_definition");
    expect(
      testManifest.records
        .filter((record) => record.ownership === "manifest_owned")
        .every((record) => record.synthetic && record.manifestRecordKey.startsWith("syn:"))
    ).toBe(true);
  });

  it("retains control evidence for exactly 30 days and rejects template tampering", () => {
    expect(testManifest.controlEvidenceRetentionDays).toBe(30);
    expect(testManifest.retentionUntil).toBe("2026-08-27T00:00:00.000Z");

    const first = testManifest.records[0]!;
    const tampered = {
      ...testManifest,
      records: [{ ...first, recordId: testManifest.records[1]!.recordId }, ...testManifest.records]
    };
    expect(manifestReady(tampered, testConfig, testConfig.manifestCreatedAt)).toBe(false);
  });

  it("denies cross-organization references for every supported entity path", () => {
    const paths: ReadonlyArray<
      readonly [SyntheticFixturePayload["kind"], string, (typeof ownedEntityTypes)[number]]
    > = [
      ["user_identity", "userId", "synthetic_user"],
      ["membership", "organizationId", "employer_organization"],
      ["membership", "userId", "synthetic_user"],
      ["membership_access_role", "membershipId", "membership"],
      ["worker_identity", "userId", "synthetic_user"],
      ["residence", "organizationId", "employer_organization"],
      ["department", "organizationId", "employer_organization"],
      ["department", "residenceId", "residence"],
      ["job_request", "organizationId", "employer_organization"],
      ["job_request", "residenceId", "residence"],
      ["job_request", "departmentId", "department"],
      ["job_request", "creatorUserId", "synthetic_user"],
      ["job_request", "createdByUserId", "synthetic_user"],
      ["staffing_request_calendar_profile", "jobRequestId", "job_request"],
      ["staffing_request_calendar_profile", "organizationId", "employer_organization"],
      ["staffing_request_calendar_profile", "residenceId", "residence"],
      ["staffing_request_calendar_profile", "createdByUserId", "synthetic_user"],
      ["staffing_request_calendar_profile", "updatedByUserId", "synthetic_user"],
      ["dispatch_review", "jobRequestId", "job_request"],
      ["dispatch_review", "organizationId", "employer_organization"],
      ["dispatch_review", "residenceId", "residence"],
      ["dispatch_review", "departmentId", "department"],
      ["dispatch_review", "createdByUserId", "synthetic_user"],
      ["dispatch_candidate", "dispatchReviewId", "dispatch_review"],
      ["dispatch_candidate", "workerIdentityId", "worker_identity"],
      ["dispatch_candidate", "addedByUserId", "synthetic_user"],
      ["worker_offer", "dispatchReviewId", "dispatch_review"],
      ["worker_offer", "jobRequestId", "job_request"],
      ["worker_offer", "organizationId", "employer_organization"],
      ["worker_offer", "residenceId", "residence"],
      ["worker_offer", "departmentId", "department"],
      ["worker_offer", "workerIdentityId", "worker_identity"],
      ["worker_offer", "currentTermsVersionId", "worker_offer_terms"],
      ["worker_offer", "createdByUserId", "synthetic_user"],
      ["worker_offer_terms", "workerOfferId", "worker_offer"],
      ["worker_offer_terms", "createdByUserId", "synthetic_user"],
      ["worker_offer_delivery_attempt", "workerOfferId", "worker_offer"],
      ["worker_offer_delivery_attempt", "createdByUserId", "synthetic_user"],
      ["worker_offer_response", "workerOfferId", "worker_offer"],
      ["worker_offer_response", "workerIdentityId", "worker_identity"],
      ["worker_offer_response", "termsVersionId", "worker_offer_terms"],
      ["assignment", "jobRequestId", "job_request"],
      ["assignment", "dispatchReviewId", "dispatch_review"],
      ["assignment", "workerOfferId", "worker_offer"],
      ["assignment", "workerOfferTermsVersionId", "worker_offer_terms"],
      ["assignment", "workerIdentityId", "worker_identity"],
      ["assignment", "organizationId", "employer_organization"],
      ["assignment", "residenceId", "residence"],
      ["assignment", "departmentId", "department"],
      ["assignment", "createdByUserId", "synthetic_user"],
      ["attendance_record", "assignmentId", "assignment"],
      ["attendance_record", "jobRequestId", "job_request"],
      ["attendance_record", "workerIdentityId", "worker_identity"],
      ["attendance_record", "organizationId", "employer_organization"],
      ["attendance_record", "residenceId", "residence"],
      ["attendance_record", "departmentId", "department"],
      ["attendance_record", "createdByUserId", "synthetic_user"],
      ["timesheet", "assignmentId", "assignment"],
      ["timesheet", "attendanceRecordId", "attendance_record"],
      ["timesheet", "jobRequestId", "job_request"],
      ["timesheet", "workerIdentityId", "worker_identity"],
      ["timesheet", "organizationId", "employer_organization"],
      ["timesheet", "residenceId", "residence"],
      ["timesheet", "departmentId", "department"],
      ["timesheet", "createdByUserId", "synthetic_user"],
      ["audit_actor_reference", "userId", "synthetic_user"],
      ["audit_actor_reference", "organizationId", "employer_organization"],
      ["audit_event", "actorReferenceId", "audit_actor_reference"],
      ["audit_event", "organizationId", "employer_organization"],
      ["audit_event", "entityId", "assignment"]
    ];

    for (const [kind, field, targetEntityType] of paths) {
      const source = testManifest.records.find(
        (record) => record.tenantId === testConfig.tenantAId && record.payload.kind === kind
      );
      const foreign = testManifest.records.find(
        (record) =>
          record.tenantId === testConfig.tenantBId && record.entityType === targetEntityType
      );
      expect(source, `${kind}.${field} source fixture`).toBeDefined();
      expect(foreign, `${kind}.${field} foreign fixture`).toBeDefined();

      const recordsWithForeignReference = testManifest.records.map((record) =>
        record === source
          ? ({
              ...record,
              payload: { ...record.payload, [field]: foreign!.recordId }
            } as ManifestRecord)
          : record
      );
      const unsigned = { ...testManifest, records: recordsWithForeignReference };
      const { checksum: ignored, ...body } = unsigned;
      void ignored;
      const checksum = checksumValue(body);
      const tampered = { ...body, checksum };

      expect(
        manifestReady(
          tampered,
          { ...testConfig, manifestChecksum: checksum },
          testConfig.manifestCreatedAt
        ),
        `${kind}.${field}`
      ).toBe(false);
    }
  });

  it("makes retained audit evidence self-contained and independent of deletable fixtures", () => {
    const deletableIds = new Set(
      testManifest.records
        .filter(
          ({ entityType }) => entityType !== "audit_actor_reference" && entityType !== "audit_event"
        )
        .map(({ recordId }) => recordId)
    );
    for (const record of testManifest.records.filter(({ entityType }) =>
      ["audit_actor_reference", "audit_event"].includes(entityType)
    )) {
      const payload = record.payload as unknown as Record<string, unknown>;
      expect(payload.userId ?? null).toBeNull();
      expect(payload.organizationId ?? null).toBeNull();
      expect(
        Object.values(payload).some((value) => typeof value === "string" && deletableIds.has(value))
      ).toBe(false);
      if (record.entityType === "audit_event") {
        expect(payload.entityId).toBe(record.recordId);
        expect(payload.entityPublicReference).toContain(testManifest.namespace);
      }
    }
  });
});

function records(entityType: (typeof ownedEntityTypes)[number]) {
  return testManifest.records.filter((record) => record.entityType === entityType);
}
