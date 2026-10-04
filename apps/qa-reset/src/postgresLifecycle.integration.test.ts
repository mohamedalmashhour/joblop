import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "@rwos/database";
import { createFakeIdentityTokenVerifier } from "@rwos/service-auth/testing";
import type { QaResetPersistencePort } from "./composition";
import { createQaResetRuntimeComposition } from "./runtimeComposition";
import { approvedTableForEntity, exactMutationPlanChecksum } from "./mutationPlan";
import {
  deriveQaResetIdempotencyDigest,
  QaResetPersistenceConflictError,
  type DurableResetOperation,
  type DurableResetRequest
} from "./postgresRepository";
import { testConfig, testManifest } from "./testFixture";

const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;
const manifestOwnershipId = randomUUID();
suite("QA-reset durable PostgreSQL lifecycle", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let runtime: ReturnType<typeof createQaResetRuntimeComposition>;
  let persistence: QaResetPersistencePort;
  let repository: QaResetPersistencePort["durableRepository"];

  beforeAll(async () => {
    prisma = createPrismaClient(databaseUrl);
    runtime = createQaResetRuntimeComposition({
      config: testConfig,
      manifest: testManifest,
      env: {
        RWOS_ENV: "staging",
        NODE_ENV: "test",
        DATABASE_URL: databaseUrl
      },
      createClient: () => prisma,
      identityVerifier: createFakeIdentityTokenVerifier({ identities: {} }),
      now: () => new Date("2026-07-28T12:00:00.000Z")
    });
    persistence = runtime.postgresFactory(testConfig, testManifest);
    repository = persistence.durableRepository;
    await removeControlEnvelope();
    await seedControlEnvelope();
  });

  afterAll(async () => {
    await removeControlEnvelope();
    await runtime.close();
  });

  it("prepares, inspects and cleans the complete 24-entity fixture in FK-safe order", async () => {
    await expect(persistence.ready()).resolves.toBe(true);
    await proveRollbackIsolation();
    await expect(repository.inspect(testManifest)).resolves.toEqual({
      manifestOwnedIds: [],
      foreignIdsInNamespace: [],
      unrelatedIds: []
    });

    const prepared = await repository.execute(request("prepare", "c".repeat(64)));
    expect(prepared).toMatchObject({
      status: "succeeded",
      affectedCount: testManifest.records.length,
      idempotent: false
    });
    await expect(repository.inspect(testManifest)).resolves.toMatchObject({
      manifestOwnedIds: expect.arrayContaining(
        testManifest.records.map(({ recordId }) => recordId)
      ),
      foreignIdsInNamespace: []
    });

    const timestampRows = await prisma.$queryRawUnsafe<Array<{ updated_at: Date }>>(
      `SELECT updated_at FROM users WHERE id = ANY($1::uuid[]) ORDER BY id`,
      testManifest.records
        .filter(({ entityType }) => entityType === "synthetic_user")
        .map(({ recordId }) => recordId)
    );
    expect(timestampRows).toHaveLength(4);
    expect(new Set(timestampRows.map(({ updated_at }) => updated_at.toISOString())).size).toBe(1);

    const retainedActor = testManifest.records.find(
      ({ entityType, tenantId }) =>
        entityType === "audit_actor_reference" && tenantId === testConfig.tenantAId
    )!;
    await prisma.$executeRawUnsafe(
      `UPDATE audit_actor_references SET display_label = 'tampered' WHERE id = $1`,
      retainedActor.recordId
    );
    await expect(repository.execute(request("cleanup", "f".repeat(64)))).rejects.toBeInstanceOf(
      QaResetPersistenceConflictError
    );
    await expect(countEntityRows("employer_organizations")).resolves.toBe(2);
    await prisma.$executeRawUnsafe(
      `UPDATE audit_actor_references SET display_label = $2 WHERE id = $1`,
      retainedActor.recordId,
      retainedActor.payload.kind === "audit_actor_reference"
        ? retainedActor.payload.displayLabel
        : ""
    );

    const cleaned = await repository.execute(request("cleanup", "d".repeat(64)));
    expect(cleaned).toMatchObject({
      status: "cleanup_completed",
      affectedCount: testManifest.records.length,
      idempotent: false
    });
    const retainedEvidenceIds = testManifest.records
      .filter(({ entityType }) => ["audit_actor_reference", "audit_event"].includes(entityType))
      .map(({ recordId }) => recordId)
      .sort();
    await expect(repository.inspect(testManifest)).resolves.toEqual({
      manifestOwnedIds: retainedEvidenceIds,
      foreignIdsInNamespace: [],
      unrelatedIds: []
    });
    await expect(countDeletableFixtureResidue()).resolves.toBe(0);
    await expect(countApprovedReference()).resolves.toBe(1);
  }, 45_000);

  async function proveRollbackIsolation() {
    const organizationA = testManifest.records.find(
      ({ entityType, tenantId }) =>
        entityType === "employer_organization" && tenantId === testConfig.tenantAId
    )!;
    await prisma.$executeRawUnsafe(
      `DELETE FROM qa_reset_owned_records
        WHERE manifest_id = $1 AND target_record_id = $2`,
      manifestOwnershipId,
      organizationA.recordId
    );
    try {
      await expect(repository.execute(request("prepare", "e".repeat(64)))).rejects.toBeInstanceOf(
        QaResetPersistenceConflictError
      );
      const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT count(*)::bigint AS count
           FROM employer_organizations
          WHERE id = $1`,
        organizationA.recordId
      );
      expect(Number(rows[0]!.count)).toBe(0);
      const runs = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT count(*)::bigint AS count
           FROM qa_reset_control_runs
          WHERE correlation_id = $1`,
        "qa-reset-postgres-rollback"
      );
      expect(Number(runs[0]!.count)).toBe(0);
    } finally {
      await seedOwnedRecord(organizationA);
    }
  }

  async function seedControlEnvelope() {
    await prisma.$executeRawUnsafe(
      `INSERT INTO access_role_definitions
         (id, key, scope, status, is_system, created_at, updated_at)
       VALUES ($1, 'ORGANIZATION_OWNER', 'organization', 'active', true,
               CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO NOTHING`,
      testConfig.organizationOwnerAccessRoleId
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO qa_reset_manifest_ownership
         (id, manifest_reference, manifest_checksum, namespace, environment, project_id,
          cluster_id, database_id, authority_id, release_sha, status, approved_at, expires_at,
          retention_until, approval_reference, retention_owner_reference,
          created_by_caller_alias, created_by_principal_digest, updated_at, created_at)
       VALUES ($1, $2, $3, $4, 'staging', $5, $6, $7, $8, $9, 'active',
               CURRENT_TIMESTAMP, $10, $11, $12, $13, 'local-postgres-test', $14,
               CURRENT_TIMESTAMP, $15)`,
      manifestOwnershipId,
      testManifest.manifestId,
      testManifest.checksum,
      testManifest.namespace,
      testManifest.projectId,
      testManifest.clusterId,
      testManifest.databaseId,
      testManifest.authorityId,
      testManifest.releaseSha,
      new Date(testManifest.expiresAt),
      new Date(testManifest.retentionUntil),
      testManifest.approvalReferences.prepare,
      "local-retention-test",
      "a".repeat(64),
      new Date(testManifest.createdAt)
    );
    for (const [index, tenantId] of testManifest.tenantIds.entries()) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO qa_reset_manifest_tenants
           (id, manifest_id, tenant_id, tenant_alias)
         VALUES ($1, $2, $3, $4)`,
        randomUUID(),
        manifestOwnershipId,
        tenantId,
        index === 0 ? "tenant-a" : "tenant-b"
      );
    }
    for (const record of testManifest.records) {
      await seedOwnedRecord(record);
    }
  }

  async function seedOwnedRecord(record: (typeof testManifest.records)[number]) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO qa_reset_owned_records
         (id, manifest_id, tenant_id, namespace, entity_type, manifest_record_key,
          target_record_id, lifecycle_status, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'declared', CURRENT_TIMESTAMP)`,
      randomUUID(),
      manifestOwnershipId,
      record.tenantId,
      record.namespace,
      record.entityType,
      record.manifestRecordKey,
      record.recordId
    );
  }

  async function removeControlEnvelope() {
    // Remove every materialized fixture entity (manifest-owned) in FK-safe cleanup
    // order, including the append-only "retained" rows (audit_event /
    // audit_actor_reference) that the reset itself never clears. Without this they
    // survive with their fixed ids and collide with the next suite or run (23505).
    for (const entityType of testManifest.cleanupOrder) {
      if (entityType === "membership_access_role") continue; // removed below via access_role_definition_id
      const ids = testManifest.records
        .filter((r) => r.entityType === entityType && r.ownership === "manifest_owned")
        .map((r) => r.recordId);
      if (ids.length === 0) continue;
      await prisma.$executeRawUnsafe(
        `DELETE FROM ${approvedTableForEntity(entityType)} WHERE id = ANY($1::uuid[])`,
        ids
      );
    }
    // qa_reset_* tables are owned exclusively by this utility, so a full wipe is
    // safe and also clears residue from any prior aborted run (ids differ per run).
    for (const table of [
      "qa_reset_control_events",
      "qa_reset_control_runs",
      "qa_reset_owned_records",
      "qa_reset_manifest_tenants",
      "qa_reset_manifest_ownership"
    ]) {
      await prisma.$executeRawUnsafe(`DELETE FROM ${table}`);
    }
    // access_role_definitions is shared with other suites (e.g. api's
    // PLATFORM_ADMINISTRATOR), so only remove THIS suite's ORGANIZATION_OWNER
    // fixture, FK-safe, never touching rows another suite owns.
    for (const table of [
      "platform_access_grants",
      "membership_access_roles",
      "access_role_permissions"
    ]) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM ${table} WHERE access_role_definition_id = $1`,
        testConfig.organizationOwnerAccessRoleId
      );
    }
    await prisma.$executeRawUnsafe(
      `DELETE FROM access_role_definitions WHERE id = $1`,
      testConfig.organizationOwnerAccessRoleId
    );
  }

  function request(operation: DurableResetOperation, planChecksum: string): DurableResetRequest {
    const correlationId =
      planChecksum[0] === "e" ? "qa-reset-postgres-rollback" : `qa-reset-postgres-${operation}`;
    const unsigned: Omit<DurableResetRequest, "idempotencyDigest"> = {
      operation,
      scope: "browser",
      manifest: testManifest,
      tenantIds: testManifest.tenantIds,
      callerAlias: "browser-e2e",
      callerPrincipalDigest: "b".repeat(64),
      approvalReference: testManifest.approvalReferences[operation],
      correlationId,
      planChecksum,
      mutationPlanChecksum: exactMutationPlanChecksum(
        testManifest,
        operation,
        testManifest.tenantIds
      ),
      retentionUntil: new Date(testManifest.retentionUntil)
    };
    return {
      ...unsigned,
      idempotencyDigest: deriveQaResetIdempotencyDigest(unsigned)
    };
  }

  async function countDeletableFixtureResidue() {
    const retained = new Set(["access_role_definition", "audit_actor_reference", "audit_event"]);
    let count = 0;
    for (const record of testManifest.records.filter(
      ({ entityType }) => !retained.has(entityType)
    )) {
      const table = approvedTableForEntity(record.entityType);
      const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        record.entityType === "membership_access_role"
          ? `SELECT count(*)::bigint AS count FROM membership_access_roles
               WHERE membership_id = $1 AND access_role_definition_id = $2`
          : `SELECT count(*)::bigint AS count FROM ${table} WHERE id = $1`,
        ...(record.entityType === "membership_access_role"
          ? [
              record.payload.kind === "membership_access_role" ? record.payload.membershipId : "",
              record.payload.kind === "membership_access_role"
                ? record.payload.accessRoleDefinitionId
                : ""
            ]
          : [record.recordId])
      );
      count += Number(rows[0]!.count);
    }
    return count;
  }

  async function countApprovedReference() {
    const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT count(*)::bigint AS count
         FROM access_role_definitions
        WHERE id = $1`,
      testConfig.organizationOwnerAccessRoleId
    );
    return Number(rows[0]!.count);
  }

  async function countEntityRows(table: "employer_organizations") {
    const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT count(*)::bigint AS count FROM ${table}`
    );
    return Number(rows[0]!.count);
  }
});
