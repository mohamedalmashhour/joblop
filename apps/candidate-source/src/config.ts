import {
  readTrustedReceiverAuthorization,
  type TrustedReceiverAuthorization
} from "@rwos/service-auth";

export const approvedReleaseSha = "a31fa96f52247bb684032c6a8d3d379c098c2603";

export type TenantConfig = Readonly<{
  label: "tenant-a" | "tenant-b";
  organizationId: string;
  workGroupId: string;
  roleDefinitionId: string;
}>;

export type CandidateSourceConfig = Readonly<{
  port: number;
  environment: "staging" | "test";
  serviceToken: string;
  releaseSha: string;
  tenantLimitPerMinute: number;
  serviceLimitPerMinute: number;
  allowedTimezones: readonly string[];
  tenants: readonly [TenantConfig, TenantConfig];
  trustedAuthorization?: TrustedReceiverAuthorization;
}>;

export function readCandidateSourceConfig(env: NodeJS.ProcessEnv = process.env) {
  const environment = env.RWOS_ENV;
  if (environment !== "staging" && environment !== "test") {
    throw new Error("CANDIDATE_ADAPTER_STAGING_ONLY");
  }
  const releaseSha = required(env.CANDIDATE_ADAPTER_RELEASE_SHA, "RELEASE_SHA");
  if (releaseSha !== approvedReleaseSha) throw new Error("CANDIDATE_ADAPTER_RELEASE_MISMATCH");

  const config: CandidateSourceConfig = {
    port: boundedInteger(env.PORT ?? "8080", 1, 65_535, "PORT"),
    environment,
    serviceToken: requiredSecret(env.CANDIDATE_ADAPTER_SERVICE_TOKEN),
    releaseSha,
    tenantLimitPerMinute: boundedInteger(
      env.CANDIDATE_ADAPTER_TENANT_LIMIT_PER_MINUTE ?? "30",
      1,
      100,
      "TENANT_LIMIT"
    ),
    serviceLimitPerMinute: boundedInteger(
      env.CANDIDATE_ADAPTER_SERVICE_LIMIT_PER_MINUTE ?? "60",
      1,
      200,
      "SERVICE_LIMIT"
    ),
    allowedTimezones: readTimezones(env.CANDIDATE_ADAPTER_ALLOWED_TIMEZONES),
    tenants: [readTenant(env, "A", "tenant-a"), readTenant(env, "B", "tenant-b")]
  };
  const trustedAuthorization = readTrustedReceiverAuthorization({
    env,
    prefix: "CANDIDATE_ADAPTER",
    environment,
    applicationCredential: config.serviceToken,
    releaseSha
  });
  if (config.tenants[0].organizationId === config.tenants[1].organizationId) {
    throw new Error("CANDIDATE_ADAPTER_TENANTS_MUST_DIFFER");
  }
  return { ...config, trustedAuthorization };
}

function readTenant(
  env: NodeJS.ProcessEnv,
  key: "A" | "B",
  label: TenantConfig["label"]
): TenantConfig {
  return {
    label,
    organizationId: requiredUuid(env[`CANDIDATE_ADAPTER_TENANT_${key}_ID`], `${key}_ID`),
    workGroupId: requiredUuid(
      env[`CANDIDATE_ADAPTER_TENANT_${key}_WORK_GROUP_ID`],
      `${key}_WORK_GROUP_ID`
    ),
    roleDefinitionId: requiredUuid(
      env[`CANDIDATE_ADAPTER_TENANT_${key}_ROLE_DEFINITION_ID`],
      `${key}_ROLE_DEFINITION_ID`
    )
  };
}

function readTimezones(value: string | undefined) {
  const timezones = (value ?? "America/Toronto").split(",").map((item) => item.trim());
  if (
    timezones.length < 1 ||
    timezones.length > 10 ||
    timezones.some(
      (timezone) =>
        !timezone || timezone.length > 64 || !/^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)+$/.test(timezone)
    )
  ) {
    throw new Error("CANDIDATE_ADAPTER_TIMEZONES_INVALID");
  }
  return Object.freeze([...new Set(timezones)]);
}

function requiredSecret(value: string | undefined) {
  if (!value || value.length < 32 || value.length > 512) {
    throw new Error("CANDIDATE_ADAPTER_SERVICE_TOKEN_REQUIRED");
  }
  return value;
}

function required(value: string | undefined, key: string) {
  if (!value) throw new Error(`CANDIDATE_ADAPTER_${key}_REQUIRED`);
  return value;
}

function requiredUuid(value: string | undefined, key: string) {
  if (
    !value ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new Error(`CANDIDATE_ADAPTER_${key}_INVALID`);
  }
  return value;
}

function boundedInteger(value: string, minimum: number, maximum: number, key: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`CANDIDATE_ADAPTER_${key}_INVALID`);
  }
  return parsed;
}
