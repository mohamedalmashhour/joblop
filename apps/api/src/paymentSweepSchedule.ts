import type { PrismaClient } from "@rwos/database";
import type { PaymentRecord } from "@rwos/shared";
import { createAgedProcessingSweeper, createPrismaAgedProcessingSelector } from "./paymentSweeper";
import {
  createScheduledSweepRunner,
  type ScheduledSweepMetrics,
  type ScheduledSweepRunner
} from "./paymentSweepRunner";
import {
  createLeaseBackedLock,
  createPostgresSweepKillSwitch,
  createPostgresSweepLease
} from "./paymentSweepLease";

// money-golive-readiness — runtime ACTIVATION wrapper for the aged-`processing` reconciliation sweeper.
//
// This assembles the already-built, already-reviewed pieces into a periodic driver and wires in BOTH
// durable safety controls, mirroring the brain-sweep / jobscanner schedule shape:
//   • a Postgres kill switch (fail-closed: missing row / read error → OFF) checked FIRST on every pass,
//   • a durable cross-instance LEASE (fencing-token lock) so multiple instances never sweep together,
//   • the runner's own conservative floors (min age ≥ 10min, batch ≤ 100) enforced at construction.
//
// It is a BACKSTOP behind webhook-first recovery (the primary resolver) and only ever calls the
// query-only, version/state-guarded PaymentRepository.reconcile(); it NEVER executes/charges and moves
// no money. It is OFF unless a caller passes a positive interval, and even then inert until an operator
// explicitly enables the kill-switch row — so it is safe to leave un-scheduled in committed config.

const DEFAULT_LEASE_TTL_MS = 5 * 60_000; // lease long enough to cover one bounded pass, auto-reclaimable.
const FIRST_RUN_DELAY_MS = 15_000; // small startup delay, like the other schedules.

export type PaymentSweepScheduleLogger = Readonly<{
  info: (event: string, fields?: Record<string, string | number | boolean>) => void;
  warn?: (event: string, fields?: Record<string, string | number | boolean>) => void;
}>;

export type PaymentSweepScheduleConfig = Readonly<{
  prisma: PrismaClient;
  // The approved, org-scoped, query-only reconcile finalize (PaymentRepository.reconcile).
  reconcile: (input: { paymentId: string; organizationId: string }) => Promise<PaymentRecord>;
  intervalMinutes: number;
  minAgeMs?: number;
  maxBatchSize?: number;
  leaseTtlMs?: number;
  controlName?: string; // kill-switch + lease row name; defaults to "aged_processing_sweep".
  logger?: PaymentSweepScheduleLogger;
  now?: () => Date;
}>;

// Build the runner (sweeper + kill switch + lease-backed lock). Exposed on its own so it can be unit
// tested and so a single bounded pass can be invoked directly without a timer.
export function createPaymentSweepRunner(config: PaymentSweepScheduleConfig): ScheduledSweepRunner {
  const selector = createPrismaAgedProcessingSelector(config.prisma);
  const sweeper = createAgedProcessingSweeper({
    selectAgedProcessing: (input) => selector.selectAgedProcessing(input),
    reconcile: config.reconcile,
    ...(config.now ? { now: config.now } : {})
  });
  const controlOptions = config.controlName ? { name: config.controlName } : undefined;
  return createScheduledSweepRunner({
    sweeper,
    ...(config.minAgeMs !== undefined ? { minAgeMs: config.minAgeMs } : {}),
    ...(config.maxBatchSize !== undefined ? { maxBatchSize: config.maxBatchSize } : {}),
    killSwitch: createPostgresSweepKillSwitch(config.prisma, controlOptions),
    lock: createLeaseBackedLock(createPostgresSweepLease(config.prisma, controlOptions), {
      ttlMs: config.leaseTtlMs ?? DEFAULT_LEASE_TTL_MS,
      ...(config.now ? { now: config.now } : {})
    }),
    ...(config.now ? { now: config.now } : {}),
    emitMetrics: (metrics: ScheduledSweepMetrics) =>
      config.logger?.info("payment.sweep.pass", {
        status: metrics.status,
        selected: metrics.selected,
        resolved: metrics.resolved,
        stillProcessing: metrics.stillProcessing,
        errored: metrics.errored,
        durationMs: metrics.durationMs
      })
  });
}

// Start the periodic sweep. Runs one bounded pass shortly after start, then every intervalMinutes.
// Returns a stop() that clears the timers. Timers are unref'd so they never keep the process alive.
export function startPaymentSweepSchedule(config: PaymentSweepScheduleConfig): () => void {
  const runner = createPaymentSweepRunner(config);
  const intervalMs = Math.max(1, config.intervalMinutes) * 60_000;
  let running = false; // in-process non-overlap, in addition to the durable lease.
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runner.runOnce();
    } catch {
      // runOnce already converts systemic failures to a safe aggregate; a throw here is unexpected but
      // must never crash the host. No raw error is surfaced (it may carry sensitive detail).
      config.logger?.warn?.("payment.sweep.schedule_error");
    } finally {
      running = false;
    }
  };
  const first = setTimeout(() => void tick(), FIRST_RUN_DELAY_MS);
  const interval = setInterval(() => void tick(), intervalMs);
  if (typeof first.unref === "function") first.unref();
  if (typeof interval.unref === "function") interval.unref();
  return () => {
    clearTimeout(first);
    clearInterval(interval);
  };
}
