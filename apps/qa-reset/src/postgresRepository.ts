import { randomUUID } from "node:crypto";
import {
  checksumValue,
  ownedEntityTypes,
  type ManifestRecord,
  type OwnedEntityType,
  type ResetManifest
} from "./manifest";
import {
  createExactMutationPlan,
  createScopedExactMutationPlan,
  exactMutationPlanChecksum
} from "./mutationPlan";
import type { RepositorySnapshot } from "./repository";

export type SqlResult<Row extends Record<string, unknown> = Record<string, unknown>> = Readonly<{
  rows: readonly Row[];
  rowCount: number;
}>;

export type SqlConnection = Readonly<{
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    parameters?: readonly unknown[]
  ): Promise<SqlResult<Row>>;
}>;

export type SqlTransactionExecutor = SqlConnection &
  Readonly<{
    transaction<T>(work: (connection: SqlConnection) => Promise<T>): Promise<T>;
  }>;

const exactMutationPolicy = Symbol("rwos.qa-reset.exact-mutation-policy");

type ExactRecordMutatorImplementation = Readonly<{
  prepare(connection: SqlConnection, record: ManifestRecord): Promise<number>;
  cleanup(connection: SqlConnection, record: ManifestRecord): Promise<number>;
}>;

export type ExactRecordMutator = ExactRecordMutatorImplementation &
  Readonly<{
    supportedEntityTypes: readonly OwnedEntityType[];
    [exactMutationPolicy]: true;
  }>;

export function createExactRecordMutator(
  implementation: ExactRecordMutatorImplementation,
  supportedEntityTypes: readonly OwnedEntityType[]
): ExactRecordMutator {
  if (
    JSON.stringify([...supportedEntityTypes].sort()) !==
    JSON.stringify([...ownedEntityTypes].sort())
  ) {
    throw new QaResetPersistenceConflictError();
  }
  return {
    prepare: (connection, record) => implementation.prepare(connection, record),
    cleanup: (connection, record) => implementation.cleanup(connection, record),
    supportedEntityTypes: [...supportedEntityTypes],
    [exactMutationPolicy]: true
  };
}

export type DurableResetOperation = "prepare" | "cleanup";

export type DurableResetRequest = Readonly<{
  operation: DurableResetOperation;
  scope: "browser" | "ios" | "android" | "manual_qa";
  manifest: ResetManifest;
  tenantIds: readonly string[];
  callerAlias: string;
  callerPrincipalDigest: string;
  approvalReference: string;
  correlationId: string;
  idempotencyDigest: string;
  planChecksum: string;
  mutationPlanChecksum: string;
  retentionUntil: Date;
}>;

export type DurableResetResult = Readonly<{
  status: "succeeded" | "cleanup_completed";
  receipt: string;
  affectedCount: number;
  idempotent: boolean;
}>;

type ManifestOwnershipRow = Readonly<{
  id: string;
  manifest_checksum: string;
  namespace: string;
  environment: string;
  project_id: string;
  cluster_id: string;
  database_id: string;
  authority_id: string;
  release_sha: string;
  status: string;
  expires_at: Date | string;
}>;

type ControlRunRow = Readonly<{
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
}>;

export class QaResetPersistenceConflictError extends Error {
  constructor() {
    super("RWOS_QA_RESET_PERSISTENCE_CONFLICT");
  }
}

export class QaResetUnknownOutcomeError extends Error {
  constructor() {
    super("RWOS_QA_RESET_UNKNOWN_OUTCOME");
  }
}

export class UnknownTransactionOutcomeError extends Error {
  constructor() {
    super("RWOS_SQL_TRANSACTION_OUTCOME_UNKNOWN");
  }
}

export class PostgresQaResetRepository {
  constructor(
    private readonly executor: SqlTransactionExecutor,
    private readonly mutator: ExactRecordMutator,
    private readonly now: () => Date = () => new Date()
  ) {
    if (mutator[exactMutationPolicy] !== true) throw new QaResetPersistenceConflictError();
  }

  async inspect(manifest: ResetManifest): Promise<RepositorySnapshot> {
    const ownerships = await this.executor.query<{
      id: string;
      manifest_reference: string;
      manifest_checksum: string;
      namespace: string;
      environment: string;
      project_id: string;
      cluster_id: string;
      database_id: string;
      authority_id: string;
      release_sha: string;
      status: string;
      expires_at: Date | string;
    }>(
      `/* qa-reset:manifest-inspect */
       SELECT id, manifest_reference, manifest_checksum, namespace, environment, project_id,
              cluster_id, database_id, authority_id, release_sha, status, expires_at
         FROM qa_reset_manifest_ownership
        WHERE namespace = $1
        ORDER BY id`,
      [manifest.namespace]
    );
    const current = ownerships.rows.filter(
      (row) =>
        row.manifest_reference === manifest.manifestId &&
        row.manifest_checksum === manifest.checksum
    );
    if (current.length !== 1) throw new QaResetPersistenceConflictError();
    const ownership = current[0]!;
    if (
      ownership.namespace !== manifest.namespace ||
      ownership.environment !== "staging" ||
      ownership.project_id !== manifest.projectId ||
      ownership.cluster_id !== manifest.clusterId ||
      ownership.database_id !== manifest.databaseId ||
      ownership.authority_id !== manifest.authorityId ||
      ownership.release_sha !== manifest.releaseSha ||
      !["approved", "active"].includes(ownership.status) ||
      new Date(ownership.expires_at).getTime() <= this.now().getTime()
    ) {
      throw new QaResetPersistenceConflictError();
    }
    const tenants = await this.executor.query<{ tenant_id: string }>(
      `/* qa-reset:tenants */
       SELECT tenant_id
         FROM qa_reset_manifest_tenants
        WHERE manifest_id = $1
        ORDER BY tenant_id`,
      [ownership.id]
    );
    if (
      JSON.stringify(tenants.rows.map(({ tenant_id }) => tenant_id).sort()) !==
      JSON.stringify([...manifest.tenantIds].sort())
    ) {
      throw new QaResetPersistenceConflictError();
    }
    const manifestOwnedIds = await inspectOwnedRecords(this.executor, ownership.id);
    const foreignIdsInNamespace: string[] = [];
    for (const ownership of ownerships.rows) {
      if (ownership.id === current[0]!.id) continue;
      foreignIdsInNamespace.push(...(await inspectOwnedRecords(this.executor, ownership.id)));
    }
    return {
      manifestOwnedIds: manifestOwnedIds.sort(),
      foreignIdsInNamespace: foreignIdsInNamespace.sort(),
      unrelatedIds: []
    };
  }

  async execute(request: DurableResetRequest): Promise<DurableResetResult> {
    validateRequest(request, this.now());
    try {
      return await this.executor.transaction(async (connection) => {
        await acquireManifestLock(connection, request.manifest);
        const ownership = await readAndVerifyManifest(connection, request, this.now());
        const existing = await readControlRun(connection, request.idempotencyDigest);
        if (existing) return terminalResult(existing, request, ownership.id);

        const transactionTime = this.now();
        const controlRunId = await createRunningControl(
          connection,
          ownership.id,
          request,
          transactionTime
        );
        let affectedCount = 0;
        for (const record of scopedRecords(request)) {
          await authorizeOwnedRecord(connection, ownership.id, request, record, transactionTime);
          const affected =
            request.operation === "prepare"
              ? await this.mutator.prepare(connection, record)
              : await this.mutator.cleanup(connection, record);
          if (affected !== 1) throw new QaResetPersistenceConflictError();
          affectedCount += affected;
          await updateOwnedRecord(connection, ownership.id, request, record, transactionTime);
        }

        const receipt = resultReceipt(request, affectedCount);
        const status = request.operation === "prepare" ? "succeeded" : "cleanup_completed";
        const completed = await connection.query(
          `/* qa-reset:complete-control */
           UPDATE qa_reset_control_runs
              SET status = $2, result_receipt = $3, observed_record_count = $4,
                  completed_at = $5, updated_at = $5, version = version + 1
            WHERE id = $1 AND status = 'running'`,
          [controlRunId, status, receipt, affectedCount, transactionTime]
        );
        if (completed.rowCount !== 1) throw new QaResetPersistenceConflictError();
        await appendEvent(
          connection,
          controlRunId,
          request,
          status,
          affectedCount,
          transactionTime
        );
        return { status, receipt, affectedCount, idempotent: false };
      });
    } catch (error) {
      if (!(error instanceof UnknownTransactionOutcomeError)) throw error;
      return this.reconcileUnknownOutcome(request);
    }
  }

  private async reconcileUnknownOutcome(request: DurableResetRequest): Promise<DurableResetResult> {
    try {
      return await this.executor.transaction(async (connection) => {
        await acquireManifestLock(connection, request.manifest);
        const ownership = await readAndVerifyManifest(connection, request, this.now());
        const existing = await readControlRun(connection, request.idempotencyDigest);
        if (!existing) throw new QaResetUnknownOutcomeError();
        return terminalResult(existing, request, ownership.id);
      });
    } catch {
      throw new QaResetUnknownOutcomeError();
    }
  }
}

async function authorizeOwnedRecord(
  connection: SqlConnection,
  manifestId: string,
  request: DurableResetRequest,
  record: ManifestRecord,
  transactionTime: Date
) {
  const result = await connection.query<{ lifecycle_status: string }>(
    `/* qa-reset:owned-record-authorize */
     SELECT owned.lifecycle_status
       FROM qa_reset_owned_records AS owned
       JOIN qa_reset_manifest_ownership AS manifest ON manifest.id = owned.manifest_id
      WHERE owned.manifest_id = $1 AND owned.tenant_id = $2 AND owned.namespace = $3
        AND owned.entity_type = $4 AND owned.target_record_id = $5
        AND owned.manifest_record_key = $6 AND manifest.manifest_reference = $7
        AND manifest.manifest_checksum = $8 AND manifest.release_sha = $9
        AND manifest.environment = 'staging' AND manifest.status IN ('approved', 'active')
        AND manifest.expires_at > $10
      FOR UPDATE`,
    [
      manifestId,
      record.tenantId,
      record.namespace,
      record.entityType,
      record.recordId,
      record.manifestRecordKey,
      request.manifest.manifestId,
      request.manifest.checksum,
      request.manifest.releaseSha,
      transactionTime
    ]
  );
  const lifecycle = result.rows[0]?.lifecycle_status;
  const allowed = ["declared", "prepared", "verified"].includes(lifecycle ?? "");
  if (result.rowCount !== 1 || !allowed) throw new QaResetPersistenceConflictError();
}

async function inspectOwnedRecords(connection: SqlConnection, manifestId: string) {
  const result = await connection.query<{
    target_record_id: string;
    lifecycle_status: string;
  }>(
    `/* qa-reset:owned-records-inspect */
     SELECT target_record_id, lifecycle_status
       FROM qa_reset_owned_records
      WHERE manifest_id = $1
      ORDER BY target_record_id`,
    [manifestId]
  );
  if (
    result.rows.some(
      ({ lifecycle_status }) =>
        !["declared", "prepared", "verified", "cleaned"].includes(lifecycle_status)
    )
  ) {
    throw new QaResetPersistenceConflictError();
  }
  return result.rows
    .filter(({ lifecycle_status }) => ["prepared", "verified"].includes(lifecycle_status))
    .map(({ target_record_id }) => target_record_id);
}

async function acquireManifestLock(connection: SqlConnection, manifest: ResetManifest) {
  await connection.query(
    `/* qa-reset:advisory-lock */
     SELECT pg_advisory_xact_lock(hashtextextended($1, 0))::text AS lock_result`,
    [`${manifest.clusterId}:${manifest.checksum}`]
  );
}

async function readAndVerifyManifest(
  connection: SqlConnection,
  request: DurableResetRequest,
  now: Date
) {
  const result = await connection.query<ManifestOwnershipRow>(
    `/* qa-reset:manifest */
     SELECT id, manifest_checksum, namespace, environment, project_id, cluster_id, database_id,
            authority_id, release_sha, status, expires_at
       FROM qa_reset_manifest_ownership
      WHERE manifest_reference = $1
      FOR UPDATE`,
    [request.manifest.manifestId]
  );
  if (result.rowCount !== 1 || !result.rows[0]) throw new QaResetPersistenceConflictError();
  const row = result.rows[0];
  if (
    row.manifest_checksum !== request.manifest.checksum ||
    row.namespace !== request.manifest.namespace ||
    row.environment !== "staging" ||
    row.project_id !== request.manifest.projectId ||
    row.cluster_id !== request.manifest.clusterId ||
    row.database_id !== request.manifest.databaseId ||
    row.authority_id !== request.manifest.authorityId ||
    row.release_sha !== request.manifest.releaseSha ||
    !["approved", "active"].includes(row.status) ||
    new Date(row.expires_at).getTime() <= now.getTime()
  ) {
    throw new QaResetPersistenceConflictError();
  }
  const tenants = await connection.query<{ tenant_id: string }>(
    `/* qa-reset:tenants */
     SELECT tenant_id
       FROM qa_reset_manifest_tenants
      WHERE manifest_id = $1
      ORDER BY tenant_id`,
    [row.id]
  );
  const expected = [...request.manifest.tenantIds].sort();
  const actual = tenants.rows.map(({ tenant_id }) => tenant_id).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new QaResetPersistenceConflictError();
  }
  return row;
}

async function readControlRun(connection: SqlConnection, digest: string) {
  const result = await connection.query<ControlRunRow>(
    `/* qa-reset:control */
     SELECT id, manifest_id, operation, scope, caller_alias, caller_principal_digest,
            approval_reference, status, result_receipt, observed_record_count, plan_checksum
       FROM qa_reset_control_runs
      WHERE idempotency_digest = $1
      FOR UPDATE`,
    [digest]
  );
  if (result.rowCount > 1) throw new QaResetPersistenceConflictError();
  return result.rows[0] ?? null;
}

function terminalResult(
  row: ControlRunRow,
  request: DurableResetRequest,
  manifestOwnershipId: string
): DurableResetResult {
  const expectedStatus = request.operation === "prepare" ? "succeeded" : "cleanup_completed";
  if (
    row.status !== expectedStatus ||
    row.manifest_id !== manifestOwnershipId ||
    row.operation !== request.operation ||
    row.scope !== request.scope ||
    row.caller_alias !== request.callerAlias ||
    row.caller_principal_digest !== request.callerPrincipalDigest ||
    row.approval_reference !== request.approvalReference ||
    !row.result_receipt ||
    row.observed_record_count === null ||
    row.plan_checksum !== request.planChecksum
  ) {
    throw new QaResetPersistenceConflictError();
  }
  return {
    status: expectedStatus,
    receipt: row.result_receipt,
    affectedCount: row.observed_record_count,
    idempotent: true
  };
}

async function createRunningControl(
  connection: SqlConnection,
  manifestId: string,
  request: DurableResetRequest,
  transactionTime: Date
) {
  const id = randomUUID();
  const result = await connection.query(
    `/* qa-reset:create-control */
     INSERT INTO qa_reset_control_runs
       (id, manifest_id, operation, scope, idempotency_digest, plan_checksum, caller_alias,
        caller_principal_digest, approval_reference, correlation_id, status,
        expected_record_count, retention_until, started_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'running',
             $11, $12, $13, $13, $13)`,
    [
      id,
      manifestId,
      request.operation,
      request.scope,
      request.idempotencyDigest,
      request.planChecksum,
      request.callerAlias,
      request.callerPrincipalDigest,
      request.approvalReference,
      request.correlationId,
      scopedRecords(request).length,
      request.retentionUntil,
      transactionTime
    ]
  );
  if (result.rowCount !== 1) throw new QaResetPersistenceConflictError();
  return id;
}

async function updateOwnedRecord(
  connection: SqlConnection,
  manifestId: string,
  request: DurableResetRequest,
  record: ManifestRecord,
  transactionTime: Date
) {
  const retainedEvidence =
    request.operation === "cleanup" &&
    ["audit_actor_reference", "audit_event"].includes(record.entityType);
  const status =
    request.operation === "prepare" ? "prepared" : retainedEvidence ? "verified" : "cleaned";
  const sql =
    request.operation === "prepare"
      ? `/* qa-reset:owned-record */
         UPDATE qa_reset_owned_records
            SET lifecycle_status = $7, prepared_at = $8, updated_at = $8
          WHERE manifest_id = $1 AND tenant_id = $2 AND namespace = $3
            AND entity_type = $4 AND target_record_id = $5 AND manifest_record_key = $6`
      : retainedEvidence
        ? `/* qa-reset:owned-record */
         UPDATE qa_reset_owned_records
            SET lifecycle_status = $7, verified_at = $8, updated_at = $8
          WHERE manifest_id = $1 AND tenant_id = $2 AND namespace = $3
            AND entity_type = $4 AND target_record_id = $5 AND manifest_record_key = $6`
        : `/* qa-reset:owned-record */
         UPDATE qa_reset_owned_records
            SET lifecycle_status = $7, cleaned_at = $8, updated_at = $8
          WHERE manifest_id = $1 AND tenant_id = $2 AND namespace = $3
            AND entity_type = $4 AND target_record_id = $5 AND manifest_record_key = $6`;
  const result = await connection.query(sql, [
    manifestId,
    record.tenantId,
    record.namespace,
    record.entityType,
    record.recordId,
    record.manifestRecordKey,
    status,
    transactionTime
  ]);
  if (result.rowCount !== 1) throw new QaResetPersistenceConflictError();
}

async function appendEvent(
  connection: SqlConnection,
  controlRunId: string,
  request: DurableResetRequest,
  status: DurableResetResult["status"],
  count: number,
  transactionTime: Date
) {
  const result = await connection.query(
    `/* qa-reset:event */
     INSERT INTO qa_reset_control_events
       (id, control_run_id, sequence, event_type, prior_status, new_status,
        caller_alias, caller_principal_digest, safe_count, created_at)
     VALUES ($1, $2, 1, $3, 'running', $4, $5, $6, $7, $8)`,
    [
      randomUUID(),
      controlRunId,
      status,
      status,
      request.callerAlias,
      request.callerPrincipalDigest,
      count,
      transactionTime
    ]
  );
  if (result.rowCount !== 1) throw new QaResetPersistenceConflictError();
}

function validateRequest(request: DurableResetRequest, now: Date) {
  const manifest = request.manifest;
  createExactMutationPlan(manifest, request.operation);
  if (
    manifest.namespace !== "rwos:qa-reset:staging:v1" ||
    manifest.tenantIds.length !== 2 ||
    new Date(manifest.expiresAt).getTime() <= now.getTime() ||
    request.retentionUntil.getTime() <= now.getTime() ||
    !/^[a-f0-9]{64}$/.test(request.idempotencyDigest) ||
    request.idempotencyDigest !== deriveQaResetIdempotencyDigest(request) ||
    !/^[a-f0-9]{64}$/.test(request.planChecksum) ||
    !/^[a-f0-9]{64}$/.test(request.mutationPlanChecksum) ||
    request.mutationPlanChecksum !==
      exactMutationPlanChecksum(manifest, request.operation, request.tenantIds) ||
    !/^[a-f0-9]{64}$/.test(request.callerPrincipalDigest) ||
    request.approvalReference !== manifest.approvalReferences[request.operation]
  ) {
    throw new QaResetPersistenceConflictError();
  }
  const allowedTenants = new Set(manifest.tenantIds);
  if (
    request.tenantIds.length === 0 ||
    request.tenantIds.some((tenantId) => !allowedTenants.has(tenantId)) ||
    scopedRecords(request).some(
      (record) =>
        !isUuid(record.recordId) ||
        record.namespace !== manifest.namespace ||
        !allowedTenants.has(record.tenantId)
    )
  ) {
    throw new QaResetPersistenceConflictError();
  }
}

export function deriveQaResetIdempotencyDigest(
  request: Omit<DurableResetRequest, "idempotencyDigest">
) {
  return checksumValue({
    manifestChecksum: request.manifest.checksum,
    releaseSha: request.manifest.releaseSha,
    operation: request.operation,
    scope: request.scope,
    callerAlias: request.callerAlias,
    callerPrincipalDigest: request.callerPrincipalDigest,
    approvalReference: request.approvalReference,
    planChecksum: request.planChecksum,
    mutationPlanChecksum: request.mutationPlanChecksum,
    tenantIds: [...request.tenantIds].sort()
  });
}

function scopedRecords(request: DurableResetRequest) {
  const recordsById = new Map(request.manifest.records.map((record) => [record.recordId, record]));
  return createScopedExactMutationPlan(request.manifest, request.operation, request.tenantIds).map(
    (step) => {
      const record = recordsById.get(step.recordId);
      if (!record) throw new QaResetPersistenceConflictError();
      return record;
    }
  );
}

function resultReceipt(request: DurableResetRequest, affectedCount: number) {
  return checksumValue({
    operation: request.operation,
    manifestChecksum: request.manifest.checksum,
    releaseSha: request.manifest.releaseSha,
    tenantIds: [...request.tenantIds].sort(),
    idempotencyDigest: request.idempotencyDigest,
    planChecksum: request.planChecksum,
    affectedCount
  });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
