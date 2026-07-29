import { createHash, randomUUID } from "node:crypto";
import type { DeliveryResponse, IdempotencyRecord } from "./store";

export type DurableDeliveryState = "retryable" | "terminal" | "unknown";

export type DurableDeliveryRecord = Readonly<{
  tenantId: string;
  scopedKey: string;
  requestDigest: string;
  state: DurableDeliveryState;
  value: IdempotencyRecord;
  retainedUntil: Date;
}>;

export type DeliveryTransactionResult<T> =
  | Readonly<{ status: "committed"; value: T; cleanupCount: number }>
  | Readonly<{ status: "conflict"; cleanupCount: number }>;

export type DeliveryTransactionInput<T> = Readonly<{
  environment: "staging" | "test";
  contractVersion: string;
  releaseSha: string;
  manifestChecksum: string;
  tenantId: string;
  callerAlias: string;
  operation: string;
  idempotencyKeyDigest: string;
  requestDigest: string;
  workerOfferId: string;
  termsVersionId: string;
  workerIdentityId: string;
  simulationScenario: string;
  scopedKey: string;
  now: Date;
  retentionBefore: Date;
  retainUntil: Date;
  transition(existing: DurableDeliveryRecord | null): Readonly<{
    state: DurableDeliveryState;
    value: IdempotencyRecord;
    result: T;
  }>;
}>;

/**
 * Transaction boundary expected from a PostgreSQL implementation.
 *
 * The implementation must lock the tenant/scoped-key row, compare the digest,
 * append attempts and update lifecycle state in one transaction. Cleanup may
 * remove only terminal records older than retentionBefore. Unknown outcomes
 * are retained for operator recovery and must never be replayed automatically.
 */
export interface DurableDeliveryTransactionStore {
  ready(): Promise<boolean>;
  transact<T>(input: DeliveryTransactionInput<T>): Promise<DeliveryTransactionResult<T>>;
}

export class DeliveryStateUnavailableError extends Error {
  constructor() {
    super("RWOS_DELIVERY_STATE_UNAVAILABLE");
  }
}

/** Controlled fake for local tests. Sharing one instance simulates replicas. */
export class ControlledDurableDeliveryStore implements DurableDeliveryTransactionStore {
  readonly #records = new Map<string, DurableDeliveryRecord>();
  #available = true;
  #queue: Promise<void> = Promise.resolve();

  setAvailable(available: boolean) {
    this.#available = available;
  }

  seed(record: DurableDeliveryRecord) {
    this.#records.set(record.scopedKey, record);
  }

  get(scopedKey: string) {
    return this.#records.get(scopedKey) ?? null;
  }

  size() {
    return this.#records.size;
  }

  async ready() {
    return this.#available;
  }

  async transact<T>(input: DeliveryTransactionInput<T>): Promise<DeliveryTransactionResult<T>> {
    let release!: () => void;
    const previous = this.#queue;
    this.#queue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      if (!this.#available) throw new DeliveryStateUnavailableError();
      let cleanupCount = 0;
      for (const [key, record] of this.#records) {
        if (record.state === "terminal" && record.retainedUntil < input.retentionBefore) {
          this.#records.delete(key);
          cleanupCount += 1;
        }
      }
      const existing = this.#records.get(input.scopedKey) ?? null;
      if (
        existing &&
        (existing.tenantId !== input.tenantId || existing.requestDigest !== input.requestDigest)
      ) {
        return { status: "conflict", cleanupCount };
      }
      if (existing?.state === "unknown") {
        throw new DeliveryStateUnavailableError();
      }
      const transition = input.transition(existing);
      this.#records.set(input.scopedKey, {
        tenantId: input.tenantId,
        scopedKey: input.scopedKey,
        requestDigest: input.requestDigest,
        state: transition.state,
        value: transition.value,
        retainedUntil: input.retainUntil
      });
      return { status: "committed", value: transition.result, cleanupCount };
    } finally {
      release();
    }
  }
}

export type SqlQueryResult = Readonly<{
  rows: readonly Readonly<Record<string, unknown>>[];
  rowCount: number;
}>;

export interface SqlTransactionClient {
  query(sql: string, parameters: readonly unknown[]): Promise<SqlQueryResult>;
}

export interface SqlTransactionExecutor extends SqlTransactionClient {
  transaction<T>(work: (client: SqlTransactionClient) => Promise<T>): Promise<T>;
}

const readinessSql = `
SELECT COUNT(*)::int AS column_count
FROM information_schema.columns
WHERE table_schema = current_schema()
  AND (
    (table_name = 'synthetic_delivery_idempotency' AND column_name IN
      ('environment', 'release_sha', 'manifest_checksum', 'tenant_id', 'status', 'retention_until'))
    OR
    (table_name = 'synthetic_delivery_attempts' AND column_name IN
      ('idempotency_id', 'attempt_number', 'executed_at', 'response_status'))
  )
`.trim();
const cleanupSql = `
WITH expired AS (
  SELECT id
  FROM synthetic_delivery_idempotency
  WHERE environment = $1 AND release_sha = $2 AND manifest_checksum = $3
    AND status IN ('completed', 'failed_terminal', 'expired') AND retention_until < $4
  ORDER BY retention_until, id
  LIMIT $5
  FOR UPDATE SKIP LOCKED
),
deleted_attempts AS (
  DELETE FROM synthetic_delivery_attempts
  USING expired
  WHERE synthetic_delivery_attempts.idempotency_id = expired.id
)
DELETE FROM synthetic_delivery_idempotency
USING expired
WHERE synthetic_delivery_idempotency.id = expired.id
RETURNING synthetic_delivery_idempotency.id
`.trim();
const selectSql = `
SELECT id, environment, contract_version, release_sha, manifest_checksum, tenant_id, caller_alias,
       operation, idempotency_key_digest, request_digest, worker_offer_id, terms_version_id,
       worker_identity_id, status, provider_reference_digest, retryable, attempt_count,
       next_attempt_at, retention_until, created_at, updated_at, version
FROM synthetic_delivery_idempotency
WHERE environment = $1 AND contract_version = $2 AND release_sha = $3
  AND manifest_checksum = $4 AND tenant_id = $5 AND caller_alias = $6
  AND operation = $7 AND idempotency_key_digest = $8
FOR UPDATE
`.trim();
const selectAttemptsSql = `
SELECT attempt_number, executed_at, response_status, retryable, provider_reference_digest
FROM synthetic_delivery_attempts
WHERE idempotency_id = $1
ORDER BY attempt_number
`.trim();
const insertSql = `
INSERT INTO synthetic_delivery_idempotency
  (id, environment, contract_version, release_sha, manifest_checksum, tenant_id, caller_alias,
   operation, idempotency_key_digest, request_digest, worker_offer_id, terms_version_id,
   worker_identity_id, status, provider_reference_digest, retryable, attempt_count,
   next_attempt_at, terminal_at, retention_until, updated_at, version)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, 1)
RETURNING id
`.trim();
const updateSql = `
UPDATE synthetic_delivery_idempotency
SET status = $2, provider_reference_digest = $3, retryable = $4, attempt_count = $5,
    next_attempt_at = $6, terminal_at = $7, retention_until = $8, updated_at = $9,
    version = version + 1
WHERE id = $1 AND version = $10
RETURNING id
`.trim();
const insertAttemptSql = `
INSERT INTO synthetic_delivery_attempts
  (id, idempotency_id, attempt_number, eligible_at, executed_at, simulation_scenario,
   response_status, retryable, provider_reference_digest, result_category)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
ON CONFLICT (idempotency_id, attempt_number) DO NOTHING
RETURNING id
`.trim();

/** Concrete fixed-statement PostgreSQL adapter; the executor owns connections. */
export class PostgreSqlDeliveryTransactionStore implements DurableDeliveryTransactionStore {
  constructor(private readonly executor: SqlTransactionExecutor) {}

  async ready() {
    try {
      const result = await this.executor.query(readinessSql, []);
      return result.rowCount === 1 && result.rows[0]?.column_count === 10;
    } catch {
      return false;
    }
  }

  async transact<T>(input: DeliveryTransactionInput<T>): Promise<DeliveryTransactionResult<T>> {
    if (
      input.environment !== "staging" ||
      !/^[a-f0-9]{40}$/.test(input.releaseSha) ||
      !/^[a-f0-9]{64}$/.test(input.manifestChecksum) ||
      !/^[a-f0-9]{64}$/.test(input.idempotencyKeyDigest)
    ) {
      throw new DeliveryStateUnavailableError();
    }
    try {
      return await this.executor.transaction(async (client) => {
        const cleanup = await client.query(cleanupSql, [
          input.environment,
          input.releaseSha,
          input.manifestChecksum,
          input.retentionBefore,
          100
        ]);
        if (cleanup.rowCount < 0 || cleanup.rowCount > 100) throw new DeliveryStateUnavailableError();

        const selected = await client.query(selectSql, [
          input.environment,
          input.contractVersion,
          input.releaseSha,
          input.manifestChecksum,
          input.tenantId,
          input.callerAlias,
          input.operation,
          input.idempotencyKeyDigest
        ]);
        if (selected.rowCount > 1) throw new DeliveryStateUnavailableError();
        const attempts =
          selected.rowCount === 1 && typeof selected.rows[0]?.id === "string"
            ? await client.query(selectAttemptsSql, [selected.rows[0].id])
            : null;
        const existing =
          selected.rowCount === 1
            ? readSqlRecord(selected.rows[0], attempts?.rows ?? [], input.scopedKey)
            : null;
        if (
          existing &&
          (existing.tenantId !== input.tenantId || existing.requestDigest !== input.requestDigest)
        ) {
          return { status: "conflict", cleanupCount: cleanup.rowCount };
        }
        if (existing?.state === "unknown") throw new DeliveryStateUnavailableError();

        const transition = input.transition(existing);
        if (existing && sameStoredValue(existing, transition.state, transition.value)) {
          return {
            status: "committed",
            value: transition.result,
            cleanupCount: cleanup.rowCount
          };
        }

        const idempotencyId = existing
          ? await updateExisting(client, selected.rows[0], transition, input.retainUntil)
          : await insertNew(client, input, transition);
        const previousAttempts = existing?.value.attempts.length ?? 0;
        for (const attempt of transition.value.attempts.slice(previousAttempts)) {
          const inserted = await client.query(insertAttemptSql, [
            randomUUID(),
            idempotencyId,
            attempt.attempt,
            attempt.at,
            attempt.at,
            input.simulationScenario,
            attempt.response.status,
            attempt.response.retryable,
            optionalDigest(attempt.response.providerReference),
            attempt.response.status
          ]);
          if (inserted.rowCount !== 1) throw new DeliveryStateUnavailableError();
        }
        return {
          status: "committed",
          value: transition.result,
          cleanupCount: cleanup.rowCount
        };
      });
    } catch (error) {
      if (error instanceof DeliveryStateUnavailableError) throw error;
      throw new DeliveryStateUnavailableError();
    }
  }
}

async function insertNew<T>(
  client: SqlTransactionClient,
  input: DeliveryTransactionInput<T>,
  transition: ReturnType<DeliveryTransactionInput<T>["transition"]>
) {
  const inserted = await client.query(insertSql, [
    randomUUID(),
    input.environment,
    input.contractVersion,
    input.releaseSha,
    input.manifestChecksum,
    input.tenantId,
    input.callerAlias,
    input.operation,
    input.idempotencyKeyDigest,
    input.requestDigest,
    input.workerOfferId,
    input.termsVersionId,
    input.workerIdentityId,
    databaseStatus(transition.state, transition.value.response),
    optionalDigest(transition.value.response.providerReference),
    transition.value.response.retryable,
    transition.value.attempts.length,
    transition.value.nextAttemptAt,
    transition.state === "terminal" ? transition.value.updatedAt : null,
    input.retainUntil,
    transition.value.updatedAt
  ]);
  if (inserted.rowCount !== 1 || typeof inserted.rows[0]?.id !== "string") {
    throw new DeliveryStateUnavailableError();
  }
  return inserted.rows[0].id;
}

async function updateExisting<T>(
  client: SqlTransactionClient,
  row: Readonly<Record<string, unknown>> | undefined,
  transition: ReturnType<DeliveryTransactionInput<T>["transition"]>,
  retainUntil: Date
) {
  if (
    typeof row?.id !== "string" ||
    typeof row.version !== "number" ||
    !Number.isInteger(row.version)
  ) {
    throw new DeliveryStateUnavailableError();
  }
  const updated = await client.query(updateSql, [
    row.id,
    databaseStatus(transition.state, transition.value.response),
    optionalDigest(transition.value.response.providerReference),
    transition.value.response.retryable,
    transition.value.attempts.length,
    transition.value.nextAttemptAt,
    transition.state === "terminal" ? transition.value.updatedAt : null,
    retainUntil,
    transition.value.updatedAt,
    row.version
  ]);
  if (updated.rowCount !== 1 || updated.rows[0]?.id !== row.id) {
    throw new DeliveryStateUnavailableError();
  }
  return row.id;
}

function readSqlRecord(
  row: Readonly<Record<string, unknown>> | undefined,
  attemptRows: readonly Readonly<Record<string, unknown>>[],
  scopedKey: string
): DurableDeliveryRecord {
  const state = durableState(row?.status);
  const createdAt = dateValue(row?.created_at);
  const updatedAt = dateValue(row?.updated_at);
  const retainedUntil = dateValue(row?.retention_until);
  const nextAttemptAt = row?.next_attempt_at === null ? null : dateValue(row?.next_attempt_at);
  const providerReference =
    typeof row?.worker_offer_id === "string"
      ? verifiedSyntheticProviderReference(
          row.worker_offer_id,
          row.provider_reference_digest
        )
      : null;
  const attempts = attemptRows.flatMap((attempt) => {
    const at = dateValue(attempt.executed_at);
    const attemptProviderReference =
      attempt.provider_reference_digest === null
        ? null
        : providerReference &&
            attempt.provider_reference_digest === optionalDigest(providerReference)
          ? providerReference
          : undefined;
    const response = deliveryResponse({
      status: attempt.response_status,
      providerReference: attemptProviderReference,
      retryable: attempt.retryable
    });
    return Number.isInteger(attempt.attempt_number) && at && response
      ? [{ attempt: Number(attempt.attempt_number), at, response }]
      : [];
  });
  const response = attempts.at(-1)?.response ?? null;
  if (
    !row ||
    typeof row.tenant_id !== "string" ||
    typeof row.request_digest !== "string" ||
    !state ||
    !createdAt ||
    !updatedAt ||
    !retainedUntil ||
    (row.provider_reference_digest !== null && !providerReference) ||
    (row.next_attempt_at !== null && !nextAttemptAt) ||
    attempts.length !== attemptRows.length ||
    !response ||
    row.attempt_count !== attempts.length
  ) {
    throw new DeliveryStateUnavailableError();
  }
  return {
    tenantId: row.tenant_id,
    scopedKey,
    requestDigest: row.request_digest,
    state,
    value: {
      requestDigest: row.request_digest,
      createdAt,
      updatedAt,
      nextAttemptAt,
      attempts,
      response
    },
    retainedUntil
  };
}

function deliveryResponse(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const response = value as Record<string, unknown>;
  if (
    !["sent", "delivered", "failed"].includes(String(response.status)) ||
    (response.providerReference !== null && typeof response.providerReference !== "string") ||
    typeof response.retryable !== "boolean"
  ) {
    return null;
  }
  return {
    status: response.status as DeliveryResponse["status"],
    providerReference: response.providerReference as string | null,
    retryable: response.retryable
  };
}

function durableState(value: unknown): DurableDeliveryState | null {
  if (value === "retry_pending" || value === "claimed") return "retryable";
  if (value === "completed" || value === "failed_terminal" || value === "expired")
    return "terminal";
  if (value === "unknown" || value === "blocked") return "unknown";
  return null;
}

function databaseStatus(state: DurableDeliveryState, response: DeliveryResponse) {
  if (state === "unknown") return "unknown";
  if (state === "retryable") return "retry_pending";
  return response.status === "failed" ? "failed_terminal" : "completed";
}

function optionalDigest(value: string | null) {
  return value === null ? null : createHash("sha256").update(value).digest("hex");
}

function verifiedSyntheticProviderReference(workerOfferId: string, storedDigest: unknown) {
  if (storedDigest === null) return null;
  if (typeof storedDigest !== "string") return null;
  const reference = `syn-delivery-${createHash("sha256").update(workerOfferId).digest("hex").slice(0, 24)}`;
  return optionalDigest(reference) === storedDigest ? reference : null;
}

function dateValue(value: unknown) {
  const date = value instanceof Date ? value : typeof value === "string" ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
}

function sameStoredValue(
  existing: DurableDeliveryRecord,
  state: DurableDeliveryState,
  value: IdempotencyRecord
) {
  return (
    existing.state === state &&
    existing.value.attempts.length === value.attempts.length &&
    existing.value.updatedAt.getTime() === value.updatedAt.getTime() &&
    existing.value.response.status === value.response.status &&
    existing.value.response.retryable === value.response.retryable &&
    existing.value.response.providerReference === value.response.providerReference
  );
}
