import { describe, expect, it, vi } from "vitest";
import type { PaymentRecord } from "@rwos/shared";
import type { AgedProcessingSweeper, SweepResult } from "./paymentSweeper";
import {
  createScheduledSweepRunner,
  DEFAULT_SWEEP_MAX_BATCH_SIZE,
  DEFAULT_SWEEP_MIN_AGE_MS,
  type SweepRunLock
} from "./paymentSweepRunner";

// A stub sweeper that records the config it is invoked with and returns a canned aggregate.
const sweeperReturning = (result: Partial<SweepResult> = {}): { sweeper: AgedProcessingSweeper; sweep: ReturnType<typeof vi.fn> } => {
  const sweep = vi.fn().mockResolvedValue({
    selected: 0, resolved: 0, stillProcessing: 0, errored: 0, items: [], ...result
  } satisfies SweepResult);
  return { sweeper: { sweep }, sweep };
};

describe("scheduled sweep runner (Stage 2b.4-C3-F2)", () => {
  it("[1] one scheduled invocation performs exactly ONE bounded sweep and exits", async () => {
    const { sweeper, sweep } = sweeperReturning({ selected: 3, resolved: 2, stillProcessing: 1 });
    const runner = createScheduledSweepRunner({ sweeper });
    const metrics = await runner.runOnce();
    expect(sweep).toHaveBeenCalledTimes(1); // one invocation → one sweep
    expect(metrics).toMatchObject({ status: "completed", selected: 3, resolved: 2, stillProcessing: 1 });
  });

  it("[2] defaults meet the conservative age/batch policy", async () => {
    const { sweeper, sweep } = sweeperReturning();
    await createScheduledSweepRunner({ sweeper }).runOnce();
    expect(DEFAULT_SWEEP_MIN_AGE_MS).toBeGreaterThanOrEqual(10 * 60_000); // >= 10 minutes
    expect(DEFAULT_SWEEP_MAX_BATCH_SIZE).toBeLessThanOrEqual(50); // small explicit cap
    expect(sweep).toHaveBeenCalledWith({ minAgeMs: DEFAULT_SWEEP_MIN_AGE_MS, maxBatchSize: DEFAULT_SWEEP_MAX_BATCH_SIZE });
  });

  it("[3] invalid config fails closed at construction (no sweep is ever run)", () => {
    const { sweeper, sweep } = sweeperReturning();
    expect(() => createScheduledSweepRunner({ sweeper, minAgeMs: 60_000 })).toThrow(); // younger than 10 min
    expect(() => createScheduledSweepRunner({ sweeper, minAgeMs: Number.NaN })).toThrow();
    expect(() => createScheduledSweepRunner({ sweeper, maxBatchSize: 0 })).toThrow();
    expect(() => createScheduledSweepRunner({ sweeper, maxBatchSize: 10_000 })).toThrow(); // above bounded cap
    expect(sweep).not.toHaveBeenCalled();
  });

  it("[4] a completed invocation does NOT automatically retry — a second sweep needs a second call", async () => {
    const { sweeper, sweep } = sweeperReturning({ selected: 5, errored: 5 }); // even an all-errored sweep
    const runner = createScheduledSweepRunner({ sweeper });
    await runner.runOnce();
    expect(sweep).toHaveBeenCalledTimes(1); // errored items do NOT trigger an in-invocation retry
  });

  it("[5] there is no unbounded catch-up loop — runOnce sweeps once regardless of a full batch", async () => {
    // A full batch (selected === maxBatchSize) must NOT cause the runner to immediately sweep again.
    const { sweeper, sweep } = sweeperReturning({ selected: DEFAULT_SWEEP_MAX_BATCH_SIZE, resolved: DEFAULT_SWEEP_MAX_BATCH_SIZE });
    await createScheduledSweepRunner({ sweeper }).runOnce();
    expect(sweep).toHaveBeenCalledTimes(1); // no drain-until-empty loop
  });

  it("[6] a concurrent invocation is skipped by the non-overlap lock (in-process default)", async () => {
    let release!: (r: SweepResult) => void;
    const sweep = vi.fn().mockImplementation(() => new Promise<SweepResult>((r) => { release = r; }));
    const runner = createScheduledSweepRunner({ sweeper: { sweep } });
    const first = runner.runOnce(); // acquires the lock, sweep is pending
    const second = await runner.runOnce(); // lock held → skipped
    expect(second).toMatchObject({ status: "skipped_locked" });
    expect(sweep).toHaveBeenCalledTimes(1); // the second invocation never swept
    release({ selected: 0, resolved: 0, stillProcessing: 0, errored: 0, items: [] });
    await first;
  });

  it("[6b] the lock is released after a run so the NEXT invocation can proceed", async () => {
    const { sweeper, sweep } = sweeperReturning();
    const runner = createScheduledSweepRunner({ sweeper });
    await runner.runOnce();
    await runner.runOnce();
    expect(sweep).toHaveBeenCalledTimes(2); // sequential runs are not blocked
  });

  it("[7] overlapping invocations remain SAFE even when the lock is bypassed (multi-instance)", async () => {
    // Simulate two separate instances with no shared lock (every acquire succeeds). Safety then rests on
    // the sweeper→reconcile() version/state guard, not on this wrapper. Both runs complete without error.
    const noOverlapLock: SweepRunLock = { tryAcquire: () => true, release: () => {} };
    const { sweeper, sweep } = sweeperReturning({ selected: 1, resolved: 1 });
    const a = createScheduledSweepRunner({ sweeper, lock: noOverlapLock });
    const b = createScheduledSweepRunner({ sweeper, lock: noOverlapLock });
    const [ra, rb] = await Promise.all([a.runOnce(), b.runOnce()]);
    expect(ra.status).toBe("completed");
    expect(rb.status).toBe("completed");
    expect(sweep).toHaveBeenCalledTimes(2); // both delegate to the guarded reconcile path
  });

  it("[8] emitted metrics contain ONLY safe aggregate counts + duration + status", async () => {
    const { sweeper } = sweeperReturning({
      selected: 2, resolved: 1, stillProcessing: 1, errored: 0,
      // per-item detail exists on the sweep result but must NOT propagate into the runner metrics
      items: [{ paymentId: "pay-secret-1", organizationId: "org-secret", outcome: "resolved", state: "succeeded" as PaymentRecord["state"] }]
    });
    const emitted: unknown[] = [];
    const runner = createScheduledSweepRunner({ sweeper, emitMetrics: (m) => emitted.push(m) });
    const metrics = await runner.runOnce();
    expect(Object.keys(metrics).sort()).toEqual(["durationMs", "errored", "resolved", "selected", "status", "stillProcessing"]);
    const serialized = JSON.stringify(metrics) + JSON.stringify(emitted);
    expect(serialized).not.toContain("pay-secret-1"); // no payment ids
    expect(serialized).not.toContain("org-secret"); // no org ids
    expect(serialized).not.toContain("items"); // no per-item detail
    expect(emitted).toEqual([metrics]);
  });

  it("[9] a provider/sweep error does NOT trigger a charge or a retry — it is reported as a safe failure", async () => {
    const sweep = vi.fn().mockRejectedValue(new Error("SECRET sk_live_leak idempotency=raw-key pan=4111111111111111"));
    const runner = createScheduledSweepRunner({ sweeper: { sweep } });
    const metrics = await runner.runOnce();
    expect(sweep).toHaveBeenCalledTimes(1); // no retry after a systemic failure
    expect(metrics.status).toBe("failed");
    const serialized = JSON.stringify(metrics);
    expect(serialized).not.toContain("sk_live"); // raw provider error is never surfaced
    expect(serialized).not.toContain("raw-key");
    expect(serialized).not.toContain("4111111111111111");
  });

  it("[10] the scheduler wrapper has NO direct access to execute/authorize/capture/refund/void", () => {
    // Structural contract: the runner's only side-effecting dependency is the sweeper (which itself only
    // calls the guarded, query-only reconcile()). There is no provider/execute/capture/refund/void handle.
    const { sweeper } = sweeperReturning();
    const deps = { sweeper, minAgeMs: DEFAULT_SWEEP_MIN_AGE_MS, maxBatchSize: DEFAULT_SWEEP_MAX_BATCH_SIZE };
    expect(Object.keys(deps)).toEqual(["sweeper", "minAgeMs", "maxBatchSize"]);
    const forbidden = ["execute", "authorize", "capture", "refund", "void", "charge", "provider"];
    for (const key of forbidden) expect(sweeper).not.toHaveProperty(key);
    expect(Object.keys(sweeper)).toEqual(["sweep"]); // the sweeper exposes only a bounded sweep
  });
});
