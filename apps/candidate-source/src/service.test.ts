import { describe, expect, it } from "vitest";
import { createSyntheticManifest } from "./manifest";
import { createCandidateSourceService } from "./service";
import { evaluateRequest, searchRequest, tenantA, tenantB, testConfig } from "./testFixture";

describe("synthetic candidate source service", () => {
  const manifest = createSyntheticManifest(testConfig);
  const service = createCandidateSourceService(
    testConfig,
    manifest,
    () => new Date("2026-07-28T12:02:00.000Z")
  );

  it("provides deterministic, bounded, synthetic-only tenant datasets", () => {
    const first = service.search(searchRequest(), tenantA.organizationId);
    const replica = createCandidateSourceService(
      testConfig,
      createSyntheticManifest(testConfig),
      () => new Date("2026-07-28T12:02:00.000Z")
    );
    const second = replica.search(searchRequest(), tenantA.organizationId);
    expect(first).toEqual(second);
    expect(first.candidates).toHaveLength(100);
    expect(first.candidates[0]?.candidateSourceReference).toBe("syn-tenant-a-candidate-001");
    expect(first.candidates[99]?.candidateSourceReference).toBe("syn-tenant-a-candidate-100");
    expect(JSON.stringify([...manifest.tenants.values()].flat())).not.toMatch(
      /email|telephone|street|government/i
    );
  });

  it("keeps Tenant A and Tenant B records strictly separated", () => {
    const a = service.search(searchRequest(tenantA), tenantA.organizationId);
    const b = service.search(searchRequest(tenantB), tenantB.organizationId);
    expect(a.candidates.every((item) => item.organizationId === tenantA.organizationId)).toBe(true);
    expect(b.candidates.every((item) => item.organizationId === tenantB.organizationId)).toBe(true);
    expect(a.candidates.map((item) => item.candidateSourceReference)).not.toEqual(
      b.candidates.map((item) => item.candidateSourceReference)
    );
  });

  it("denies conflicting and unknown tenant context", () => {
    expect(() => service.search(searchRequest(tenantA), tenantB.organizationId)).toThrow(
      "RWOS_CANDIDATE_ACCESS_DENIED"
    );
    expect(() =>
      service.search(
        { ...searchRequest(), organizationId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" },
        "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
      )
    ).toThrow("RWOS_CANDIDATE_ACCESS_DENIED");
  });

  it("filters deterministically by approved matching identifiers", () => {
    const result = service.search(
      { ...searchRequest(), roleDefinitionId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" },
      tenantA.organizationId
    );
    expect(result.candidates).toEqual([]);
  });

  it("evaluates only a tenant-owned opaque reference", () => {
    expect(
      service.evaluate(evaluateRequest(), tenantA.organizationId).candidate.candidateSourceReference
    ).toBe("syn-tenant-a-candidate-001");
    expect(() =>
      service.evaluate(
        evaluateRequest(tenantA, "syn-tenant-b-candidate-001"),
        tenantA.organizationId
      )
    ).toThrow("RWOS_CANDIDATE_UNAVAILABLE");
  });

  it("fails closed if a tenant manifest bucket contains a cross-tenant candidate", () => {
    const tenantACandidates = manifest.tenants.get(tenantA.organizationId)!;
    const tenantBCandidate = manifest.tenants.get(tenantB.organizationId)![0]!;
    const poisonedManifest = {
      ...manifest,
      tenants: new Map(manifest.tenants).set(tenantA.organizationId, [
        tenantBCandidate,
        ...tenantACandidates.slice(1)
      ])
    };
    const poisonedService = createCandidateSourceService(testConfig, poisonedManifest);

    expect(() =>
      poisonedService.search(searchRequest(tenantA), tenantA.organizationId)
    ).toThrow("RWOS_CANDIDATE_UNAVAILABLE");
  });

  it("fails closed if candidate matching ownership drifts from tenant configuration", () => {
    const candidates = manifest.tenants.get(tenantA.organizationId)!;
    const poisonedCandidate = {
      ...candidates[0]!,
      matchingAttributes: {
        ...candidates[0]!.matchingAttributes,
        roleDefinitionId: tenantB.roleDefinitionId
      }
    };
    const poisonedManifest = {
      ...manifest,
      tenants: new Map(manifest.tenants).set(tenantA.organizationId, [
        poisonedCandidate,
        ...candidates.slice(1)
      ])
    };
    const poisonedService = createCandidateSourceService(testConfig, poisonedManifest);

    expect(() =>
      poisonedService.evaluate(evaluateRequest(tenantA), tenantA.organizationId)
    ).toThrow("RWOS_CANDIDATE_UNAVAILABLE");
  });

  it.each([
    ["unknown field", { ...searchRequest(), extra: true }],
    ["invalid UUID", { ...searchRequest(), dispatchReviewId: "invalid" }],
    ["invalid range", { ...searchRequest(), endAt: "2026-07-28T12:00:00.000Z" }],
    ["unknown timezone", { ...searchRequest(), timezone: "Europe/London" }]
  ])("rejects malformed request: %s", (_label, request) => {
    expect(() => service.search(request, tenantA.organizationId)).toThrow(
      "RWOS_CANDIDATE_REQUEST_INVALID"
    );
  });
});
