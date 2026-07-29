import type { OfferDeliveryConfig } from "./config";
import { createDeliveryManifest, type DeliveryScenario } from "./manifest";

export const tenantA = {
  label: "tenant-a" as const,
  organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
};
export const tenantB = {
  label: "tenant-b" as const,
  organizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
};
export const serviceToken = "synthetic-delivery-token-at-least-32-characters";
export const termsId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

export const testConfig: OfferDeliveryConfig = {
  port: 8080,
  environment: "test",
  serviceToken,
  releaseSha: "a31fa96f52247bb684032c6a8d3d379c098c2603",
  tenantLimitPerMinute: 30,
  serviceLimitPerMinute: 60,
  tenants: [tenantA, tenantB]
};

export const testManifest = createDeliveryManifest(testConfig);

export function scenarioRecord(scenario: DeliveryScenario, tenant = tenantA) {
  const record = [...testManifest.records.values()].find(
    (item) => item.scenario === scenario && item.organizationId === tenant.organizationId
  );
  if (!record) throw new Error("TEST_SCENARIO_MISSING");
  return record;
}

export function deliveryRequest(record = scenarioRecord("immediate_success")) {
  return {
    organizationId: record.organizationId,
    workerOfferId: record.workerOfferId,
    workerIdentityId: record.workerIdentityId
  };
}

export function idempotencyKey(record = scenarioRecord("immediate_success")) {
  return `worker-offer:${record.workerOfferId}:terms:${termsId}`;
}
