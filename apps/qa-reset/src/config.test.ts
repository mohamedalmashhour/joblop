import { describe, expect, it } from "vitest";
import { readQaResetConfig } from "./config";
import { testConfig } from "./testFixture";

describe("QA reset configuration", () => {
  it("accepts exact bounded staging configuration", () => {
    expect(readQaResetConfig(environment()).maximumRecordsPerEntity).toBe(2);
    expect(readQaResetConfig(environment()).persistenceMode).toBe("postgres");
  });

  it("never permits process memory as the staging persistence mode", () => {
    expect(() => readQaResetConfig(environment({ QA_RESET_PERSISTENCE_MODE: "memory" }))).toThrow(
      "QA_RESET_POSTGRES_REQUIRED"
    );
    expect(() => readQaResetConfig(environment({ QA_RESET_PERSISTENCE_MODE: undefined }))).toThrow(
      "QA_RESET_POSTGRES_REQUIRED"
    );
  });

  it.each(["production", "test", "local", undefined])("rejects environment %s", (RWOS_ENV) => {
    expect(() => readQaResetConfig(environment({ RWOS_ENV }))).toThrow("QA_RESET_STAGING_ONLY");
  });

  it.each([
    ["wildcard", { QA_RESET_PROJECT_ID: "gcp/projects/*" }],
    ["production", { QA_RESET_CLUSTER_ID: "gcp/cloudsql/production-001" }],
    ["ambiguous", { QA_RESET_DATABASE_ID: "gcp/databases/current" }],
    ["placeholder", { QA_RESET_AUTHORITY_ID: "gcp/authorities/placeholder" }]
  ])("rejects %s target identity", (_label, override) => {
    expect(() => readQaResetConfig(environment(override))).toThrow(/INVALID/);
  });

  it("rejects wrong release, expired manifest, duplicate tenants and excessive records", () => {
    expect(() => readQaResetConfig(environment({ QA_RESET_RELEASE_SHA: "0".repeat(40) }))).toThrow(
      "QA_RESET_RELEASE_MISMATCH"
    );
    expect(() =>
      readQaResetConfig(environment({ QA_RESET_MANIFEST_EXPIRES_AT: "2026-07-27T00:00:00.000Z" }))
    ).toThrow("QA_RESET_MANIFEST_TIME_INVALID");
    expect(() =>
      readQaResetConfig(environment({ QA_RESET_TENANT_B_ID: testConfig.tenantAId }))
    ).toThrow("QA_RESET_TENANTS_MUST_DIFFER");
    expect(() =>
      readQaResetConfig(environment({ QA_RESET_MAXIMUM_RECORDS_PER_ENTITY: "11" }))
    ).toThrow("QA_RESET_MAXIMUM_RECORDS_PER_ENTITY_INVALID");
  });

  it("requires distinct browser, iOS, Android, manual-QA and monitoring credentials and identities", () => {
    expect(() =>
      readQaResetConfig(
        environment({
          QA_RESET_IOS_E2E_APP_CREDENTIAL: testConfig.callers["browser-e2e"].applicationCredential
        })
      )
    ).toThrow("QA_RESET_CALLER_IDENTITIES_MUST_DIFFER");
    expect(() =>
      readQaResetConfig(
        environment({
          QA_RESET_ANDROID_E2E_SERVICE_ACCOUNT: testConfig.callers["ios-e2e"].serviceAccountEmail
        })
      )
    ).toThrow("QA_RESET_CALLER_IDENTITIES_MUST_DIFFER");
  });

  it("requires an approved dual-header mode and exact Cloud Run audience", () => {
    expect(() => readQaResetConfig(environment({ QA_RESET_AUTH_MODE: "legacy-app-only" }))).toThrow(
      "QA_RESET_AUTH_MODE_INVALID"
    );
    expect(() => readQaResetConfig(environment({ QA_RESET_AUDIENCE: "http://localhost" }))).toThrow(
      "QA_RESET_AUDIENCE_INVALID"
    );
  });
});

export function environment(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    RWOS_ENV: "staging",
    QA_RESET_PERSISTENCE_MODE: "postgres",
    PORT: "8080",
    QA_RESET_AUTH_MODE: testConfig.authMode,
    QA_RESET_AUDIENCE: testConfig.audience,
    ...Object.fromEntries(
      Object.entries(testConfig.callers).flatMap(([alias, caller]) => {
        const prefix = alias.replaceAll("-", "_").toUpperCase();
        return [
          [`QA_RESET_${prefix}_APP_CREDENTIAL`, caller.applicationCredential],
          [`QA_RESET_${prefix}_SERVICE_ACCOUNT`, caller.serviceAccountEmail],
          ...(caller.operatorIdentity
            ? [[`QA_RESET_${prefix}_OPERATOR_IDENTITY`, caller.operatorIdentity]]
            : [])
        ];
      })
    ),
    RWOS_IMAGE_RELEASE_SHA: testConfig.releaseSha,
    QA_RESET_RELEASE_SHA: testConfig.releaseSha,
    QA_RESET_PROJECT_ID: testConfig.projectId,
    QA_RESET_CLUSTER_ID: testConfig.clusterId,
    QA_RESET_DATABASE_ID: testConfig.databaseId,
    QA_RESET_AUTHORITY_ID: testConfig.authorityId,
    QA_RESET_TENANT_A_ID: testConfig.tenantAId,
    QA_RESET_TENANT_B_ID: testConfig.tenantBId,
    QA_RESET_WORK_GROUP_ID: testConfig.workGroupId,
    QA_RESET_ROLE_DEFINITION_ID: testConfig.roleDefinitionId,
    QA_RESET_ORGANIZATION_OWNER_ACCESS_ROLE_ID: testConfig.organizationOwnerAccessRoleId,
    QA_RESET_NAMESPACE: testConfig.namespace,
    QA_RESET_MANIFEST_ID: testConfig.manifestId,
    QA_RESET_MANIFEST_CHECKSUM: testConfig.manifestChecksum,
    QA_RESET_MANIFEST_CREATED_AT: testConfig.manifestCreatedAt.toISOString(),
    QA_RESET_MANIFEST_EXPIRES_AT: testConfig.manifestExpiresAt.toISOString(),
    QA_RESET_DRY_RUN_APPROVAL_REFERENCE: testConfig.dryRunApprovalReference,
    QA_RESET_PREPARE_APPROVAL_REFERENCE: testConfig.prepareApprovalReference,
    QA_RESET_CLEANUP_APPROVAL_REFERENCE: testConfig.cleanupApprovalReference,
    QA_RESET_MAXIMUM_RECORDS_PER_ENTITY: String(testConfig.maximumRecordsPerEntity),
    ...overrides
  };
}
