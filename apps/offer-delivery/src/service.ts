import { createHash } from "node:crypto";
import {
  maximumAttempts,
  retentionDays,
  retryScheduleSeconds,
  type OfferDeliveryConfig
} from "./config";
import type { DeliveryManifest, SyntheticDeliveryRecord } from "./manifest";
import {
  DeliveryStateUnavailableError,
  type DurableDeliveryTransactionStore
} from "./durableStore";
import type { DeliveryResponse, IdempotencyRecord } from "./store";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const operation = "worker-offers:deliver";

export class DeliveryRequestError extends Error {
  constructor(
    readonly status: 400 | 403 | 404 | 409 | 503,
    readonly code:
      | "RWOS_DELIVERY_REQUEST_INVALID"
      | "RWOS_DELIVERY_ACCESS_DENIED"
      | "RWOS_DELIVERY_UNAVAILABLE"
      | "RWOS_DELIVERY_IDEMPOTENCY_CONFLICT",
    readonly auditEvent: "denial" | "expiration" | "idempotency_conflict" = "denial"
  ) {
    super(code);
  }
}

export type DeliveryOutcome = Readonly<{
  response: DeliveryResponse;
  audit: Readonly<{
    event: "accepted" | "retry" | "duplicate_suppressed" | "status_transition";
    attempt: number;
    cleanupCount: number;
    deliveryRecordHash: string;
    idempotencyHash: string;
    scenario: string;
  }>;
}>;

export function createOfferDeliveryService(options: {
  config: OfferDeliveryConfig;
  manifest: DeliveryManifest;
  store: DurableDeliveryTransactionStore;
  now?: () => Date;
  idempotencyKeyDigest?: (key: string) => string;
}) {
  const now = options.now ?? (() => new Date());
  return {
    async deliver(
      input: unknown,
      tenantContext: string,
      idempotencyKey: string
    ): Promise<DeliveryOutcome> {
      const request = parseRequest(input);
      authorizeTenant(options.config, request.organizationId, tenantContext);
      validateIdempotencyKey(idempotencyKey, request.workerOfferId);
      const at = now();
      const normalized = JSON.stringify({
        operation,
        organizationId: request.organizationId,
        workerOfferId: request.workerOfferId,
        workerIdentityId: request.workerIdentityId
      });
      const requestDigest = digest(normalized);
      const idempotencyKeyDigest = options.idempotencyKeyDigest
        ? options.idempotencyKeyDigest(idempotencyKey)
        : digest(idempotencyKey);
      if (!/^[a-f0-9]{64}$/.test(idempotencyKeyDigest)) throw unavailableState();
      const manifestChecksum = digest(
        JSON.stringify(
          [...options.manifest.records.values()]
            .map((item) => ({
              organizationId: item.organizationId,
              workerOfferId: item.workerOfferId,
              workerIdentityId: item.workerIdentityId,
              scenario: item.scenario
            }))
            .sort((left, right) => left.workerOfferId.localeCompare(right.workerOfferId))
        )
      );
      const termsVersionId = idempotencyKey.split(":").at(-1)!;
      const scopedKey = [
        options.config.environment,
        "v1",
        options.config.releaseSha,
        manifestChecksum,
        request.organizationId,
        "api",
        operation,
        idempotencyKeyDigest
      ].join(":");
      const record = options.manifest.records.get(request.workerOfferId);
      if (
        !record ||
        record.organizationId !== request.organizationId
      ) {
        throw unavailable();
      }
      authorizeRecord(record, at);
      let transaction;
      try {
        transaction = await options.store.transact({
          environment: options.config.environment,
          contractVersion: "v1",
          releaseSha: options.config.releaseSha,
          manifestChecksum,
          tenantId: request.organizationId,
          callerAlias: "api",
          operation,
          idempotencyKeyDigest,
          scopedKey,
          requestDigest,
          workerOfferId: request.workerOfferId,
          termsVersionId,
          workerIdentityId: request.workerIdentityId,
          simulationScenario: record?.scenario ?? "unknown",
          now: at,
          retentionBefore: at,
          retainUntil: new Date(at.getTime() + retentionDays * 24 * 60 * 60 * 1000),
          transition(existing) {
            if (record.workerIdentityId !== request.workerIdentityId) {
              throw unavailable();
            }
            authorizeRecord(record, at);
            const result = existing
              ? replay(record, existing.value, at)
              : firstAttempt(record, requestDigest, at);
            return {
              state: result.record.response.retryable ? "retryable" : "terminal",
              value: result.record,
              result
            };
          }
        });
      } catch (error) {
        if (error instanceof DeliveryStateUnavailableError) throw unavailableState();
        throw error;
      }
      if (transaction.status === "conflict") {
        throw new DeliveryRequestError(
          409,
          "RWOS_DELIVERY_IDEMPOTENCY_CONFLICT",
          "idempotency_conflict"
        );
      }
      const result = transaction.value;
      return {
        response: result.record.response,
        audit: {
          event: result.event,
          attempt: result.record.attempts.length,
          cleanupCount: transaction.cleanupCount,
          deliveryRecordHash: digest(request.workerOfferId).slice(0, 24),
          idempotencyHash: digest(idempotencyKey).slice(0, 24),
          scenario: record.scenario
        }
      };
    }
  };
}

function firstAttempt(
  manifest: SyntheticDeliveryRecord,
  requestDigest: string,
  at: Date
): { record: IdempotencyRecord; event: DeliveryOutcome["audit"]["event"] } {
  const response = responseFor(manifest, 1);
  return {
    record: {
      requestDigest,
      createdAt: at,
      updatedAt: at,
      nextAttemptAt: nextAttemptAt(manifest, 1, at, response),
      attempts: [{ attempt: 1, at, response }],
      response
    },
    event: "accepted"
  };
}

function replay(
  manifest: SyntheticDeliveryRecord,
  record: IdempotencyRecord,
  at: Date
): { record: IdempotencyRecord; event: DeliveryOutcome["audit"]["event"] } {
  if (
    !record.response.retryable ||
    !record.nextAttemptAt ||
    at < record.nextAttemptAt ||
    record.attempts.length >= maximumAttempts
  ) {
    return { record, event: "duplicate_suppressed" };
  }
  const attempt = record.attempts.length + 1;
  const response = responseFor(manifest, attempt);
  record.attempts.push({ attempt, at, response });
  record.response = response;
  record.updatedAt = at;
  record.nextAttemptAt = nextAttemptAt(manifest, attempt, at, response);
  return {
    record,
    event: response.status === "delivered" ? "status_transition" : "retry"
  };
}

function responseFor(record: SyntheticDeliveryRecord, attempt: number): DeliveryResponse {
  const providerReference = `syn-delivery-${digest(record.workerOfferId).slice(0, 24)}`;
  if (record.scenario === "temporary_failure_then_success") {
    return attempt < maximumAttempts
      ? { status: "failed", providerReference: null, retryable: true }
      : { status: "delivered", providerReference, retryable: false };
  }
  if (record.scenario === "permanent_failure") {
    return { status: "failed", providerReference: null, retryable: false };
  }
  if (record.scenario === "immediate_success") {
    return { status: "sent", providerReference, retryable: false };
  }
  return { status: "delivered", providerReference, retryable: false };
}

function nextAttemptAt(
  manifest: SyntheticDeliveryRecord,
  attempt: number,
  at: Date,
  response: DeliveryResponse
) {
  if (
    manifest.scenario !== "temporary_failure_then_success" ||
    !response.retryable ||
    attempt >= maximumAttempts
  ) {
    return null;
  }
  return new Date(at.getTime() + retryScheduleSeconds[attempt - 1]! * 1000);
}

function parseRequest(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw invalid();
  const record = input as Record<string, unknown>;
  if (Object.keys(record).sort().join(",") !== "organizationId,workerIdentityId,workerOfferId") {
    throw invalid();
  }
  return {
    organizationId: uuid(record.organizationId),
    workerOfferId: uuid(record.workerOfferId),
    workerIdentityId: uuid(record.workerIdentityId)
  };
}

function authorizeTenant(
  config: OfferDeliveryConfig,
  organizationId: string,
  tenantContext: string
) {
  if (
    organizationId !== tenantContext ||
    !config.tenants.some((tenant) => tenant.organizationId === organizationId)
  ) {
    throw new DeliveryRequestError(403, "RWOS_DELIVERY_ACCESS_DENIED");
  }
}

function authorizeRecord(record: SyntheticDeliveryRecord, at: Date) {
  if (new Date(record.expiresAt) <= at) {
    throw new DeliveryRequestError(404, "RWOS_DELIVERY_UNAVAILABLE", "expiration");
  }
  if (!record.synthetic || !record.organizationActive || !record.recipientActive) {
    throw unavailable();
  }
}

function validateIdempotencyKey(value: string, workerOfferId: string) {
  if (
    value.length < 1 ||
    value.length > 200 ||
    !new RegExp(
      `^worker-offer:${escapeRegex(workerOfferId)}:terms:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`,
      "i"
    ).test(value)
  ) {
    throw invalid();
  }
}

function uuid(value: unknown) {
  if (typeof value !== "string" || !uuidPattern.test(value)) throw invalid();
  return value;
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function invalid() {
  return new DeliveryRequestError(400, "RWOS_DELIVERY_REQUEST_INVALID");
}

function unavailable() {
  return new DeliveryRequestError(404, "RWOS_DELIVERY_UNAVAILABLE");
}

function unavailableState() {
  return new DeliveryRequestError(503, "RWOS_DELIVERY_UNAVAILABLE");
}
