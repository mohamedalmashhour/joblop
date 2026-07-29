import type { CandidateSourceConfig, TenantConfig } from "./config";

export const tenantA = {
  label: "tenant-a" as const,
  organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  workGroupId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa001",
  roleDefinitionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa002"
};

export const tenantB = {
  label: "tenant-b" as const,
  organizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  workGroupId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001",
  roleDefinitionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002"
};

export const serviceToken = "synthetic-service-token-at-least-32-characters";

export const testConfig: CandidateSourceConfig = {
  port: 8080,
  environment: "test",
  serviceToken,
  releaseSha: "a31fa96f52247bb684032c6a8d3d379c098c2603",
  tenantLimitPerMinute: 30,
  serviceLimitPerMinute: 60,
  allowedTimezones: ["America/Toronto"],
  tenants: [tenantA, tenantB]
};

export function searchRequest(tenant: TenantConfig = tenantA) {
  return {
    dispatchReviewId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    organizationId: tenant.organizationId,
    workGroupId: tenant.workGroupId,
    roleDefinitionId: tenant.roleDefinitionId,
    startAt: "2026-07-28T13:00:00.000Z",
    endAt: "2026-07-28T21:00:00.000Z",
    timezone: "America/Toronto",
    requestedAt: "2026-07-28T12:00:00.000Z"
  };
}

export function evaluateRequest(
  tenant: TenantConfig = tenantA,
  reference = "syn-tenant-a-candidate-001"
) {
  const request = searchRequest(tenant);
  return {
    dispatchReviewId: request.dispatchReviewId,
    organizationId: request.organizationId,
    workGroupId: request.workGroupId,
    roleDefinitionId: request.roleDefinitionId,
    startAt: request.startAt,
    endAt: request.endAt,
    timezone: request.timezone,
    candidateSourceReference: reference
  };
}
