import type { CandidateSourceConfig, TenantConfig } from "./config";

export type SyntheticCandidate = Readonly<{
  synthetic: true;
  tenant: TenantConfig["label"];
  organizationId: string;
  workerIdentityId: string;
  candidateSourceReference: string;
  approvedDisplayName: string;
  fictionalJobRole: string;
  fictionalCertifications: readonly string[];
  fictionalAvailability: "synthetic_available";
  matchingAttributes: Readonly<{
    workGroupId: string;
    roleDefinitionId: string;
  }>;
}>;

export type SyntheticManifest = Readonly<{
  synthetic: true;
  version: 1;
  releaseSha: string;
  tenants: ReadonlyMap<string, readonly SyntheticCandidate[]>;
}>;

export function createSyntheticManifest(config: CandidateSourceConfig): SyntheticManifest {
  return {
    synthetic: true,
    version: 1,
    releaseSha: config.releaseSha,
    tenants: new Map(
      config.tenants.map((tenant, tenantIndex) => [
        tenant.organizationId,
        Object.freeze(
          Array.from({ length: 100 }, (_, index) => createCandidate(tenant, tenantIndex, index + 1))
        )
      ])
    )
  };
}

function createCandidate(tenant: TenantConfig, tenantIndex: number, sequence: number) {
  const suffix = String(sequence).padStart(3, "0");
  const workerSuffix = `${tenantIndex + 1}${String(sequence).padStart(11, "0")}`;
  return Object.freeze({
    synthetic: true as const,
    tenant: tenant.label,
    organizationId: tenant.organizationId,
    workerIdentityId: `${tenantIndex + 1}0000000-0000-4000-8000-${workerSuffix}`,
    candidateSourceReference: `syn-${tenant.label}-candidate-${suffix}`,
    approvedDisplayName: `Synthetic Candidate ${tenant.label === "tenant-a" ? "A" : "B"}-${suffix}`,
    fictionalJobRole: sequence % 2 === 0 ? "Fictional Service Steward" : "Fictional Support Guide",
    fictionalCertifications:
      sequence % 3 === 0
        ? ["FICTIONAL-SAFETY-FOUNDATION", "FICTIONAL-SERVICE-FOUNDATION"]
        : ["FICTIONAL-SERVICE-FOUNDATION"],
    fictionalAvailability: "synthetic_available" as const,
    matchingAttributes: Object.freeze({
      workGroupId: tenant.workGroupId,
      roleDefinitionId: tenant.roleDefinitionId
    })
  });
}

export function manifestIsReady(manifest: SyntheticManifest, config: CandidateSourceConfig) {
  if (
    !manifest.synthetic ||
    manifest.releaseSha !== config.releaseSha ||
    manifest.tenants.size !== 2
  ) {
    return false;
  }
  return config.tenants.every((tenant) => {
    const candidates = manifest.tenants.get(tenant.organizationId);
    return (
      candidates?.length === 100 &&
      candidates.every(
        (candidate) =>
          candidate.synthetic &&
          candidate.organizationId === tenant.organizationId &&
          candidate.tenant === tenant.label
      )
    );
  });
}
