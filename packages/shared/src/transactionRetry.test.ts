import { describe, expect, it } from "vitest";
import { fullJitterBackoffMs, isTransientTransactionConflict, withTransientConflictRetry } from "./transactionRetry";

const serializationFailure = () => Object.assign(new Error("Transaction failed due to a write conflict or a deadlock. Please retry your transaction"), { code: "P2034" });

describe("isTransientTransactionConflict", () => {
  it("recognises serialization failures and deadlocks however they are wrapped", () => {
    expect(isTransientTransactionConflict({ code: "P2034" })).toBe(true);
    expect(isTransientTransactionConflict({ code: "40001" })).toBe(true);
    expect(isTransientTransactionConflict({ code: "40P01" })).toBe(true);
    expect(isTransientTransactionConflict({ code: "P2010", meta: { code: "40001" } })).toBe(true);
    expect(isTransientTransactionConflict({ name: "DriverAdapterError", cause: { kind: "postgres", originalCode: "40P01" } })).toBe(true);
    expect(isTransientTransactionConflict({ meta: { driverAdapterError: { cause: { kind: "TransactionWriteConflict" } } } })).toBe(true);
    expect(isTransientTransactionConflict(new Error("could not serialize access due to read/write dependencies among transactions"))).toBe(true);
    expect(isTransientTransactionConflict(new Error("deadlock detected"))).toBe(true);
  });

  it("does not treat real failures as transient", () => {
    expect(isTransientTransactionConflict({ code: "P2002" })).toBe(false); // unique violation: a real lost race
    expect(isTransientTransactionConflict({ code: "23505" })).toBe(false);
    expect(isTransientTransactionConflict(new Error("null value in column"))).toBe(false);
    expect(isTransientTransactionConflict(null)).toBe(false);
    expect(isTransientTransactionConflict("40001")).toBe(false);
  });

  it("stops on a self-referencing cause chain", () => {
    const loop: Record<string, unknown> = { code: "XX000" };
    loop.cause = loop;
    expect(isTransientTransactionConflict(loop)).toBe(false);
  });
});

describe("fullJitterBackoffMs", () => {
  it("is a random wait below an exponentially growing, capped ceiling", () => {
    expect(fullJitterBackoffMs(0, 10, 250, () => 0.999)).toBe(9);
    expect(fullJitterBackoffMs(1, 10, 250, () => 0.999)).toBe(19);
    expect(fullJitterBackoffMs(3, 10, 250, () => 0.999)).toBe(79);
    expect(fullJitterBackoffMs(10, 10, 250, () => 0.999)).toBe(249); // capped
    expect(fullJitterBackoffMs(4, 10, 250, () => 0)).toBe(0);
  });

  it("spreads two colliding callers apart instead of waiting in lockstep", () => {
    const waits = new Set(Array.from({ length: 50 }, () => fullJitterBackoffMs(3, 10, 250)));
    expect(waits.size).toBeGreaterThan(1);
  });
});

describe("withTransientConflictRetry", () => {
  const noSleep = { sleep: async () => {}, random: () => 0.5 };

  it("returns the first successful result without retrying", async () => {
    let calls = 0;
    await expect(withTransientConflictRetry(async () => { calls += 1; return "ok"; }, noSleep)).resolves.toBe("ok");
    expect(calls).toBe(1);
  });

  it("re-runs the whole operation after a serialization failure and returns its result", async () => {
    const attempts: number[] = [];
    const result = await withTransientConflictRetry(async (attempt) => {
      attempts.push(attempt);
      if (attempt < 3) throw serializationFailure();
      return attempt;
    }, noSleep);
    expect(result).toBe(3);
    expect(attempts).toEqual([1, 2, 3]);
  });

  it("waits a jittered, growing delay between attempts", async () => {
    const waits: number[] = [];
    let calls = 0;
    await withTransientConflictRetry(async () => { calls += 1; if (calls < 4) throw serializationFailure(); return calls; }, {
      baseDelayMs: 10, maxDelayMs: 1000, random: () => 0.5, sleep: async (ms) => { waits.push(ms); }
    });
    expect(waits).toEqual([5, 10, 20]);
  });

  it("gives up after maxAttempts and rethrows the last conflict", async () => {
    let calls = 0;
    const last = serializationFailure();
    await expect(withTransientConflictRetry(async () => { calls += 1; throw last; }, { ...noSleep, maxAttempts: 4 })).rejects.toBe(last);
    expect(calls).toBe(4);
  });

  it("never retries a non-transient error", async () => {
    let calls = 0;
    const unique = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    await expect(withTransientConflictRetry(async () => { calls += 1; throw unique; }, noSleep)).rejects.toBe(unique);
    expect(calls).toBe(1);
  });

  it("accepts a custom retry predicate", async () => {
    let calls = 0;
    const result = await withTransientConflictRetry(async () => { calls += 1; if (calls === 1) throw new Error("busy"); return "done"; }, {
      ...noSleep, isRetryable: (e) => e instanceof Error && e.message === "busy"
    });
    expect(result).toBe("done");
    expect(calls).toBe(2);
  });
});
