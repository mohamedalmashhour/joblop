import { createHash } from "node:crypto";
import type { PrismaClient } from "@rwos/database";
import type { ResetManifest } from "./manifest";

type RegistrationClient = Pick<PrismaClient, "$transaction">;

export async function registerApprovedStagingManifest(
  client: RegistrationClient,
  manifest: ResetManifest,
  organizationOwnerAccessRoleId: string
) {
  if (
    process.env.RWOS_ENV !== "staging" ||
    process.env.QA_RESET_MANIFEST_REGISTRATION_CONFIRMATION !==
      "register-approved-synthetic-staging-manifest"
  ) {
    throw new Error("QA_RESET_MANIFEST_REGISTRATION_DENIED");
  }
  const ownershipId = deterministicUuid(`ownership:${manifest.namespace}:${manifest.checksum}`);
  const principalDigest = createHash("sha256")
    .update(`staging-manifest-registration:${manifest.checksum}`)
    .digest("hex");

  return client.$transaction(async (transaction) => {
    await transaction.$queryRawUnsafe(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))::text",
      `qa-reset:manifest-registration:${manifest.namespace}`
    );
    const role = await transaction.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id::text
         FROM access_role_definitions
        WHERE id = $1::uuid AND key = 'ORGANIZATION_OWNER'
          AND scope = 'organization' AND status = 'active'`,
      organizationOwnerAccessRoleId
    );
    if (role.length !== 1) throw new Error("QA_RESET_OWNER_ROLE_NOT_READY");

    const existing = await transaction.$queryRawUnsafe<
      Array<{ id: string; manifest_checksum: string; release_sha: string; status: string }>
    >(
      `SELECT id::text, manifest_checksum, release_sha, status
         FROM qa_reset_manifest_ownership
        WHERE namespace = $1
        FOR UPDATE`,
      manifest.namespace
    );
    if (existing.length > 0) {
      const exact = existing.filter(
        (row) =>
          row.id === ownershipId &&
          row.manifest_checksum === manifest.checksum &&
          row.release_sha === manifest.releaseSha &&
          ["approved", "active"].includes(row.status)
      );
      if (existing.length !== 1 || exact.length !== 1) {
        throw new Error("QA_RESET_MANIFEST_REGISTRATION_CONFLICT");
      }
      const counts = await registrationCounts(transaction, ownershipId);
      if (counts.tenants !== manifest.tenantIds.length || counts.records !== manifest.records.length) {
        throw new Error("QA_RESET_MANIFEST_REGISTRATION_PARTIAL");
      }
      return { registered: true as const, idempotent: true as const, ownershipId };
    }

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
  });
}

async function registrationCounts(
  transaction: Parameters<Parameters<RegistrationClient["$transaction"]>[0]>[0],
  ownershipId: string
) {
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
