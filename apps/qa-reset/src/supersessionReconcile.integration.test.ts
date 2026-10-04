import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "@rwos/database";
import { createFakeIdentityTokenVerifier } from "@rwos/service-auth/testing";
import type { QaResetPersistencePort } from "./composition";
import { createQaResetRuntimeComposition } from "./runtimeComposition";
import { approvedTableForEntity, exactMutationPlanChecksum } from "./mutationPlan";
import {
  deriveQaResetIdempotencyDigest,
  type DurableResetOperation,
  type DurableResetRequest
} from "./postgresRepository";
import { createResetManifest } from "./manifest";
import { supersedeApprovedStagingManifest } from "./manifestRegistration";
import { testConfig, testManifest } from "./testFixture";

const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;
const ownershipId = randomUUID();

// Manifest that supersedes the fixture manifest (distinct id => distinct checksum + entity ids).
const nextManifest = createResetManifest({
  ...testConfig,
  manifestId: "rwos-qa-reset-manifest-next"
});

suite("QA-reset supersession reconciles stranded materializations", () => {
  let prisma: ReturnType<typeof createPrismaClient>;
  let runtime: ReturnType<typeof createQaResetRuntimeComposition>;
  let persistence: QaResetPersistencePort;

  beforeAll(async () => {
    prisma = createPrismaClient(databaseUrl);
    runtime = createQaResetRuntimeComposition({
      config: testConfig,
      manifest: testManifest,
      env: { RWOS_ENV: "staging", NODE_ENV: "test", DATABASE_URL: databaseUrl },
      createClient: () => prisma,
      identityVerifier: createFakeIdentityTokenVerifier({ identities: {} }),
      now: () => new Date("2026-07-28T12:00:00.000Z")
    });
    persistence = runtime.postgresFactory(testConfig, testManifest);
    await cleanup();
    await seedEnvelope();
  });

  afterAll(async () => {
    await cleanup();
    await runtime.close();
  });

  it("clears the outgoing manifest's materialized fixture (incl. the deferred worker_offer FK)", async () => {
    // Materialize the full 24-entity fixture, leaving owned records in `prepared`.
    const prepared = await persistence.durableRepository.execute(
      request("prepare", "c".repeat(64))
    );
    expect(prepared).toMatchObject({ status: "succeeded", idempotent: false });
    expect(await countDeletableResidue()).toBeGreaterThan(0);

    // Simulate the login residue browser-E2E leaves behind: untracked auth rows referencing the
    // synthetic users (extra identities + sessions) that the manifest does not know about. This is
    // the exact case that broke the reconcile in staging (users -> user_identities RESTRICT FK).
    const syntheticUserIds = testManifest.records
      .filter((r) => r.entityType === "synthetic_user")
      .map((r) => r.recordId);
    for (const [i, userId] of syntheticUserIds.entries()) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO user_identities (id, user_id, provider, provider_subject, updated_at)
         VALUES (gen_random_uuid(), $1::uuid, 'dev_test', $2, CURRENT_TIMESTAMP)`,
        userId,
        `orphan-identity-${i}`
      );
      await prisma.$executeRawUnsafe(
        `INSERT INTO sessions (id, user_id, session_hash, expires_at)
         VALUES (gen_random_uuid(), $1::uuid, $2, CURRENT_TIMESTAMP + interval '1 day')`,
        userId,
        `orphan-session-${i}`
      );
    }

    // Inject an audit_event referencing a synthetic org, as the E2E does. audit_events are
    // append-only, so with the old SetNull FK this made deleting the org impossible (the third
    // staging failure). With the FK dropped, the org reference is an immutable snapshot and the
    // org deletes cleanly while the audit row survives untouched.
    const actorRef = testManifest.records.find((r) => r.entityType === "audit_actor_reference")!;
    const org = testManifest.records.find((r) => r.entityType === "employer_organization")!;
    await prisma.$executeRawUnsafe(
      `INSERT INTO audit_events
         (id, actor_reference_id, organization_id, entity_type, entity_id, action, source, correlation_id, created_at)
       VALUES (gen_random_uuid(), $1::uuid, $2::uuid, 'employer_organization', $2::uuid, 'test.audit', 'api', 'reconcile-audit-probe', CURRENT_TIMESTAMP)`,
      actorRef.recordId,
      org.recordId
    );

    // Supersede the fixture manifest -> next manifest. The fixed reconcile must clear the
    // outgoing manifest's materialized rows in FK-safe order without violating any constraint.
    process.env.RWOS_ENV = "staging";
    process.env.QA_RESET_MANIFEST_SUPERSESSION_CONFIRMATION =
      "supersede-approved-synthetic-staging-manifest";
    const result = await supersedeApprovedStagingManifest(
      prisma,
      nextManifest,
      testConfig.organizationOwnerAccessRoleId,
      testManifest.checksum
    );

    expect(result).toMatchObject({ superseded: true });
    expect(result.reconciledForeignRecords).toBeGreaterThan(0);

    // Every deletable synthetic entity from the outgoing manifest is gone.
    expect(await countDeletableResidue()).toBe(0);
    // membership_access_roles has a composite PK (no id) — verify the table is empty separately.
    const macRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT count(*)::bigint AS count FROM membership_access_roles`
    );
    expect(Number(macRows[0]!.count)).toBe(0);

    // The untracked login residue (extra identities + sessions) for the synthetic users is cleared.
    for (const table of ["user_identities", "sessions"]) {
      const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT count(*)::bigint AS count FROM ${table} WHERE user_id = ANY($1::uuid[])`,
        syntheticUserIds
      );
      expect(Number(rows[0]!.count)).toBe(0);
    }

    // The append-only audit event survives untouched, keeping its (now-dangling) org snapshot.
    const auditRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT count(*)::bigint AS count FROM audit_events WHERE correlation_id = 'reconcile-audit-probe'`
    );
    expect(Number(auditRows[0]!.count)).toBe(1);

    // The outgoing manifest's durable owned records are marked cleaned; it is retired.
    const stillMaterialized = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT count(*)::bigint AS count FROM qa_reset_owned_records
        WHERE manifest_id = $1 AND lifecycle_status IN ('prepared', 'verified')`,
      ownershipId
    );
    expect(Number(stillMaterialized[0]!.count)).toBe(0);

    const active = await prisma.$queryRawUnsafe<Array<{ manifest_reference: string }>>(
      `SELECT manifest_reference FROM qa_reset_manifest_ownership
        WHERE namespace = $1 AND status IN ('approved', 'active')`,
      testManifest.namespace
    );
    expect(active.map((row) => row.manifest_reference)).toEqual([nextManifest.manifestId]);
  }, 60_000);

  async function countDeletableResidue() {
    // membership_access_role has a composite PK (no id column); it is checked separately.
    const retained = new Set([
      "access_role_definition",
      "audit_actor_reference",
      "audit_event",
      "membership_access_role"
    ]);
    let count = 0;
    for (const record of testManifest.records.filter(
      ({ entityType }) => !retained.has(entityType)
    )) {
      const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT count(*)::bigint AS count FROM ${approvedTableForEntity(record.entityType)} WHERE id = $1`,
        record.recordId
      );
      count += Number(rows[0]!.count);
    }
    return count;
  }

  async function seedEnvelope() {
    await prisma.$executeRawUnsafe(
      `INSERT INTO access_role_definitions (id, key, scope, status, is_system, created_at, updated_at)
       VALUES ($1, 'ORGANIZATION_OWNER', 'organization', 'active', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
               CURRENT_TIMESTAMP, $10, $11, $12, $13, 'local-test', $14, CURRENT_TIMESTAMP, $15)`,
      ownershipId,
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
      "local-retention",
      "a".repeat(64),
      new Date(testManifest.createdAt)
    );
    for (const [index, tenantId] of testManifest.tenantIds.entries()) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO qa_reset_manifest_tenants (id, manifest_id, tenant_id, tenant_alias)
         VALUES ($1, $2, $3, $4)`,
        randomUUID(),
        ownershipId,
        tenantId,
        index === 0 ? "tenant-a" : "tenant-b"
      );
    }
    for (const record of testManifest.records) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO qa_reset_owned_records
           (id, manifest_id, tenant_id, namespace, entity_type, manifest_record_key,
            target_record_id, lifecycle_status, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'declared', CURRENT_TIMESTAMP)`,
        randomUUID(),
        ownershipId,
        record.tenantId,
        record.namespace,
        record.entityType,
        record.manifestRecordKey,
        record.recordId
      );
    }
  }

  async function cleanup() {
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
    const unsigned: Omit<DurableResetRequest, "idempotencyDigest"> = {
      operation,
      scope: "browser",
      manifest: testManifest,
      tenantIds: testManifest.tenantIds,
      callerAlias: "browser-e2e",
      callerPrincipalDigest: "b".repeat(64),
      approvalReference: testManifest.approvalReferences[operation],
      correlationId: `supersession-reconcile-${operation}`,
      planChecksum,
      mutationPlanChecksum: exactMutationPlanChecksum(
        testManifest,
        operation,
        testManifest.tenantIds
      ),
      retentionUntil: new Date(testManifest.retentionUntil)
    };
    return { ...unsigned, idempotencyDigest: deriveQaResetIdempotencyDigest(unsigned) };
  }
});
