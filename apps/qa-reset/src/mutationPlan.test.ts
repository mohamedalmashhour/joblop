import { describe, expect, it } from "vitest";
import { ownedEntityTypes, type ResetManifest } from "./manifest";
import {
  createExactMutationPlan,
  createScopedExactMutationPlan,
  exactMutationPlanChecksum
} from "./mutationPlan";
import { testManifest } from "./testFixture";

describe("QA-reset exact mutation plan", () => {
  it("maps every supported entity to one fixed repository table", () => {
    const prepare = createExactMutationPlan(testManifest, "prepare");
    expect(prepare).toHaveLength(testManifest.records.length);
    expect(new Set(prepare.map((step) => step.entityType))).toEqual(new Set(ownedEntityTypes));
    expect(prepare.every((step, index) => step.sequence === index + 1)).toBe(true);
    expect(prepare.every((step) => /^[a-z_]+$/u.test(step.table))).toBe(true);
  });

  it("binds operation, organization scope and exact compiled steps into a checksum", () => {
    const organizationA = exactMutationPlanChecksum(testManifest, "prepare", [
      testManifest.tenantIds[0]!
    ]);
    expect(organizationA).toMatch(/^[a-f0-9]{64}$/u);
    expect(
      exactMutationPlanChecksum(testManifest, "cleanup", [testManifest.tenantIds[0]!])
    ).not.toBe(organizationA);
    expect(
      exactMutationPlanChecksum(testManifest, "prepare", [testManifest.tenantIds[1]!])
    ).not.toBe(organizationA);
  });

  it("keeps shared catalogue lifecycle outside partial cleanup scope", () => {
    const sharedIds = new Set(
      testManifest.records
        .filter((record) => record.manifestRecordKey.startsWith("syn:shared:"))
        .map((record) => record.recordId)
    );
    const partialCleanup = createScopedExactMutationPlan(testManifest, "cleanup", [
      testManifest.tenantIds[0]!
    ]);
    expect(partialCleanup.some((step) => sharedIds.has(step.recordId))).toBe(false);
    expect(
      createScopedExactMutationPlan(testManifest, "cleanup", testManifest.tenantIds).every(
        (step) => !sharedIds.has(step.recordId)
      )
    ).toBe(false);
    const partialChecksum = exactMutationPlanChecksum(testManifest, "cleanup", [
      testManifest.tenantIds[0]!
    ]);
    const fullChecksum = exactMutationPlanChecksum(testManifest, "cleanup", testManifest.tenantIds);
    expect(partialChecksum).not.toBe(fullChecksum);
    expect(sharedIds.size).toBe(3);
  });

  it("uses exact dependency order for preparation and exact reverse order for cleanup", () => {
    const prepare = createExactMutationPlan(testManifest, "prepare");
    const cleanup = createExactMutationPlan(testManifest, "cleanup");
    expect(distinctOrder(prepare)).toEqual(testManifest.preparationOrder);
    expect(distinctOrder(cleanup)).toEqual(testManifest.cleanupOrder);
    expect(distinctOrder(cleanup)).toEqual([...ownedEntityTypes].reverse());
  });

  it("verifies and preserves the approved access-role reference", () => {
    const prepareReference = createExactMutationPlan(testManifest, "prepare").find(
      (step) => step.entityType === "access_role_definition"
    );
    const cleanupReference = createExactMutationPlan(testManifest, "cleanup").find(
      (step) => step.entityType === "access_role_definition"
    );
    expect(prepareReference?.action).toBe("verify_reference");
    expect(cleanupReference?.action).toBe("preserve_reference");
  });

  it("retains append-only audit evidence and its actor reference during cleanup", () => {
    const cleanup = createExactMutationPlan(testManifest, "cleanup");
    expect(
      cleanup
        .filter(({ entityType }) => ["audit_actor_reference", "audit_event"].includes(entityType))
        .every(({ action }) => action === "retain_evidence")
    ).toBe(true);
  });

  it("makes the schema-required two-phase current-offer-terms binding explicit", () => {
    const termsStep = createExactMutationPlan(testManifest, "prepare").find(
      (step) => step.entityType === "worker_offer_terms"
    );
    expect(termsStep?.action).toBe("insert_exact_and_bind_offer");
    expect(testManifest.preparationOrder.indexOf("worker_offer")).toBeLessThan(
      testManifest.preparationOrder.indexOf("worker_offer_terms")
    );
  });

  it("fails closed when ownership is incompatible with the fixed entity policy", () => {
    const record = testManifest.records.find((candidate) => candidate.entityType === "assignment")!;
    const tampered = {
      ...testManifest,
      records: testManifest.records.map((candidate) =>
        candidate === record
          ? { ...candidate, ownership: "approved_reference" as const }
          : candidate
      )
    } as ResetManifest;
    expect(() => createExactMutationPlan(tampered, "prepare")).toThrow("RWOS_QA_RESET_PLAN_DENIED");
  });

  it("rejects missing, wrong-type and late relational dependencies", () => {
    const assignment = testManifest.records.find(
      (candidate) =>
        candidate.tenantId === testManifest.tenantIds[0] && candidate.entityType === "assignment"
    )!;
    const residence = testManifest.records.find(
      (candidate) =>
        candidate.tenantId === testManifest.tenantIds[0] && candidate.entityType === "residence"
    )!;
    for (const jobRequestId of ["00000000-0000-4000-8000-999999999999", residence.recordId]) {
      const tampered = {
        ...testManifest,
        records: testManifest.records.map((candidate) =>
          candidate === assignment
            ? {
                ...candidate,
                payload: { ...candidate.payload, jobRequestId }
              }
            : candidate
        )
      } as ResetManifest;
      expect(() => createExactMutationPlan(tampered, "prepare")).toThrow(
        "RWOS_QA_RESET_PLAN_DENIED"
      );
    }

    const lateJobRequest = {
      ...testManifest,
      preparationOrder: [
        ...testManifest.preparationOrder.filter((entityType) => entityType !== "job_request"),
        "job_request"
      ]
    } as ResetManifest;
    expect(() => createExactMutationPlan(lateJobRequest, "prepare")).toThrow(
      "RWOS_QA_RESET_PLAN_DENIED"
    );
  });
});

function distinctOrder(steps: ReturnType<typeof createExactMutationPlan>): readonly string[] {
  return [...new Set(steps.map((step) => step.entityType))];
}
