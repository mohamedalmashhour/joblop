import type { AgedProcessingSweeper } from "./paymentSweeper";

// Stage 2b.4-C3-F2 — bounded periodic INVOCATION WRAPPER around the F1 aged-processing sweeper.
//
// This is NOT a scheduler/cron/worker and NOT production activation. It is a single-shot `runOnce()`
// that a scheduler *would* call periodically later (a separate, deliberately un-built stage). One
// invocation performs exactly ONE bounded sweep and exits — no unbounded catch-up loop, no immediate
// retry loop. A non-overlap lock skips a concurrent invocation; even if that lock is bypassed (multi-
// instance), safety is still guaranteed by the sweeper→reconcile() version/state guards (F1/C3-E).
// It emits only SAFE aggregate metrics: status + counts + duration — never ids, raw errors, PANs,
// idempotency keys, or payment detail. It has NO provider/execute handle of its own.

// Conservative policy defaults.
export const DEFAULT_SWEEP_MIN_AGE_MS = 15 * 60_000; // 15 minutes
export const DEFAULT_SWEEP_MAX_BATCH_SIZE = 25; // small explicit cap
const MIN_ALLOWED_MIN_AGE_MS = 10 * 60_000; // policy floor: never sweep attempts younger than 10 minutes
const MAX_ALLOWED_BATCH_SIZE = 100; // never sweep an unbounded batch

export type ScheduledSweepStatus = "completed" | "skipped_locked" | "failed";

// SAFE aggregate metrics only — no ids, errors, keys, or payment detail.
export type ScheduledSweepMetrics = Readonly<{
  status: ScheduledSweepStatus;
  selected: number;
  resolved: number;
  stillProcessing: number;
  errored: number;
  durationMs: number;
}>;

// Non-overlap control. The default is an in-process guard; a distributed lock can be injected later.
export interface SweepRunLock {
  tryAcquire(): boolean;
  release(): void;
}

export interface ScheduledSweepRunner {
  runOnce(): Promise<ScheduledSweepMetrics>;
}

export function createScheduledSweepRunner(deps: {
  sweeper: AgedProcessingSweeper;
  minAgeMs?: number;
  maxBatchSize?: number;
  lock?: SweepRunLock;
  now?: () => Date;
  emitMetrics?: (metrics: ScheduledSweepMetrics) => void;
}): ScheduledSweepRunner {
  const minAgeMs = deps.minAgeMs ?? DEFAULT_SWEEP_MIN_AGE_MS;
  const maxBatchSize = deps.maxBatchSize ?? DEFAULT_SWEEP_MAX_BATCH_SIZE;

  // Fail closed at construction on any non-conservative config.
  if (!Number.isFinite(minAgeMs) || minAgeMs < MIN_ALLOWED_MIN_AGE_MS) {
    throw new Error("Scheduled sweep minimum age must be at least 10 minutes.");
  }
  if (!Number.isInteger(maxBatchSize) || maxBatchSize < 1 || maxBatchSize > MAX_ALLOWED_BATCH_SIZE) {
    throw new Error("Scheduled sweep batch size must be a positive integer within the bounded cap.");
  }

  const now = deps.now ?? (() => new Date());
  let running = false;
  const lock: SweepRunLock = deps.lock ?? {
    tryAcquire: () => (running ? false : ((running = true), true)),
    release: () => { running = false; }
  };

  return {
    async runOnce() {
      const startedAt = now().getTime();
      // Non-overlap: a concurrent invocation is skipped (not queued, not retried).
      if (!lock.tryAcquire()) {
        return { status: "skipped_locked", selected: 0, resolved: 0, stillProcessing: 0, errored: 0, durationMs: 0 };
      }
      try {
        // Exactly ONE bounded sweep. No loop, no retry.
        const result = await deps.sweeper.sweep({ minAgeMs, maxBatchSize });
        const metrics: ScheduledSweepMetrics = {
          status: "completed",
          selected: result.selected,
          resolved: result.resolved,
          stillProcessing: result.stillProcessing,
          errored: result.errored,
          durationMs: Math.max(0, now().getTime() - startedAt)
        };
        deps.emitMetrics?.(metrics);
        return metrics;
      } catch {
        // A systemic sweep failure is reported as a safe aggregate; it is NOT retried and no raw error
        // is surfaced. The provider is never touched from here.
        const metrics: ScheduledSweepMetrics = {
          status: "failed", selected: 0, resolved: 0, stillProcessing: 0, errored: 0,
          durationMs: Math.max(0, now().getTime() - startedAt)
        };
        deps.emitMetrics?.(metrics);
        return metrics;
      } finally {
        lock.release(); // always release — a failure never leaves a permanent lock
      }
    }
  };
}
