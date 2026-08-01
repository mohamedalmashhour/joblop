import { describe, expect, it } from "vitest";
import { readCandidateSourceConfig } from "./config";
import { serviceToken, tenantA, tenantB } from "./testFixture";

describe("candidate source configuration", () => {
  it("accepts exact staging configuration and conservative defaults", () => {
    const config = readCandidateSourceConfig(environment());
    expect(config.tenantLimitPerMinute).toBe(30);
    expect(config.serviceLimitPerMinute).toBe(60);
    expect(config.allowedTimezones).toEqual(["America/Toronto"]);
  });

  it.each(["production", "local", undefined])("rejects non-staging environment %s", (value) => {
    expect(() => readCandidateSourceConfig(environment({ RWOS_ENV: value }))).toThrow(
      "CANDIDATE_ADAPTER_STAGING_ONLY"
    );
  });

  it("rejects release drift, duplicate tenants, and unreasonable limits", () => {
    expect(() =>
      readCandidateSourceConfig(environment({ CANDIDATE_ADAPTER_RELEASE_SHA: "0".repeat(40) }))
    ).toThrow("CANDIDATE_ADAPTER_RELEASE_MISMATCH");
    expect(() =>
      readCandidateSourceConfig(
        environment({ CANDIDATE_ADAPTER_TENANT_B_ID: tenantA.organizationId })
      )
    ).toThrow("CANDIDATE_ADAPTER_TENANTS_MUST_DIFFER");
    expect(() =>
      readCandidateSourceConfig(environment({ CANDIDATE_ADAPTER_TENANT_LIMIT_PER_MINUTE: "101" }))
    ).toThrow("CANDIDATE_ADAPTER_TENANT_LIMIT_INVALID");
  });
});

function environment(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const releaseSha = "a31fa96f52247bb684032c6a8d3d379c098c2603";
  return {
    RWOS_ENV: "staging",
    CANDIDATE_ADAPTER_AUTH_MODE: "dual-required",
    CANDIDATE_ADAPTER_AUDIENCE: "https://rwos-candidate-opaque-nn.a.run.app",
    CANDIDATE_ADAPTER_API_SERVICE_ACCOUNT: "rwos-api@staging.invalid",
    PORT: "8080",
    RWOS_IMAGE_RELEASE_SHA: releaseSha,
    CANDIDATE_ADAPTER_RELEASE_SHA: releaseSha,
    CANDIDATE_ADAPTER_SERVICE_TOKEN: serviceToken,
    CANDIDATE_ADAPTER_TENANT_A_ID: tenantA.organizationId,
    CANDIDATE_ADAPTER_TENANT_A_WORK_GROUP_ID: tenantA.workGroupId,
    CANDIDATE_ADAPTER_TENANT_A_ROLE_DEFINITION_ID: tenantA.roleDefinitionId,
    CANDIDATE_ADAPTER_TENANT_B_ID: tenantB.organizationId,
    CANDIDATE_ADAPTER_TENANT_B_WORK_GROUP_ID: tenantB.workGroupId,
    CANDIDATE_ADAPTER_TENANT_B_ROLE_DEFINITION_ID: tenantB.roleDefinitionId,
    ...overrides
  };
}
