import type { DeliveryTenant, OfferDeliveryConfig } from "./config";

export type DeliveryScenario =
  | "immediate_success"
  | "temporary_failure_then_success"
  | "permanent_failure"
  | "duplicate_success"
  | "expired"
  | "revoked_recipient"
  | "inactive_organization";

export type SyntheticDeliveryRecord = Readonly<{
  synthetic: true;
  tenant: DeliveryTenant["label"];
  organizationId: string;
  workerOfferId: string;
  workerIdentityId: string;
  scenario: DeliveryScenario;
  expiresAt: string;
  recipientActive: boolean;
  organizationActive: boolean;
}>;

export type DeliveryManifest = Readonly<{
  synthetic: true;
  version: 1;
  releaseSha: string;
  records: ReadonlyMap<string, SyntheticDeliveryRecord>;
}>;

const scenarios: readonly DeliveryScenario[] = [
  "immediate_success",
  "temporary_failure_then_success",
  "permanent_failure",
  "duplicate_success",
  "expired",
  "revoked_recipient",
  "inactive_organization"
];

export function createDeliveryManifest(config: OfferDeliveryConfig): DeliveryManifest {
  const records = config.tenants.flatMap((tenant, tenantIndex) =>
    scenarios.map((scenario, index) => createRecord(tenant, tenantIndex, index + 1, scenario))
  );
  return {
    synthetic: true,
    version: 1,
    releaseSha: config.releaseSha,
    records: new Map(records.map((record) => [record.workerOfferId, record]))
  };
}

function createRecord(
  tenant: DeliveryTenant,
  tenantIndex: number,
  sequence: number,
  scenario: DeliveryScenario
): SyntheticDeliveryRecord {
  const prefix = tenantIndex === 0 ? "a" : "b";
  const suffix = `${tenantIndex + 1}${String(sequence).padStart(11, "0")}`;
  return Object.freeze({
    synthetic: true as const,
    tenant: tenant.label,
    organizationId: tenant.organizationId,
    workerOfferId: `${prefix}1000000-0000-4000-8000-${suffix}`,
    workerIdentityId: `${prefix}2000000-0000-4000-8000-${suffix}`,
    scenario,
    expiresAt: scenario === "expired" ? "2026-01-01T00:00:00.000Z" : "2099-01-01T00:00:00.000Z",
    recipientActive: scenario !== "revoked_recipient",
    organizationActive: scenario !== "inactive_organization"
  });
}

export function manifestReady(manifest: DeliveryManifest, config: OfferDeliveryConfig) {
  if (
    !manifest.synthetic ||
    manifest.version !== 1 ||
    manifest.releaseSha !== config.releaseSha ||
    manifest.records.size !== 14
  ) {
    return false;
  }
  return [...manifest.records.values()].every(
    (record) =>
      record.synthetic &&
      config.tenants.some(
        (tenant) =>
          tenant.organizationId === record.organizationId && tenant.label === record.tenant
      )
  );
}
