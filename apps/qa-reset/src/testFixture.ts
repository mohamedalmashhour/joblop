import type { ResetCommand } from "./command";
import type { QaResetConfig } from "./config";
import { createResetManifest } from "./manifest";

const configWithoutChecksum: QaResetConfig = {
  port: 8080,
  environment: "staging",
  persistenceMode: "postgres",
  authMode: "dual-required",
  audience: "https://qa-reset-local-test.run.app",
  callers: Object.freeze({
    "browser-e2e": caller("browser-e2e"),
    "ios-e2e": caller("ios-e2e"),
    "android-e2e": caller("android-e2e"),
    "manual-qa": caller("manual-qa"),
    monitoring: caller("monitoring", true)
  }),
  releaseSha: "a31fa96f52247bb684032c6a8d3d379c098c2603",
  projectId: "gcp/projects/93757649-staging-001",
  clusterId: "gcp/cloudsql/clusters/rwos-staging-001",
  databaseId: "gcp/cloudsql/databases/rwos-staging-qa-001",
  authorityId: "gcp/qa-reset/authorities/rwos-staging-001",
  tenantAId: "00000000-0000-4000-8000-00000000000a",
  tenantBId: "00000000-0000-4000-8000-00000000000b",
  workGroupId: "00000000-0000-4000-8000-000000000101",
  roleDefinitionId: "00000000-0000-4000-8000-000000000102",
  organizationOwnerAccessRoleId: "00000000-0000-4000-8000-000000000103",
  namespace: "rwos:qa-reset:staging:v1",
  manifestId: "rwos-qa-reset-manifest-v1",
  manifestChecksum: "0".repeat(64),
  manifestCreatedAt: new Date("2026-07-28T00:00:00.000Z"),
  manifestExpiresAt: new Date("2026-08-20T00:00:00.000Z"),
  dryRunApprovalReference: "gcp/approvals/qa-reset-dry-run-001",
  prepareApprovalReference: "gcp/approvals/qa-reset-prepare-001",
  cleanupApprovalReference: "gcp/approvals/qa-reset-cleanup-001",
  maximumRecordsPerEntity: 2
};

function caller(
  alias: "browser-e2e" | "ios-e2e" | "android-e2e" | "manual-qa" | "monitoring",
  monitoring = false
) {
  return Object.freeze({
    alias,
    applicationCredential: `qa-reset-${alias}-application-credential-for-local-tests`,
    serviceAccountEmail: `rwos-stg-${alias}@local-test.invalid`,
    operatorIdentity: monitoring ? null : `gcp/operators/${alias}-owner-001`
  });
}

const checksum = createResetManifest(configWithoutChecksum).checksum;
export const testConfig: QaResetConfig = {
  ...configWithoutChecksum,
  manifestChecksum: checksum
};
export const testManifest = createResetManifest(testConfig);

export function browserCommand(
  action: "prepare" | "cleanup",
  overrides: Partial<ResetCommand> = {}
): ResetCommand {
  return {
    scope: "browser",
    action,
    tenantIds: [testConfig.tenantAId, testConfig.tenantBId],
    releaseSha: testConfig.releaseSha,
    confirmation: "authorized-staging-browser-e2e",
    authorityId: testConfig.authorityId,
    dryRunChecksum: null,
    preparationReceipt: null,
    ...overrides
  };
}

export function nativeCommand(
  action: "prepare" | "cleanup",
  overrides: Partial<ResetCommand> = {}
): ResetCommand {
  return {
    scope: "native",
    action,
    tenantIds: [testConfig.tenantAId],
    releaseSha: testConfig.releaseSha,
    confirmation: "authorized-staging-native-e2e",
    authorityId: testConfig.authorityId,
    dryRunChecksum: null,
    preparationReceipt: null,
    ...overrides
  };
}
