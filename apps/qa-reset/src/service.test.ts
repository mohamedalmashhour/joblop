import { describe, expect, it, vi } from "vitest";
import { createResetControlStore } from "./control";
import { isSharedManifestRecord, ownedEntityTypes, type ManifestRecord } from "./manifest";
import { MemoryResetLock, MemoryResetRepository } from "./repository";
import { createQaResetService } from "./service";
import { browserCommand, nativeCommand, testConfig, testManifest } from "./testFixture";

describe("QA reset dry-run, prepare and cleanup", () => {
  it("produces a deterministic dry-run checksum and makes zero changes", () => {
    const context = fixture();
    const command = browserCommand("prepare");
    const first = context.service.dryRun(command);
    const second = context.service.dryRun(command);
    expect(first).toEqual(second);
    expect(first.currentCount).toBe(0);
    expect(first.expectedCount).toBe(testManifest.records.length);
    expect(first.intendedRecordIds).toHaveLength(testManifest.records.length);
    expect(context.repository.records()).toEqual([]);
  });

  it("prepares idempotently and cleans in reverse dependency order", () => {
    const context = fixture();
    const preparePlan = context.service.dryRun(browserCommand("prepare"));
    const prepared = context.service.prepare(
      browserCommand("prepare", { dryRunChecksum: preparePlan.planChecksum })
    );
    expect(prepared).toMatchObject({
      prepared: true,
      idempotent: false,
      count: testManifest.records.length
    });

    const idempotentPlan = context.service.dryRun(browserCommand("prepare"));
    expect(
      context.service.prepare(
        browserCommand("prepare", { dryRunChecksum: idempotentPlan.planChecksum })
      )
    ).toMatchObject({ prepared: true, idempotent: true, receipt: prepared.receipt });

    const cleanupPlan = context.service.dryRun(browserCommand("cleanup"));
    const cleaned = context.service.cleanup(
      browserCommand("cleanup", {
        dryRunChecksum: cleanupPlan.planChecksum,
        preparationReceipt: prepared.receipt
      })
    );
    expect(cleaned).toMatchObject({ cleaned: true, idempotent: false, count: 0 });
    expect(sortedRecords(context.repository.records())).toEqual(retainedAuditEvidence());
    const deletedEntityOrder = context.repository.mutationOrder
      .filter((entry) => entry.startsWith("delete:"))
      .map((entry) => entry.split(":")[1])
      .filter((value, index, all) => index === 0 || all[index - 1] !== value);
    expect(deletedEntityOrder).toEqual(
      [...ownedEntityTypes]
        .reverse()
        .filter(
          (entityType) => entityType !== "audit_event" && entityType !== "audit_actor_reference"
        )
    );

    const idempotentCleanupPlan = context.service.dryRun(browserCommand("cleanup"));
    expect(
      context.service.cleanup(
        browserCommand("cleanup", {
          dryRunChecksum: idempotentCleanupPlan.planChecksum,
          preparationReceipt: prepared.receipt
        })
      )
    ).toMatchObject({ cleaned: true, idempotent: true, receipt: cleaned.receipt });
  });

  it("normalizes native scope to exactly one approved tenant", () => {
    const context = fixture();
    const plan = context.service.dryRun(nativeCommand("prepare"));
    expect(plan.expectedCount).toBe(
      testManifest.records.filter((record) => record.tenantId === testConfig.tenantAId).length
    );
    context.service.prepare(nativeCommand("prepare", { dryRunChecksum: plan.planChecksum }));
    expect(
      context.repository.records().every((record) => record.tenantId === testConfig.tenantAId)
    ).toBe(true);
  });

  it("preserves shared catalogue fixtures during single-organization cleanup", () => {
    const context = fixture();
    const preparePlan = context.service.dryRun(nativeCommand("prepare"));
    const prepared = context.service.prepare(
      nativeCommand("prepare", { dryRunChecksum: preparePlan.planChecksum })
    );
    const cleanupPlan = context.service.dryRun(nativeCommand("cleanup"));
    context.service.cleanup(
      nativeCommand("cleanup", {
        dryRunChecksum: cleanupPlan.planChecksum,
        preparationReceipt: prepared.receipt
      })
    );
    expect(context.repository.records()).toEqual(
      testManifest.records.filter(
        (record) =>
          isSharedManifestRecord(record) ||
          (record.tenantId === testConfig.tenantAId &&
            ["audit_actor_reference", "audit_event"].includes(record.entityType))
      )
    );
    expect(context.service.ready()).toBe(true);
  });

  it("preserves unrelated records while rejecting foreign records in the owned namespace", () => {
    const unrelated = syntheticRecord("other:namespace", "unrelated-record");
    const preserved = fixture([unrelated]);
    const preparePlan = preserved.service.dryRun(browserCommand("prepare"));
    const prepared = preserved.service.prepare(
      browserCommand("prepare", { dryRunChecksum: preparePlan.planChecksum })
    );
    const cleanupPlan = preserved.service.dryRun(browserCommand("cleanup"));
    preserved.service.cleanup(
      browserCommand("cleanup", {
        dryRunChecksum: cleanupPlan.planChecksum,
        preparationReceipt: prepared.receipt
      })
    );
    expect(sortedRecords(preserved.repository.records())).toEqual(
      sortedRecords([unrelated, ...retainedAuditEvidence()])
    );

    const foreign = syntheticRecord(testConfig.namespace, "unmanifested-record");
    expect(() => fixture([foreign]).service.dryRun(browserCommand("prepare"))).toThrow(
      "RWOS_QA_RESET_CONFLICT"
    );
  });

  it("enforces the operation lock", () => {
    const context = fixture();
    const plan = context.service.dryRun(browserCommand("prepare"));
    const lockKey = `${testConfig.clusterId}:${testManifest.manifestId}`;
    context.lock.acquire(lockKey);
    expect(() =>
      context.service.prepare(browserCommand("prepare", { dryRunChecksum: plan.planChecksum }))
    ).toThrow("RWOS_QA_RESET_CONFLICT");
  });

  it("blocks automatic reruns after a partial or unknown outcome", () => {
    const context = fixture();
    const plan = context.service.dryRun(browserCommand("prepare"));
    context.repository.failAfterChanges = 1;
    expect(() =>
      context.service.prepare(browserCommand("prepare", { dryRunChecksum: plan.planChecksum }))
    ).toThrow("SYNTHETIC_PARTIAL_OUTCOME");
    expect(context.control.blocked).toBe(true);
    expect(() => context.service.dryRun(browserCommand("prepare"))).toThrow(
      "RWOS_QA_RESET_CONFLICT"
    );
  });

  it("enforces the bounded two-tenant entity blast radius", () => {
    expect(testManifest.tenantIds).toHaveLength(2);
    expect(new Set(testManifest.records.map((record) => record.entityType))).toEqual(
      new Set(ownedEntityTypes)
    );
    expect(testManifest.records.length).toBeLessThanOrEqual(ownedEntityTypes.length * 2 * 10);
    for (const maximum of Object.values(testManifest.maximumRecordCounts)) {
      expect(maximum).toBeLessThanOrEqual(20);
    }
  });

  it("fails readiness closed for unavailable, foreign or partial repository state", () => {
    const foreign = fixture([syntheticRecord(testConfig.namespace, "unmanifested-record")]);
    expect(foreign.service.ready()).toBe(false);

    const partial = fixture([testManifest.records[0]!]);
    expect(partial.service.ready()).toBe(false);

    const unavailable = fixture();
    unavailable.repository.inspect = () => {
      throw new Error("SYNTHETIC_REPOSITORY_UNAVAILABLE");
    };
    expect(unavailable.service.ready()).toBe(false);
  });

  it("constructs durable execution only from the normalized plan and authenticated caller", async () => {
    const repository = new MemoryResetRepository();
    const control = createResetControlStore();
    const execute = vi.fn().mockResolvedValue({
      status: "succeeded",
      receipt: "a".repeat(64),
      affectedCount: testManifest.records.length,
      idempotent: false
    });
    const service = createQaResetService({
      config: testConfig,
      manifest: testManifest,
      repository,
      lock: new MemoryResetLock(),
      control,
      durableRepository: { execute } as never,
      now: () => new Date("2026-07-28T12:00:00.000Z")
    });
    const plan = service.dryRun(browserCommand("prepare"));
    await expect(
      service.prepare(browserCommand("prepare", { dryRunChecksum: plan.planChecksum }), {
        callerAlias: "browser-e2e",
        callerPrincipalDigest: "b".repeat(64),
        correlationId: "request-123"
      })
    ).resolves.toMatchObject({
      prepared: true,
      receipt: "a".repeat(64),
      count: testManifest.records.length
    });
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "prepare",
        scope: "browser",
        manifest: testManifest,
        tenantIds: testManifest.tenantIds,
        callerAlias: "browser-e2e",
        callerPrincipalDigest: "b".repeat(64),
        correlationId: "request-123",
        planChecksum: plan.planChecksum,
        approvalReference: testManifest.approvalReferences.prepare
      })
    );
    const request = execute.mock.calls[0]![0];
    expect(request.idempotencyDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(request.mutationPlanChecksum).toMatch(/^[a-f0-9]{64}$/);
    expect(repository.records()).toEqual([]);
  });

  it("fails durable execution closed for an invalid caller context", async () => {
    const context = fixture();
    const execute = vi.fn();
    const service = createQaResetService({
      config: testConfig,
      manifest: testManifest,
      repository: context.repository,
      lock: context.lock,
      control: context.control,
      durableRepository: { execute } as never,
      now: () => new Date("2026-07-28T12:00:00.000Z")
    });
    const plan = service.dryRun(browserCommand("prepare"));
    await expect(
      service.prepare(browserCommand("prepare", { dryRunChecksum: plan.planChecksum }), {
        callerAlias: "monitoring",
        callerPrincipalDigest: "not-a-digest",
        correlationId: "request-123"
      })
    ).rejects.toThrow("RWOS_QA_RESET_CONFLICT");
    expect(execute).not.toHaveBeenCalled();
  });

  it("uses durable PostgreSQL inspection for durable readiness and dry-run", async () => {
    const context = fixture();
    context.repository.inspect = () => {
      throw new Error("LEGACY_INSPECTION_MUST_NOT_RUN");
    };
    const inspect = vi.fn().mockResolvedValue({
      manifestOwnedIds: [],
      foreignIdsInNamespace: [],
      unrelatedIds: []
    });
    const service = createQaResetService({
      config: testConfig,
      manifest: testManifest,
      repository: context.repository,
      lock: context.lock,
      control: context.control,
      durableRepository: { inspect } as never,
      now: () => new Date("2026-07-28T12:00:00.000Z")
    });
    await expect(service.readyDurable()).resolves.toBe(true);
    await expect(
      service.dryRun(browserCommand("prepare"), {
        callerAlias: "browser-e2e",
        callerPrincipalDigest: "b".repeat(64),
        correlationId: "request-123"
      })
    ).resolves.toMatchObject({ currentCount: 0, expectedCount: testManifest.records.length });
    expect(inspect).toHaveBeenCalledTimes(2);
  });

  it("fails durable readiness closed for foreign or unavailable inspection state", async () => {
    const context = fixture();
    const inspect = vi
      .fn()
      .mockResolvedValueOnce({
        manifestOwnedIds: [],
        foreignIdsInNamespace: ["foreign-id"],
        unrelatedIds: []
      })
      .mockRejectedValueOnce(new Error("POSTGRES_UNAVAILABLE"));
    const service = createQaResetService({
      config: testConfig,
      manifest: testManifest,
      repository: context.repository,
      lock: context.lock,
      control: context.control,
      durableRepository: { inspect } as never,
      now: () => new Date("2026-07-28T12:00:00.000Z")
    });
    await expect(service.readyDurable()).resolves.toBe(false);
    await expect(service.readyDurable()).resolves.toBe(false);
  });
});

function retainedAuditEvidence() {
  return sortedRecords(
    testManifest.records.filter(({ entityType }) =>
      ["audit_actor_reference", "audit_event"].includes(entityType)
    )
  );
}

function sortedRecords(records: readonly ManifestRecord[]) {
  return [...records].sort((left, right) => left.recordId.localeCompare(right.recordId));
}

function fixture(seed: readonly ManifestRecord[] = []) {
  const repository = new MemoryResetRepository(seed);
  const lock = new MemoryResetLock();
  const control = createResetControlStore();
  return {
    repository,
    lock,
    control,
    service: createQaResetService({
      config: testConfig,
      manifest: testManifest,
      repository,
      lock,
      control,
      now: () => new Date("2026-07-28T12:00:00.000Z")
    })
  };
}

function syntheticRecord(namespace: string, recordId: string): ManifestRecord {
  return {
    synthetic: true,
    namespace,
    tenantId: testConfig.tenantAId,
    entityType: "synthetic_user",
    manifestRecordKey: "syn:tenant-a:synthetic_user:99",
    recordId,
    ownership: "manifest_owned",
    payload: {
      kind: "user",
      publicId: "unmanifested-user",
      emailNormalized: "unmanifested@rwos-staging.invalid",
      displayName: "Unmanifested synthetic user",
      status: "active"
    }
  };
}
