import {
  readTrustedReceiverAuthorization,
  type TrustedReceiverAuthorization
} from "@rwos/service-auth";

export const approvedReleaseSha = "a31fa96f52247bb684032c6a8d3d379c098c2603";
export const retentionDays = 30;
export const retryScheduleSeconds = [1, 5] as const;
export const maximumAttempts = 3;

export type DeliveryTenant = Readonly<{
  label: "tenant-a" | "tenant-b";
  organizationId: string;
}>;

export type OfferDeliveryConfig = Readonly<{
  port: number;
  environment: "staging" | "test";
  serviceToken: string;
  releaseSha: string;
  tenantLimitPerMinute: number;
  serviceLimitPerMinute: number;
  tenants: readonly [DeliveryTenant, DeliveryTenant];
  trustedAuthorization?: TrustedReceiverAuthorization;
}>;

export function readOfferDeliveryConfig(env: NodeJS.ProcessEnv = process.env): OfferDeliveryConfig {
  if (env.RWOS_ENV !== "staging" && env.RWOS_ENV !== "test") {
    throw new Error("OFFER_DELIVERY_STAGING_ONLY");
  }
  const releaseSha = required(env.OFFER_DELIVERY_ADAPTER_RELEASE_SHA, "RELEASE_SHA");
  if (releaseSha !== approvedReleaseSha) throw new Error("OFFER_DELIVERY_RELEASE_MISMATCH");
  const tenants: [DeliveryTenant, DeliveryTenant] = [
    {
      label: "tenant-a",
      organizationId: uuid(env.OFFER_DELIVERY_ADAPTER_TENANT_A_ID, "TENANT_A_ID")
    },
    {
      label: "tenant-b",
      organizationId: uuid(env.OFFER_DELIVERY_ADAPTER_TENANT_B_ID, "TENANT_B_ID")
    }
  ];
  if (tenants[0].organizationId === tenants[1].organizationId) {
    throw new Error("OFFER_DELIVERY_TENANTS_MUST_DIFFER");
  }
  const config: Omit<OfferDeliveryConfig, "trustedAuthorization"> = {
    port: integer(env.PORT ?? "8080", 1, 65_535, "PORT"),
    environment: env.RWOS_ENV,
    serviceToken: secret(env.OFFER_DELIVERY_ADAPTER_SERVICE_TOKEN),
    releaseSha,
    tenantLimitPerMinute: integer(
      env.OFFER_DELIVERY_ADAPTER_TENANT_LIMIT_PER_MINUTE ?? "30",
      1,
      100,
      "TENANT_LIMIT"
    ),
    serviceLimitPerMinute: integer(
      env.OFFER_DELIVERY_ADAPTER_SERVICE_LIMIT_PER_MINUTE ?? "60",
      1,
      200,
      "SERVICE_LIMIT"
    ),
    tenants
  };
  return {
    ...config,
    trustedAuthorization: readTrustedReceiverAuthorization({
      env,
      prefix: "OFFER_DELIVERY_ADAPTER",
      environment: config.environment,
      applicationCredential: config.serviceToken,
      releaseSha
    })
  };
}

function secret(value: string | undefined) {
  if (!value || value.length < 32 || value.length > 512) {
    throw new Error("OFFER_DELIVERY_SERVICE_TOKEN_REQUIRED");
  }
  return value;
}

function uuid(value: string | undefined, key: string) {
  const result = required(value, key);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) {
    throw new Error(`OFFER_DELIVERY_${key}_INVALID`);
  }
  return result;
}

function required(value: string | undefined, key: string) {
  if (!value) throw new Error(`OFFER_DELIVERY_${key}_REQUIRED`);
  return value;
}

function integer(value: string, minimum: number, maximum: number, key: string) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < minimum || result > maximum) {
    throw new Error(`OFFER_DELIVERY_${key}_INVALID`);
  }
  return result;
}
