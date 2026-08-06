import { createHash } from "node:crypto";
import type { PrismaClient } from "@rwos/database";
import type { ResetManifest } from "./manifest";

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
    const runs = await transaction.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT count(*)::bigint AS count FROM qa_reset_control_runs WHERE manifest_id = $1::uuid`,
      active[0].id
    );
    if (Number(runs[0]?.count ?? -1) !== 0) {
      throw new Error("QA_RESET_MANIFEST_SUPERSESSION_RUNS_PRESENT");
    }
    const retired = await transaction.$executeRawUnsafe(
      `UPDATE qa_reset_manifest_ownership
          SET status = 'retired', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1::uuid AND status IN ('approved', 'active')`,
      active[0].id
    );
    if (retired !== 1) throw new Error("QA_RESET_MANIFEST_SUPERSESSION_CONFLICT");
    const inserted = await insertManifest(transaction, manifest);
    return {
      ...inserted,
      superseded: true as const,
      previousOwnershipId: active[0].id
    };
  });
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
         created_by_caller_alias, created_by_principal_digest, updated_at)
       VALUES ($1::uuid, $2, $3, $4, 'staging', $5, $6, $7, $8, $9, 'active',
               CURRENT_TIMESTAMP, $10::timestamptz, $11::timestamptz, $12,
               'gcp/owners/database/mohamed-almashhour-001', 'manifest-registration', $13,
               CURRENT_TIMESTAMP)`,
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
    principalDigest
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
