import { createHash } from "node:crypto";
import type { PrismaClient } from "@rwos/database";
import type { OwnedEntityType, ResetManifest } from "./manifest";
import { approvedCleanupStrategyForEntity, approvedTableForEntity } from "./mutationPlan";

type RegistrationClient = Pick<PrismaClient, "$transaction">;
type RegistrationTransaction = Parameters<Parameters<RegistrationClient["$transaction"]>[0]>[0];

const registrationConfirmation = "register-approved-synthetic-staging-manifest";
const supersessionConfirmation = "supersede-approved-synthetic-staging-manifest";

export async function registerApprovedStagingManifest(
  client: RegistrationClient,
  manifest: ResetManifest,
  organizationOwnerAccessRoleId: string
) {
  if (!confirmed("QA_RESET_MANIFEST_REGISTRATION_CONFIRMATION", registrationConfirmation)) {
    throw new Error("QA_RESET_MANIFEST_REGISTRATION_DENIED");
  }

  return client.$transaction(async (transaction) => {
    await lockAndVerifyRole(transaction, manifest.namespace, organizationOwnerAccessRoleId);
    const existing = await readNamespaceManifests(transaction, manifest.namespace);
    const active = existing.filter((row) => ["approved", "active"].includes(row.status));
    if (active.length > 0) {
      const ownershipId = ownershipIdFor(manifest);
      const exact = active.filter((row) => exactManifest(row, manifest, ownershipId));
      if (active.length !== 1 || exact.length !== 1) {
        throw new Error("QA_RESET_MANIFEST_REGISTRATION_CONFLICT");
      }
      const counts = await registrationCounts(transaction, ownershipId);
      if (
        counts.tenants !== manifest.tenantIds.length ||
        counts.records !== manifest.records.length
      ) {
        throw new Error("QA_RESET_MANIFEST_REGISTRATION_PARTIAL");
      }
      return { registered: true as const, idempotent: true as const, ownershipId };
    }
    return insertManifest(transaction, manifest);
  });
}

export async function supersedeApprovedStagingManifest(
  client: RegistrationClient,
  manifest: ResetManifest,
  organizationOwnerAccessRoleId: string,
  expectedCurrentChecksum: string
) {
  if (!confirmed("QA_RESET_MANIFEST_SUPERSESSION_CONFIRMATION", supersessionConfirmation)) {
    throw new Error("QA_RESET_MANIFEST_SUPERSESSION_DENIED");
  }
  if (
    !/^[a-f0-9]{64}$/.test(expectedCurrentChecksum) ||
    expectedCurrentChecksum === manifest.checksum
  ) {
    throw new Error("QA_RESET_MANIFEST_SUPERSESSION_EXPECTATION_INVALID");
  }
  return client.$transaction(async (transaction) => {
    await lockAndVerifyRole(transaction, manifest.namespace, organizationOwnerAccessRoleId);
    const existing = await readNamespaceManifests(transaction, manifest.namespace);
    const active = existing.filter((row) => ["approved", "active"].includes(row.status));
    if (
      active.length !== 1 ||
      active[0]?.manifest_checksum !== expectedCurrentChecksum ||
      active[0]?.manifest_reference === manifest.manifestId
    ) {
      throw new Error("QA_RESET_MANIFEST_SUPERSESSION_CONFLICT");
    }
    const runs = await transaction.$queryRawUnsafe<
      Array<{ status: string; completed_at: Date | string | null }>
    >(
      `SELECT status::text, completed_at
         FROM qa_reset_control_runs
        WHERE manifest_id = $1::uuid
        ORDER BY created_at, id
        FOR UPDATE`,
      active[0].id
    );
    if (!runs.every(isConclusivelyTerminalRun)) {
      throw new Error("QA_RESET_MANIFEST_SUPERSESSION_RUNS_NOT_TERMINAL");
    }
    const retired = await transaction.$executeRawUnsafe(
      `UPDATE qa_reset_manifest_ownership
          SET status = 'retired', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1::uuid AND status IN ('approved', 'active')`,
      active[0].id
    );
    if (retired !== 1) throw new Error("QA_RESET_MANIFEST_SUPERSESSION_CONFLICT");
    const inserted = await insertManifest(transaction, manifest);
    // Self-heal: a superseded manifest must not leave its (or any earlier manifest's) synthetic
    // entities materialized in the namespace. Otherwise inspect() reports them as
    // foreignIdsInNamespace and every later dry-run/prepare fail-closes with a persistence
    // conflict. Reconcile clears all non-current materialized records via the approved cleanup
    // strategy, in FK-safe cleanup order.
    const reconciledForeignRecords = await reconcileForeignMaterializedRecords(
      transaction,
      manifest.namespace,
      inserted.ownershipId,
      manifest.cleanupOrder
    );
    return {
      ...inserted,
      superseded: true as const,
      previousOwnershipId: active[0].id,
      reconciledForeignRecords
    };
  });
}

// Removes every synthetic entity materialized by a manifest other than `keepOwnershipId` and marks
// those durable owned-record rows `cleaned`. Read-committed and executed inside the caller's
// transaction. Deletes only entities whose approved cleanup strategy is `delete_exact`; reference
// and evidence rows are preserved. `membership_access_roles` has a composite PK (no `id`), so it is
// removed via its owning membership, which is itself being cleaned in the same pass.
async function reconcileForeignMaterializedRecords(
  transaction: RegistrationTransaction,
  namespace: string,
  keepOwnershipId: string,
  cleanupOrder: readonly OwnedEntityType[]
): Promise<number> {
  const foreign = await transaction.$queryRawUnsafe<
    Array<{ entity_type: string; target_record_id: string }>
  >(
    `SELECT entity_type::text AS entity_type, target_record_id::text AS target_record_id
       FROM qa_reset_owned_records
      WHERE namespace = $1
        AND manifest_id <> $2::uuid
        AND lifecycle_status IN ('prepared', 'verified')
      FOR UPDATE`,
    namespace,
    keepOwnershipId
  );
  if (foreign.length === 0) return 0;

  const idsByEntity = new Map<OwnedEntityType, string[]>();
  for (const row of foreign) {
    const entityType = row.entity_type as OwnedEntityType;
    const ids = idsByEntity.get(entityType) ?? [];
    ids.push(row.target_record_id);
    idsByEntity.set(entityType, ids);
  }

  // Break the only deferred/circular FK in the graph (worker_offers.current_terms_version_id ->
  // worker_offer_terms_versions.id) before deleting either, mirroring the cleanup mutator. Without
  // this, deleting worker_offer_terms_versions violates worker_offers_current_terms_version_id_fkey.
  const workerOfferIds = idsByEntity.get("worker_offer");
  if (workerOfferIds && workerOfferIds.length > 0) {
    await transaction.$executeRawUnsafe(
      `UPDATE worker_offers SET current_terms_version_id = NULL WHERE id = ANY($1::uuid[])`,
      workerOfferIds
    );
  }

  // Login/auth flows create rows in these RESTRICT-FK tables for the synthetic users that the
  // manifest does not track (extra identities, sessions, verification codes, reset tokens). Clear
  // them all by user reference before deleting the users, otherwise the untracked rows block the
  // users delete with their own foreign-key constraints.
  const syntheticUserIds = idsByEntity.get("synthetic_user");
  if (syntheticUserIds && syntheticUserIds.length > 0) {
    for (const table of [
      "user_identities",
      "sessions",
      "email_verification_codes",
      "password_reset_tokens"
    ]) {
      await transaction.$executeRawUnsafe(
        `DELETE FROM ${table} WHERE user_id = ANY($1::uuid[])`,
        syntheticUserIds
      );
    }
  }

  for (const entityType of cleanupOrder) {
    const ids = idsByEntity.get(entityType);
    if (!ids || ids.length === 0) continue;
    if (approvedCleanupStrategyForEntity(entityType) !== "delete_exact") continue;
    if (entityType === "membership_access_role") {
      await transaction.$executeRawUnsafe(
        `DELETE FROM membership_access_roles
          WHERE membership_id IN (
            SELECT target_record_id::uuid
              FROM qa_reset_owned_records
             WHERE namespace = $1
               AND manifest_id <> $2::uuid
               AND entity_type = 'membership'
               AND lifecycle_status IN ('prepared', 'verified'))`,
        namespace,
        keepOwnershipId
      );
      continue;
    }
    await transaction.$executeRawUnsafe(
      `DELETE FROM ${approvedTableForEntity(entityType)} WHERE id = ANY($1::uuid[])`,
      ids
    );
  }

  const cleaned = await transaction.$executeRawUnsafe(
    `UPDATE qa_reset_owned_records
        SET lifecycle_status = 'cleaned', cleaned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE namespace = $1
        AND manifest_id <> $2::uuid
        AND lifecycle_status IN ('prepared', 'verified')`,
    namespace,
    keepOwnershipId
  );
  return Number(cleaned);
}

const terminalRunStatuses = new Set(["succeeded", "failed", "blocked", "cleanup_completed"]);

function isConclusivelyTerminalRun(run: { status: string; completed_at: Date | string | null }) {
  return terminalRunStatuses.has(run.status) && run.completed_at !== null;
}

type ManifestRow = {
  id: string;
  manifest_reference: string;
  manifest_checksum: string;
  release_sha: string;
  status: string;
};

function confirmed(key: string, confirmation: string) {
  return process.env.RWOS_ENV === "staging" && process.env[key] === confirmation;
}

async function lockAndVerifyRole(
  transaction: RegistrationTransaction,
  namespace: string,
  organizationOwnerAccessRoleId: string
) {
  await transaction.$queryRawUnsafe(
    "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))::text",
    `qa-reset:manifest-registration:${namespace}`
  );
  const role = await transaction.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id::text
       FROM access_role_definitions
      WHERE id = $1::uuid AND key = 'ORGANIZATION_OWNER'
        AND scope = 'organization' AND status = 'active'`,
    organizationOwnerAccessRoleId
  );
  if (role.length !== 1) throw new Error("QA_RESET_OWNER_ROLE_NOT_READY");
}

function readNamespaceManifests(transaction: RegistrationTransaction, namespace: string) {
  return transaction.$queryRawUnsafe<ManifestRow[]>(
    `SELECT id::text, manifest_reference, manifest_checksum, release_sha, status
       FROM qa_reset_manifest_ownership
      WHERE namespace = $1
      FOR UPDATE`,
    namespace
  );
}

function ownershipIdFor(manifest: ResetManifest) {
  return deterministicUuid(`ownership:${manifest.namespace}:${manifest.checksum}`);
}

function exactManifest(row: ManifestRow, manifest: ResetManifest, ownershipId: string) {
  return (
    row.id === ownershipId &&
    row.manifest_reference === manifest.manifestId &&
    row.manifest_checksum === manifest.checksum &&
    row.release_sha === manifest.releaseSha
  );
}

async function insertManifest(transaction: RegistrationTransaction, manifest: ResetManifest) {
  const ownershipId = ownershipIdFor(manifest);
  const principalDigest = createHash("sha256")
    .update(`staging-manifest-registration:${manifest.checksum}`)
    .digest("hex");
  await transaction.$executeRawUnsafe(
    `INSERT INTO qa_reset_manifest_ownership
        (id, manifest_reference, manifest_checksum, namespace, environment, project_id,
         cluster_id, database_id, authority_id, release_sha, status, approved_at, expires_at,
         retention_until, approval_reference, retention_owner_reference,
         created_by_caller_alias, created_by_principal_digest, created_at, updated_at)
       VALUES ($1::uuid, $2, $3, $4, 'staging', $5, $6, $7, $8, $9, 'active',
               CURRENT_TIMESTAMP, $10::timestamptz, $11::timestamptz, $12,
               'gcp/owners/database/mohamed-almashhour-001', 'manifest-registration', $13,
               $14::timestamptz, CURRENT_TIMESTAMP)`,
    ownershipId,
    manifest.manifestId,
    manifest.checksum,
    manifest.namespace,
    manifest.projectId,
    manifest.clusterId,
    manifest.databaseId,
    manifest.authorityId,
    manifest.releaseSha,
    manifest.expiresAt,
    manifest.retentionUntil,
    manifest.approvalReferences.prepare,
    principalDigest,
    // created_at is anchored to the manifest's own createdAt (not the DB default now())
    // so qa_reset_manifests_expiry_check (expires_at > created_at) holds even when a
    // fixture manifest carries frozen past dates; in production createdAt is the real
    // registration instant, strictly before the future expiry.
    manifest.createdAt
  );
  for (const [index, tenantId] of manifest.tenantIds.entries()) {
    await transaction.$executeRawUnsafe(
      `INSERT INTO qa_reset_manifest_tenants (id, manifest_id, tenant_id, tenant_alias)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4)`,
      deterministicUuid(`tenant:${manifest.checksum}:${tenantId}`),
      ownershipId,
      tenantId,
      index === 0 ? "tenant-a" : "tenant-b"
    );
  }
  for (const record of manifest.records) {
    await transaction.$executeRawUnsafe(
      `INSERT INTO qa_reset_owned_records
          (id, manifest_id, tenant_id, namespace, entity_type, manifest_record_key,
           target_record_id, lifecycle_status, updated_at)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7::uuid, 'declared',
                 CURRENT_TIMESTAMP)`,
      deterministicUuid(`owned:${manifest.checksum}:${record.manifestRecordKey}`),
      ownershipId,
      record.tenantId,
      record.namespace,
      record.entityType,
      record.manifestRecordKey,
      record.recordId
    );
  }
  return { registered: true as const, idempotent: false as const, ownershipId };
}

async function registrationCounts(transaction: RegistrationTransaction, ownershipId: string) {
  const rows = await transaction.$queryRawUnsafe<Array<{ tenants: bigint; records: bigint }>>(
    `SELECT
       (SELECT count(*) FROM qa_reset_manifest_tenants WHERE manifest_id = $1::uuid) AS tenants,
       (SELECT count(*) FROM qa_reset_owned_records WHERE manifest_id = $1::uuid) AS records`,
    ownershipId
  );
  return { tenants: Number(rows[0]?.tenants ?? -1), records: Number(rows[0]?.records ?? -1) };
}

function deterministicUuid(value: string) {
  const hex = createHash("sha256").update(value).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
