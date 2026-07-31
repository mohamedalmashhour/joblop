import { describe, expect, it } from "vitest";
import {
  checksumValue,
  ownedEntityTypes,
  type ManifestRecord,
  type ResetManifest
} from "./manifest";
import {
  createExactRecordMutator,
  deriveQaResetIdempotencyDigest,
  PostgresQaResetRepository,
  QaResetPersistenceConflictError,
  QaResetUnknownOutcomeError,
  UnknownTransactionOutcomeError,
  type DurableResetRequest,
  type SqlConnection,
  type SqlResult,
  type SqlTransactionExecutor
} from "./postgresRepository";
import { exactMutationPlanChecksum } from "./mutationPlan";
import { testManifest } from "./testFixture";

const now = new Date("2026-07-28T20:00:00.000Z");

describe("PostgreSQL QA-reset repository contract", () => {
  it("inspects prepared ownership through bounded control-table reads", async () => {
    const manifest = uuidManifest();
    const calls: string[] = [];
    const executor = {
      async query(sql: string, parameters: readonly unknown[] = []) {
        calls.push(sql);
        if (sql.includes("manifest-inspect")) {
          return {
            rows: [
              {
                id: "current",
                manifest_reference: manifest.manifestId,
                manifest_checksum: manifest.checksum,
                ...ownershipEnvelope(manifest)
              },
              {
                id: "foreign",
                manifest_reference: "another-manifest",
                manifest_checksum: "f".repeat(64),
                ...ownershipEnvelope(manifest)
              }
            ],
            rowCount: 2
          };
        }
        if (sql.includes("qa-reset:tenants")) {
          return {
            rows: manifest.tenantIds.map((tenant_id) => ({ tenant_id })),
            rowCount: manifest.tenantIds.length
          };
        }
        return parameters[0] === "current"
          ? {
              rows: [
                {
                  target_record_id: manifest.records[0]!.recordId,
                  lifecycle_status: "prepared"
                },
                {
                  target_record_id: manifest.records[1]!.recordId,
                  lifecycle_status: "declared"
                }
              ],
              rowCount: 2
            }
          : {
              rows: [{ target_record_id: "foreign-record", lifecycle_status: "prepared" }],
              rowCount: 1
            };
      },
      async transaction<T>(): Promise<T> {
        throw new Error("TRANSACTION_NOT_EXPECTED");
      }
    } as unknown as SqlTransactionExecutor;
    const repository = new PostgresQaResetRepository(
      executor,
      createExactRecordMutator(new FakeMutator(1), ownedEntityTypes),
      () => now
    );
    await expect(repository.inspect(manifest)).resolves.toEqual({
      manifestOwnedIds: [manifest.records[0]!.recordId],
      foreignIdsInNamespace: ["foreign-record"],
      unrelatedIds: []
    });
    expect(calls).toHaveLength(4);
    expect(calls.every((sql) => sql.includes("qa-reset:"))).toBe(true);
  });

  it("fails inspection closed for a revoked, expired or wrong-target ownership envelope", async () => {
    const manifest = uuidManifest();
    for (const override of [
      { status: "revoked" },
      { expires_at: "2026-07-28T19:59:59.000Z" },
      { database_id: "wrong-database" }
    ]) {
      const executor = {
        query: async () => ({
          rows: [
            {
              id: "current",
              manifest_reference: manifest.manifestId,
              manifest_checksum: manifest.checksum,
              ...ownershipEnvelope(manifest),
              ...override
            }
          ],
          rowCount: 1
        }),
        transaction: async <T>(): Promise<T> => {
          throw new Error("TRANSACTION_NOT_EXPECTED");
        }
      } as unknown as SqlTransactionExecutor;
      const repository = new PostgresQaResetRepository(
        executor,
        createExactRecordMutator(new FakeMutator(1), ownedEntityTypes),
        () => now
      );
      await expect(repository.inspect(manifest)).rejects.toBeInstanceOf(
        QaResetPersistenceConflictError
      );
    }
  });

  it("fails inspection closed for missing ownership or unknown lifecycle state", async () => {
    const fixture = setup();
    const missing = new PostgresQaResetRepository(
      {
        query: async () => ({ rows: [], rowCount: 0 }),
        transaction: (work) => work({ query: async () => ({ rows: [], rowCount: 0 }) })
      },
      createExactRecordMutator(new FakeMutator(1), ownedEntityTypes),
      () => now
    );
    await expect(missing.inspect(fixture.manifest)).rejects.toBeInstanceOf(
      QaResetPersistenceConflictError
    );
  });

  it("uses a transaction-scoped advisory lock and exact ownership predicates", async () => {
    const fixture = setup();
    const result = await fixture.repository.execute(fixture.request);

    expect(result).toMatchObject({ status: "succeeded", affectedCount: 1, idempotent: false });
    expect(fixture.database.calls.at(0)?.sql).toContain("pg_advisory_xact_lock");
    expect(
      fixture.database.calls.find((call) => call.sql.includes("qa-reset:owned-record"))?.params
    ).toEqual(
      expect.arrayContaining([
        fixture.manifest.tenantIds[0],
        fixture.manifest.namespace,
        "synthetic_user",
        fixture.manifest.records[0]!.recordId
      ])
    );
    const eventParameters = fixture.database.calls.find((call) =>
      call.sql.includes("qa-reset:event")
    )?.params;
    expect(eventParameters?.[2]).toBe("succeeded");
    expect(eventParameters?.[3]).toBe("succeeded");
    expect(eventParameters).toHaveLength(8);
    expect(
      fixture.database.calls
        .find((call) => call.sql.includes("qa-reset:create-control"))
        ?.params.at(-1)
    ).toEqual(now);
    expect(
      fixture.database.calls
        .find((call) => call.sql.includes("qa-reset:owned-record */"))
        ?.params.at(-1)
    ).toEqual(now);
  });

  it("executes the compiled dependency order for prepare and reverse cleanup", async () => {
    for (const operation of ["prepare", "cleanup"] as const) {
      const database = new FakeDatabase(testManifest);
      const fakeMutator = new FakeMutator(1);
      const repository = new PostgresQaResetRepository(
        database,
        createExactRecordMutator(fakeMutator, ownedEntityTypes),
        () => now
      );
      await repository.execute(durableRequest(testManifest, operation));
      const mutatedIds = operation === "prepare" ? fakeMutator.prepared : fakeMutator.cleaned;
      const recordsById = new Map(testManifest.records.map((record) => [record.recordId, record]));
      const actualEntityOrder = mutatedIds
        .map((id) => recordsById.get(id)!.entityType)
        .filter((entityType, index, all) => index === 0 || all[index - 1] !== entityType);
      expect(actualEntityOrder).toEqual(
        operation === "prepare" ? testManifest.preparationOrder : testManifest.cleanupOrder
      );
    }
  });

  it("returns one durable terminal receipt for concurrent same-digest requests", async () => {
    const fixture = setup();
    const [first, second] = await Promise.all([
      fixture.repository.execute(fixture.request),
      fixture.repository.execute(fixture.request)
    ]);

    expect(first.receipt).toBe(second.receipt);
    expect([first.idempotent, second.idempotent].sort()).toEqual([false, true]);
    expect(fixture.mutator.prepared).toHaveLength(1);
  });

  it("denies replay across operation scope, caller, approval, tenant or release", async () => {
    const fixture = setup();
    await fixture.repository.execute(fixture.request);
    for (const replay of [
      { ...fixture.request, scope: "browser" as const },
      { ...fixture.request, callerAlias: "browser-e2e" },
      { ...fixture.request, approvalReference: "approval/other" },
      { ...fixture.request, mutationPlanChecksum: "d".repeat(64) },
      { ...fixture.request, tenantIds: [fixture.manifest.tenantIds[1]!] },
      {
        ...fixture.request,
        manifest: { ...fixture.manifest, releaseSha: "0".repeat(40) }
      }
    ]) {
      await expect(fixture.repository.execute(replay)).rejects.toBeInstanceOf(
        QaResetPersistenceConflictError
      );
    }
  });

  it("rolls back control and mutation state on an affected-row mismatch", async () => {
    const fixture = setup({ mutationCount: 0 });
    await expect(fixture.repository.execute(fixture.request)).rejects.toBeInstanceOf(
      QaResetPersistenceConflictError
    );
    expect(fixture.database.control).toBeNull();
    expect(fixture.database.events).toHaveLength(0);
  });

  it("fails closed for cross-tenant, namespace, release and ownership mismatches", async () => {
    const fixture = setup();
    const foreignTenant = {
      ...fixture.request,
      tenantIds: ["00000000-0000-4000-8000-999999999999"]
    };
    await expect(fixture.repository.execute(foreignTenant)).rejects.toBeInstanceOf(
      QaResetPersistenceConflictError
    );

    fixture.database.manifest.release_sha = "0".repeat(40);
    await expect(fixture.repository.execute(fixture.request)).rejects.toBeInstanceOf(
      QaResetPersistenceConflictError
    );

    fixture.database.manifest.release_sha = fixture.manifest.releaseSha;
    fixture.database.manifest.namespace = "rwos:qa-reset:staging:foreign";
    await expect(fixture.repository.execute(fixture.request)).rejects.toBeInstanceOf(
      QaResetPersistenceConflictError
    );
  });

  it("denies all entity paths when the exact manifest ownership record is absent", async () => {
    for (const operation of ["prepare", "cleanup"] as const) {
      for (const entityType of ownedEntityTypes) {
        const database = new FakeDatabase(testManifest);
        database.deniedEntityType = entityType;
        const mutator = new FakeMutator(1);
        const repository = new PostgresQaResetRepository(
          database,
          createExactRecordMutator(mutator, ownedEntityTypes),
          () => now
        );
        await expect(
          repository.execute(durableRequest(testManifest, operation))
        ).rejects.toBeInstanceOf(QaResetPersistenceConflictError);
        const deniedIds = testManifest.records
          .filter((record) => record.entityType === entityType)
          .map((record) => record.recordId);
        const mutatedIds = operation === "prepare" ? mutator.prepared : mutator.cleaned;
        expect(mutatedIds).not.toEqual(expect.arrayContaining(deniedIds));
      }
    }
    expect(new Set(testManifest.records.map(({ entityType }) => entityType))).toEqual(
      new Set(ownedEntityTypes)
    );
  });

  it("reconciles a successful unknown commit and never repeats the mutation", async () => {
    const fixture = setup({ unknownCommit: "after-commit" });
    const result = await fixture.repository.execute(fixture.request);

    expect(result).toMatchObject({ status: "succeeded", idempotent: true });
    expect(fixture.mutator.prepared).toHaveLength(1);
  });

  it("fails closed when an unknown commit has no durable terminal record", async () => {
    const fixture = setup({ unknownCommit: "before-commit" });
    await expect(fixture.repository.execute(fixture.request)).rejects.toBeInstanceOf(
      QaResetUnknownOutcomeError
    );
    expect(fixture.database.control).toBeNull();
  });

  it("fails closed on database outage without a memory fallback", async () => {
    const fixture = setup();
    fixture.database.available = false;
    await expect(fixture.repository.execute(fixture.request)).rejects.toThrow("SQL_UNAVAILABLE");
    expect(fixture.mutator.prepared).toHaveLength(0);
  });

  it("executes cleanup in exact scope and persists cleanup_completed", async () => {
    const fixture = setup({ operation: "cleanup" });
    const result = await fixture.repository.execute(fixture.request);
    expect(result.status).toBe("cleanup_completed");
    expect(fixture.mutator.cleaned).toEqual([fixture.manifest.records[0]!.recordId]);
  });
});

function setup(
  options: {
    operation?: "prepare" | "cleanup";
    mutationCount?: number;
    unknownCommit?: "before-commit" | "after-commit";
  } = {}
) {
  const manifest = uuidManifest();
  const database = new FakeDatabase(manifest);
  database.unknownCommit = options.unknownCommit ?? null;
  const fakeMutator = new FakeMutator(options.mutationCount ?? 1);
  const mutator = createExactRecordMutator(fakeMutator, ownedEntityTypes);
  const repository = new PostgresQaResetRepository(database, mutator, () => now);
  const operation = options.operation ?? "prepare";
  const requestWithoutDigest: Omit<DurableResetRequest, "idempotencyDigest"> = {
    operation,
    scope: "manual_qa",
    manifest,
    tenantIds: [manifest.tenantIds[0]!],
    callerAlias: "manual-qa",
    callerPrincipalDigest: "a".repeat(64),
    approvalReference: manifest.approvalReferences[operation],
    correlationId: "qa-reset-contract-test",
    planChecksum: "c".repeat(64),
    mutationPlanChecksum: exactMutationPlanChecksum(manifest, operation, [manifest.tenantIds[0]!]),
    retentionUntil: new Date("2026-08-27T20:00:00.000Z")
  };
  const request = {
    ...requestWithoutDigest,
    idempotencyDigest: deriveQaResetIdempotencyDigest(requestWithoutDigest)
  };
  return { database, manifest, mutator: fakeMutator, repository, request };
}

function durableRequest(
  manifest: ResetManifest,
  operation: "prepare" | "cleanup"
): DurableResetRequest {
  const unsigned: Omit<DurableResetRequest, "idempotencyDigest"> = {
    operation,
    scope: "browser",
    manifest,
    tenantIds: manifest.tenantIds,
    callerAlias: "browser-e2e",
    callerPrincipalDigest: "a".repeat(64),
    approvalReference: manifest.approvalReferences[operation],
    correlationId: `qa-reset-${operation}-order-test`,
    planChecksum: "c".repeat(64),
    mutationPlanChecksum: exactMutationPlanChecksum(manifest, operation, manifest.tenantIds),
    retentionUntil: new Date("2026-08-27T20:00:00.000Z")
  };
  return {
    ...unsigned,
    idempotencyDigest: deriveQaResetIdempotencyDigest(unsigned)
  };
}

function uuidManifest(): ResetManifest {
  const tenantIds = [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002"
  ];
  const records: ManifestRecord[] = [
    {
      synthetic: true,
      namespace: testManifest.namespace,
      tenantId: tenantIds[0]!,
      entityType: "synthetic_user",
      manifestRecordKey: "syn:tenant-a:synthetic_user:01",
      recordId: "10000000-0000-4000-8000-000000000001",
      ownership: "manifest_owned",
      payload: {
        kind: "user",
        publicId: "tenant-a-user",
        emailNormalized: "tenant-a@rwos-staging.invalid",
        displayName: "Test Employer Organization A User",
        status: "active"
      }
    },
    {
      synthetic: true,
      namespace: testManifest.namespace,
      tenantId: tenantIds[1]!,
      entityType: "synthetic_user",
      manifestRecordKey: "syn:tenant-b:synthetic_user:01",
      recordId: "10000000-0000-4000-8000-000000000002",
      ownership: "manifest_owned",
      payload: {
        kind: "user",
        publicId: "tenant-b-user",
        emailNormalized: "tenant-b@rwos-staging.invalid",
        displayName: "Test Employer Organization B User",
        status: "active"
      }
    }
  ];
  const unsigned = {
    ...testManifest,
    tenantIds,
    records,
    expiresAt: "2026-08-01T00:00:00.000Z"
  };
  const { checksum, ...body } = unsigned;
  void checksum;
  return { ...body, checksum: checksumValue(body) };
}

function ownershipEnvelope(manifest: ResetManifest) {
  return {
    namespace: manifest.namespace,
    environment: "staging",
    project_id: manifest.projectId,
    cluster_id: manifest.clusterId,
    database_id: manifest.databaseId,
    authority_id: manifest.authorityId,
    release_sha: manifest.releaseSha,
    status: "active",
    expires_at: manifest.expiresAt
  };
}

class FakeMutator {
  readonly prepared: string[] = [];
  readonly cleaned: string[] = [];

  constructor(private readonly count: number) {}

  async prepare(_connection: SqlConnection, record: ManifestRecord) {
    this.prepared.push(record.recordId);
    return this.count;
  }

  async cleanup(_connection: SqlConnection, record: ManifestRecord) {
    this.cleaned.push(record.recordId);
    return this.count;
  }
}

class FakeDatabase implements SqlTransactionExecutor {
  available = true;
  deniedEntityType: (typeof ownedEntityTypes)[number] | null = null;
  unknownCommit: "before-commit" | "after-commit" | null = null;
  control: {
    id: string;
    manifest_id: string;
    operation: string;
    scope: string;
    caller_alias: string;
    caller_principal_digest: string;
    approval_reference: string;
    status: string;
    result_receipt: string | null;
    observed_record_count: number | null;
    plan_checksum: string;
    digest: string;
  } | null = null;
  events: unknown[] = [];
  calls: Array<{ sql: string; params: readonly unknown[] }> = [];
  manifest: Record<string, unknown>;
  readonly tenantIds: readonly string[];
  #queue = Promise.resolve();

  constructor(manifest: ResetManifest) {
    this.tenantIds = manifest.tenantIds;
    this.manifest = {
      id: "20000000-0000-4000-8000-000000000001",
      manifest_checksum: manifest.checksum,
      namespace: manifest.namespace,
      environment: "staging",
      project_id: manifest.projectId,
      cluster_id: manifest.clusterId,
      database_id: manifest.databaseId,
      authority_id: manifest.authorityId,
      release_sha: manifest.releaseSha,
      status: "active",
      expires_at: manifest.expiresAt
    };
  }

  async transaction<T>(work: (connection: SqlConnection) => Promise<T>): Promise<T> {
    const previous = this.#queue;
    let release = () => {};
    this.#queue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    const snapshot = structuredClone({ control: this.control, events: this.events });
    try {
      if (!this.available) throw new Error("SQL_UNAVAILABLE");
      if (this.unknownCommit === "before-commit") {
        this.unknownCommit = null;
        throw new UnknownTransactionOutcomeError();
      }
      const result = await work(this);
      if (this.unknownCommit === "after-commit") {
        this.unknownCommit = null;
        throw new UnknownTransactionOutcomeError();
      }
      return result;
    } catch (error) {
      if (
        !(error instanceof UnknownTransactionOutcomeError) ||
        this.control?.status !== "succeeded"
      ) {
        this.control = snapshot.control;
        this.events = snapshot.events;
      }
      throw error;
    } finally {
      release();
    }
  }

  async query<Row extends Record<string, unknown>>(
    sql: string,
    params: readonly unknown[] = []
  ): Promise<SqlResult<Row>> {
    if (!this.available) throw new Error("SQL_UNAVAILABLE");
    this.calls.push({ sql, params });
    if (sql.includes("qa-reset:advisory-lock")) return result([], 1);
    if (sql.includes("qa-reset:manifest")) {
      return result([this.manifest], 1) as unknown as SqlResult<Row>;
    }
    if (sql.includes("qa-reset:tenants")) {
      return result(
        this.tenantIds.map((tenant_id) => ({ tenant_id })),
        this.tenantIds.length
      ) as unknown as SqlResult<Row>;
    }
    if (sql.includes("qa-reset:control")) {
      return (this.control
        ? result([this.control], 1)
        : result([], 0)) as unknown as SqlResult<Row>;
    }
    if (sql.includes("qa-reset:create-control")) {
      if (this.control) return result([], 0);
      this.control = {
        id: String(params[0]),
        manifest_id: String(params[1]),
        operation: String(params[2]),
        scope: String(params[3]),
        caller_alias: String(params[6]),
        caller_principal_digest: String(params[7]),
        approval_reference: String(params[8]),
        status: "running",
        result_receipt: null,
        observed_record_count: null,
        plan_checksum: String(params[5]),
        digest: String(params[4])
      };
      return result([], 1);
    }
    if (sql.includes("qa-reset:owned-record-authorize")) {
      return (params[3] !== this.deniedEntityType
        ? result([{ lifecycle_status: "declared" }], 1)
        : result([], 0)) as unknown as SqlResult<Row>;
    }
    if (sql.includes("qa-reset:owned-record")) return result([], 1);
    if (sql.includes("qa-reset:complete-control")) {
      if (!this.control || this.control.status !== "running") return result([], 0);
      this.control.status = String(params[1]);
      this.control.result_receipt = String(params[2]);
      this.control.observed_record_count = Number(params[3]);
      return result([], 1);
    }
    if (sql.includes("qa-reset:event")) {
      this.events.push(params);
      return result([], 1);
    }
    throw new Error("UNEXPECTED_SQL");
  }
}

function result<Row extends Record<string, unknown>>(
  rows: readonly Row[],
  rowCount: number
): SqlResult<Row> {
  return { rows, rowCount };
}
