import { describe, expect, it } from "vitest";
import { approvedReleaseSha, readOfferDeliveryConfig } from "./config";
import { serviceToken, tenantA, tenantB } from "./testFixture";

describe("offer delivery configuration", () => {
  it("accepts staging with approved limits", () => {
    const config = readOfferDeliveryConfig(environment());
    expect(config.tenantLimitPerMinute).toBe(30);
    expect(config.serviceLimitPerMinute).toBe(60);
  });

  it.each(["production", "local", undefined])("rejects environment %s", (RWOS_ENV) => {
    expect(() => readOfferDeliveryConfig(environment({ RWOS_ENV }))).toThrow(
      "OFFER_DELIVERY_STAGING_ONLY"
    );
  });

  it("rejects release drift, duplicate tenants, and excessive limits", () => {
    expect(() =>
      readOfferDeliveryConfig(environment({ OFFER_DELIVERY_ADAPTER_RELEASE_SHA: "0".repeat(40) }))
    ).toThrow("OFFER_DELIVERY_RELEASE_MISMATCH");
    expect(() =>
      readOfferDeliveryConfig(
        environment({ OFFER_DELIVERY_ADAPTER_TENANT_B_ID: tenantA.organizationId })
      )
    ).toThrow("OFFER_DELIVERY_TENANTS_MUST_DIFFER");
    expect(() =>
      readOfferDeliveryConfig(
        environment({ OFFER_DELIVERY_ADAPTER_SERVICE_LIMIT_PER_MINUTE: "201" })
      )
    ).toThrow("OFFER_DELIVERY_SERVICE_LIMIT_INVALID");
  });
});

function environment(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    RWOS_ENV: "staging",
    OFFER_DELIVERY_ADAPTER_AUTH_MODE: "dual-required",
    OFFER_DELIVERY_ADAPTER_AUDIENCE: "https://rwos-delivery-opaque-nn.a.run.app",
    OFFER_DELIVERY_ADAPTER_API_SERVICE_ACCOUNT: "rwos-api@staging.invalid",
    PORT: "8080",
    OFFER_DELIVERY_ADAPTER_RELEASE_SHA: approvedReleaseSha,
    OFFER_DELIVERY_ADAPTER_SERVICE_TOKEN: serviceToken,
    OFFER_DELIVERY_ADAPTER_TENANT_A_ID: tenantA.organizationId,
    OFFER_DELIVERY_ADAPTER_TENANT_B_ID: tenantB.organizationId,
    ...overrides
  };
}
