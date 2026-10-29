import type { PrismaClient } from "@rwos/database";
import type { EmailSender } from "./mailer/emailSender";
import { notifyWorkerPayoutPaid, notifyWorkerPayoutRegistered } from "./notifications/workerNotifications";
import { materializeAndListWorkerPayouts } from "./workerPayoutRepository";
import {
  createLeaseBackedLock,
  createPostgresSweepKillSwitch,
  createPostgresSweepLease
} from "./paymentSweepLease";
import type { SweepKillSwitchPort, SweepRunLock } from "./paymentSweepRunner";

// Money-flow Phase 2 — BACKGROUND worker-payout progression.
//
// This is the payout lifecycle's real driver: a scheduled, bounded, idempotent pass that advances
// every eligible worker's payouts WITHOUT any worker page view. It mirrors the aged-payment
// reconciliation sweeper's safety shape (fail-closed kill switch + durable cross-instance lease +
// bounded single pass, see paymentSweepRunner / paymentSweepLease) and reuses those same control
// tables under a distinct lock name. It moves NO money: it only (a) materializes pending payouts for
// locked calculations, (b) applies the pure 48h-registration and 14-day-release transitions, and
// (c) DELIVERS the two worker notices, retrying any that have not yet been delivered. The external
// TEST send ("paid") remains the separately gated admin action; this job never calls it and never
// reads FINANCE_LIVE_ENABLED.

// Reuse the payment-sweep control/lease tables under a payout-specific name. Defense-in-depth only:
// the lease reduces cross-instance contention and the kill switch is fail-closed (default OFF), while
// per-row correctness is still guaranteed by the status-guarded updateMany writes in the pass itself.
export const WORKER_PAYOUT_PROGRESSION_LOCK = "worker_payout_progression";

// Conservative bounds — a single pass never processes an unbounded set.
export const DEFAULT_PROGRESSION_MAX_WORKERS = 200;
export const DEFAULT_PROGRESSION_MAX_NOTIFICATIONS = 200;
const DEFAULT_LEASE_TTL_MS = 5 * 60_000; // a pass must finish well within this; a crash self-expires it

// Counts produced by one pass. SAFE aggregates only — never ids, emails, amounts, or payment detail.
export type ProgressionPassCounts = Readonly<{
  workersProcessed: number;
  registeredNotified: number;
  registeredFailed: number;
  paidNotified: number;
  paidFailed: number;
}>;

export type ProgressionStatus = "completed" | "skipped_locked" | "failed" | "disabled";

export type ProgressionMetrics = ProgressionPassCounts & Readonly<{ status: ProgressionStatus; durationMs: number }>;

const EMPTY_COUNTS: ProgressionPassCounts = {
  workersProcessed: 0,
  registeredNotified: 0,
  registeredFailed: 0,
  paidNotified: 0,
  paidFailed: 0
};

/**
 * Run ONE bounded progression pass. Never throws — a per-worker or per-notification failure is
 * isolated and reported as a count, and a failed/undelivered notice is simply left for the next pass.
 *
 * 1. For a bounded set of workers with LOCKED calculations, materialize + advance their payouts
 *    (`materializeAndListWorkerPayouts`, which persists registeredAt / released transitions but sends
 *    nothing). This runs independent of any `/worker/payouts` read.
 * 2. DELIVER the "registered in your account" notice for every payout whose amount is confirmed
 *    (registeredAt set) but not yet delivered (registeredNotifiedAt null), stamping the marker only on
 *    a successful send — so it is retried until delivered and never sent twice.
 * 3. Likewise deliver/retry the "paid" notice (paidAt set, paidNotifiedAt null).
 */
export async function runWorkerPayoutProgressionPass(deps: {
  prisma: PrismaClient;
  emailSender: EmailSender;
  now?: () => Date;
  maxWorkers?: number;
  maxNotifications?: number;
}): Promise<ProgressionPassCounts> {
  const now = deps.now ?? (() => new Date());
  const maxWorkers = deps.maxWorkers ?? DEFAULT_PROGRESSION_MAX_WORKERS;
  const maxNotifications = deps.maxNotifications ?? DEFAULT_PROGRESSION_MAX_NOTIFICATIONS;
  const { prisma, emailSender } = deps;

  const counts = { ...EMPTY_COUNTS };

  // (1) Advance the lifecycle for a bounded set of workers who have locked calculations (the only
  // workers who can have payouts). Materialize is a no-op where a payout already exists. Each worker
  // is handled independently; one failure never aborts the pass.
  const lockedWorkers = await prisma.payrollCalculation.findMany({
    where: { status: "locked" },
    select: { workerIdentityId: true },
    distinct: ["workerIdentityId"],
    take: maxWorkers
  });
  for (const w of lockedWorkers) {
    try {
      await materializeAndListWorkerPayouts(prisma, w.workerIdentityId, now());
      counts.workersProcessed += 1;
    } catch {
      // Leave this worker's payouts for the next pass; never surface the raw error.
    }
  }

  // (2) Deliver + retry the "registered" notice. Only un-delivered, confirmed payouts; idempotent via
  // the status-guarded marker write.
  const needRegistered = await prisma.workerPayout.findMany({
    where: { registeredAt: { not: null }, registeredNotifiedAt: null },
    select: { id: true, workerIdentityId: true, amountMinor: true, currency: true },
    take: maxNotifications
  });
  for (const p of needRegistered) {
    const result = await notifyWorkerPayoutRegistered(prisma, emailSender, {
      workerIdentityId: p.workerIdentityId,
      amountMinor: p.amountMinor,
      currency: p.currency
    });
    if (result.status === "sent") {
      await prisma.workerPayout.updateMany({ where: { id: p.id, registeredNotifiedAt: null }, data: { registeredNotifiedAt: now() } });
      counts.registeredNotified += 1;
    } else {
      counts.registeredFailed += 1; // not delivered (error / unconfigured / no recipient) → retried next pass
    }
  }

  // (3) Deliver + retry the "paid" notice. The route stamps paid_notified_at on its own successful
  // inline send; this catches any that failed or were never attempted.
  const needPaid = await prisma.workerPayout.findMany({
    where: { paidAt: { not: null }, paidNotifiedAt: null },
    select: { id: true, workerIdentityId: true, amountMinor: true, currency: true, paymentRef: true },
    take: maxNotifications
  });
  for (const p of needPaid) {
    const result = await notifyWorkerPayoutPaid(prisma, emailSender, {
      workerIdentityId: p.workerIdentityId,
      amountMinor: p.amountMinor,
      currency: p.currency,
      reference: p.paymentRef
    });
    if (result.status === "sent") {
      await prisma.workerPayout.updateMany({ where: { id: p.id, paidNotifiedAt: null }, data: { paidNotifiedAt: now() } });
      counts.paidNotified += 1;
    } else {
      counts.paidFailed += 1;
    }
  }

  return counts;
}

export interface WorkerPayoutProgressionRunner {
  runOnce(): Promise<ProgressionMetrics>;
}

/**
 * Wrap the pass with the sweeper safety shape: fail-closed kill switch FIRST, then a non-overlap lock,
 * then exactly one bounded pass. Never throws; always releases the lock. Default kill switch + lease
 * are the durable Postgres controls under {@link WORKER_PAYOUT_PROGRESSION_LOCK}.
 */
export function createWorkerPayoutProgressionRunner(deps: {
  prisma: PrismaClient;
  emailSender: EmailSender;
  now?: () => Date;
  maxWorkers?: number;
  maxNotifications?: number;
  lock?: SweepRunLock;
  killSwitch?: SweepKillSwitchPort;
  leaseTtlMs?: number;
  emitMetrics?: (metrics: ProgressionMetrics) => void;
}): WorkerPayoutProgressionRunner {
  const now = deps.now ?? (() => new Date());
  const killSwitch: SweepKillSwitchPort =
    deps.killSwitch ?? createPostgresSweepKillSwitch(deps.prisma, { name: WORKER_PAYOUT_PROGRESSION_LOCK });
  const lock: SweepRunLock =
    deps.lock ??
    createLeaseBackedLock(createPostgresSweepLease(deps.prisma, { name: WORKER_PAYOUT_PROGRESSION_LOCK }), {
      ttlMs: deps.leaseTtlMs ?? DEFAULT_LEASE_TTL_MS
    });

  return {
    async runOnce() {
      const startedAt = now().getTime();
      // Kill switch FIRST — fail closed. Disabled (or unreadable) → nothing selected, nothing runs.
      if (!(await killSwitch.isEnabled())) {
        return { ...EMPTY_COUNTS, status: "disabled", durationMs: 0 };
      }
      if (!(await lock.tryAcquire())) {
        return { ...EMPTY_COUNTS, status: "skipped_locked", durationMs: 0 };
      }
      try {
        const counts = await runWorkerPayoutProgressionPass({
          prisma: deps.prisma,
          emailSender: deps.emailSender,
          now,
          ...(deps.maxWorkers !== undefined ? { maxWorkers: deps.maxWorkers } : {}),
          ...(deps.maxNotifications !== undefined ? { maxNotifications: deps.maxNotifications } : {})
        });
        const metrics: ProgressionMetrics = { ...counts, status: "completed", durationMs: Math.max(0, now().getTime() - startedAt) };
        deps.emitMetrics?.(metrics);
        return metrics;
      } catch {
        const metrics: ProgressionMetrics = { ...EMPTY_COUNTS, status: "failed", durationMs: Math.max(0, now().getTime() - startedAt) };
        deps.emitMetrics?.(metrics);
        return metrics;
      } finally {
        await lock.release(); // always release — a failure never leaves a permanent lock
      }
    }
  };
}

export type ProgressionScheduleConfig = Readonly<{
  runner: WorkerPayoutProgressionRunner;
  intervalMinutes: number;
  logger?: {
    info: (event: string, fields?: Record<string, string | number | boolean>) => void;
    warn: (event: string, fields?: Record<string, string | number | boolean>) => void;
  };
}>;

/**
 * Start the periodic progression. Runs one pass shortly after start, then every intervalMinutes.
 * Non-overlap is enforced both in-process (the running flag) and cross-instance (the lease inside the
 * runner). The timers are unref'd so they never keep the process alive on their own. Returns stop().
 */
export function startWorkerPayoutProgressionSchedule(config: ProgressionScheduleConfig): () => void {
  const intervalMs = Math.max(1, config.intervalMinutes) * 60_000;
  let running = false;
  const tick = async () => {
    if (running) return; // never overlap passes in this process
    running = true;
    try {
      const metrics = await config.runner.runOnce();
      config.logger?.info("worker_payout.progression.pass", {
        status: metrics.status,
        workersProcessed: metrics.workersProcessed,
        registeredNotified: metrics.registeredNotified,
        registeredFailed: metrics.registeredFailed,
        paidNotified: metrics.paidNotified,
        paidFailed: metrics.paidFailed,
        durationMs: metrics.durationMs
      });
    } catch (err) {
      config.logger?.warn("worker_payout.progression.error", { message: (err as Error).message });
    } finally {
      running = false;
    }
  };
  const first = setTimeout(() => void tick(), 5_000);
  const interval = setInterval(() => void tick(), intervalMs);
  if (typeof first.unref === "function") first.unref();
  if (typeof interval.unref === "function") interval.unref();
  return () => {
    clearTimeout(first);
    clearInterval(interval);
  };
}
