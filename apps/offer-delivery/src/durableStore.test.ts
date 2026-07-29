import { describe, expect, it } from "vitest";
import {
  ControlledDurableDeliveryStore,
  DeliveryStateUnavailableError,
  PostgreSqlDeliveryTransactionStore,
  type DeliveryTransactionInput,
  type SqlQueryResult,
  type SqlTransactionClient,
  type SqlTransactionExecutor
} from "./durableStore";
import type { IdempotencyRecord } from "./store";

const now = new Date("2026-07-29T12:00:00.000Z");

describe("durable offer-delivery transaction contract", () => {
  it("serializes concurrent replicas and returns one terminal receipt", async () => {
    const store = new ControlledDurableDeliveryStore();
    let transitions = 0;
    const input = transaction("tenant-a", "key-a", "digest-a", (existing) => {
      if (existing) {
        return {
          state: existing.state,
          value: existing.value,
          result: existing.value.response
        };
      }
      transitions += 1;
      return terminal("receipt-a");
    });
    const [first, second] = await Promise.all([store.transact(input), store.transact(input)]);
    expect(first.status).toBe("committed");
    expect(second.status).toBe("committed");
    expect(transitions).toBe(1);
    expect(store.size()).toBe(1);
    expect(store.get("key-a")?.value.response.providerReference).toBe("receipt-a");
  });

  it("rejects digest conflicts and isolates tenant ownership", async () => {
    const store = new ControlledDurableDeliveryStore();
    await store.transact(transaction("tenant-a", "key-a", "digest-a", () => terminal("a")));
    await expect(
      store.transact(transaction("tenant-a", "key-a", "digest-b", () => terminal("b")))
    ).resolves.toMatchObject({ status: "conflict" });
    await expect(
      store.transact(transaction("tenant-b", "key-a", "digest-a", () => terminal("b")))
    ).resolves.toMatchObject({ status: "conflict" });
    expect(store.get("key-a")?.tenantId).toBe("tenant-a");
  });

  it("fails closed for outages and unknown outcomes until operator recovery", async () => {
    const store = new ControlledDurableDeliveryStore();
    store.setAvailable(false);
    await expect(
      store.transact(transaction("tenant-a", "key-a", "digest-a", () => terminal("a")))
    ).rejects.toBeInstanceOf(DeliveryStateUnavailableError);
    store.setAvailable(true);
    store.seed({
      tenantId: "tenant-a",
      scopedKey: "key-a",
      requestDigest: "digest-a",
      state: "unknown",
      value: record(null),
      retainedUntil: new Date("2026-08-29T12:00:00.000Z")
    });
    await expect(
      store.transact(transaction("tenant-a", "key-a", "digest-a", () => terminal("a")))
    ).rejects.toBeInstanceOf(DeliveryStateUnavailableError);
  });

  it("cleans expired terminal records but preserves unknown and retryable state", async () => {
    const store = new ControlledDurableDeliveryStore();
    for (const [key, state] of [
      ["terminal-old", "terminal"],
      ["unknown-old", "unknown"],
      ["retryable-old", "retryable"]
    ] as const) {
      store.seed({
        tenantId: "tenant-a",
        scopedKey: key,
        requestDigest: key,
        state,
        value: record(null),
        retainedUntil: new Date("2026-06-01T00:00:00.000Z")
      });
    }
    const result = await store.transact(
      transaction("tenant-a", "current", "current", () => terminal("current"))
    );
    expect(result).toMatchObject({ status: "committed", cleanupCount: 1 });
    expect(store.get("terminal-old")).toBeNull();
    expect(store.get("unknown-old")?.state).toBe("unknown");
    expect(store.get("retryable-old")?.state).toBe("retryable");
  });

  it("executes fixed PostgreSQL lock, insert, attempt and bounded-cleanup statements", async () => {
    const executor = new FakeSqlExecutor([
      result([], 0),
      result([], 0),
      result([{ id: "idempotency-1" }], 1),
      result([{ id: "attempt-1" }], 1)
    ]);
    const store = new PostgreSqlDeliveryTransactionStore(executor);
    await expect(store.ready()).resolves.toBe(true);
    const value = record("receipt");
    value.attempts.push({
      attempt: 1,
      at: now,
      response: value.response
    });
    await expect(
      store.transact(
        transaction("tenant-a", "key-a", "digest-a", () => ({
          state: "terminal",
          value,
          result: value.response
        }))
      )
    ).resolves.toMatchObject({ status: "committed", cleanupCount: 0 });
    const sql = executor.calls.map((call) => call.sql).join("\n");
    expect(sql).toContain("FOR UPDATE");
    expect(sql).toContain("FOR UPDATE SKIP LOCKED");
    expect(sql).toContain("LIMIT $5");
    expect(sql).toContain("environment = $1");
    expect(sql).toContain("release_sha = $2");
    expect(sql).toContain("manifest_checksum = $3");
    expect(sql).toContain("INSERT INTO synthetic_delivery_idempotency");
    expect(sql).toContain("INSERT INTO synthetic_delivery_attempts");
    expect(sql).toContain("manifest_checksum");
    expect(sql).toContain("idempotency_key_digest");
    expect(sql).not.toContain("scoped_key");
    expect(sql).not.toContain("lifecycle_state");
    expect(sql).not.toContain("value_json");
    expect(sql).not.toContain("retained_until");
    expect(sql).not.toContain("tenant-a");
    expect(executor.calls.flatMap((call) => call.parameters)).toContain("tenant-a");
  });

  it("replays terminal SQL state without update or attempt append", async () => {
    const executor = new FakeSqlExecutor([
      result([], 0),
      result([sqlRow("completed")], 1),
      result([sqlAttempt("delivered", false)], 1)
    ]);
    const store = new PostgreSqlDeliveryTransactionStore(executor);
    await store.transact(
      transaction("tenant-a", "key-a", "digest-a", (current) => ({
        state: current!.state,
        value: current!.value,
        result: current!.value.response
      }))
    );
    expect(executor.calls).toHaveLength(3);
    expect(executor.calls[1]?.sql).toContain("FOR UPDATE");
  });

  it("blocks SQL unknown state and rejects unsafe affected-row results", async () => {
    const unknown = new FakeSqlExecutor([
      result([], 0),
      result([sqlRow("unknown")], 1),
      result([sqlAttempt("failed", true)], 1)
    ]);
    await expect(
      new PostgreSqlDeliveryTransactionStore(unknown).transact(
        transaction("tenant-a", "key-a", "digest-a", () => terminal("a"))
      )
    ).rejects.toBeInstanceOf(DeliveryStateUnavailableError);
  });
});

class FakeSqlExecutor implements SqlTransactionExecutor {
  readonly calls: Array<{ sql: string; parameters: readonly unknown[] }> = [];

  constructor(private readonly responses: SqlQueryResult[]) {}

  async query(sql: string, parameters: readonly unknown[]) {
    if (sql.includes("information_schema.columns")) return result([{ column_count: 10 }], 1);
    return this.next(sql, parameters);
  }

  async transaction<T>(work: (client: SqlTransactionClient) => Promise<T>) {
    return work({ query: (sql, parameters) => this.next(sql, parameters) });
  }

  private async next(sql: string, parameters: readonly unknown[]) {
    this.calls.push({ sql, parameters });
    const response = this.responses.shift();
    if (!response) throw new Error("UNEXPECTED_SQL");
    return response;
  }
}

function result(rows: readonly Readonly<Record<string, unknown>>[], rowCount: number) {
  return { rows, rowCount };
}

function sqlRow(status: string) {
  return {
    id: "idempotency-1",
    tenant_id: "tenant-a",
    request_digest: "digest-a",
    worker_offer_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    status,
    provider_reference_digest: null,
    attempt_count: 1,
    next_attempt_at: null,
    retention_until: new Date("2026-08-29T12:00:00.000Z"),
    created_at: now,
    updated_at: now,
    version: 1
  };
}

function sqlAttempt(status: string, retryable: boolean) {
  return {
    attempt_number: 1,
    executed_at: now,
    response_status: status,
    retryable,
    provider_reference_digest: null
  };
}

function transaction<T>(
  tenantId: string,
  scopedKey: string,
  requestDigest: string,
  transition: DeliveryTransactionInput<T>["transition"]
): DeliveryTransactionInput<T> {
  return {
    environment: "staging",
    contractVersion: "v1",
    releaseSha: "a31fa96f52247bb684032c6a8d3d379c098c2603",
    manifestChecksum: "c".repeat(64),
    tenantId,
    callerAlias: "api",
    operation: "worker-offers:deliver",
    idempotencyKeyDigest: "d".repeat(64),
    scopedKey,
    requestDigest,
    workerOfferId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    termsVersionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    workerIdentityId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    simulationScenario: "immediate_success",
    now,
    retentionBefore: new Date("2026-07-01T00:00:00.000Z"),
    retainUntil: new Date("2026-08-29T12:00:00.000Z"),
    transition
  };
}

function terminal(providerReference: string) {
  const value = record(providerReference);
  return { state: "terminal" as const, value, result: value.response };
}

function record(providerReference: string | null): IdempotencyRecord {
  return {
    requestDigest: "digest",
    createdAt: now,
    updatedAt: now,
    nextAttemptAt: null,
    attempts: [],
    response: { status: "delivered" as const, providerReference, retryable: false }
  };
}
