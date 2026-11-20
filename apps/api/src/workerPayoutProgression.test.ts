import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@rwos/database";
import type { EmailMessage, EmailSender } from "./mailer/emailSender";
import type { SweepKillSwitchPort, SweepRunLock } from "./paymentSweepRunner";
import {
  createWorkerPayoutProgressionRunner,
  runWorkerPayoutProgressionPass
} from "./workerPayoutProgression";

type PayoutRow = {
  id: string;
  workerIdentityId: string;
  amountMinor: number;
  currency: string;
  paymentRef?: string | null;
  registeredAt?: Date | null;
  registeredNotifiedAt?: Date | null;
  paidAt?: Date | null;
  paidNotifiedAt?: Date | null;
};

// A minimal fake prisma for the notification-retry sweep. The materialize loop is driven to a no-op
// (no locked workers), so this exercises exactly the durable-notification logic; the full
// finish→registered→released→paid drive is covered by the real-Postgres e2e.
function makeFakePrisma(rows: PayoutRow[], opts?: { recipient?: boolean }) {
  const updates: Array<{ id: string; data: Record<string, unknown>; where: Record<string, unknown> }> = [];
  const prisma = {
    payrollCalculation: {
      findMany: async () => [] // no workers to materialize in the unit test
    },
    workerPayout: {
      findMany: async (args: { where: Record<string, unknown> }) => {
        // Branch on which marker the sweep is querying for.
        if ("registeredAt" in args.where) {
          return rows.filter((r) => r.registeredAt != null && r.registeredNotifiedAt == null);
        }
        if ("paidAt" in args.where) {
          return rows.filter((r) => r.paidAt != null && r.paidNotifiedAt == null);
        }
        return [];
      },
      updateMany: async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const id = args.where.id as string;
        // Honour the status-guarded marker: only apply when the guarded marker is still null.
        const row = rows.find((r) => r.id === id);
        if (!row) return { count: 0 };
        if ("registeredNotifiedAt" in args.where && row.registeredNotifiedAt != null) return { count: 0 };
        if ("paidNotifiedAt" in args.where && row.paidNotifiedAt != null) return { count: 0 };
        if ("registeredNotifiedAt" in args.data) row.registeredNotifiedAt = args.data.registeredNotifiedAt as Date;
        if ("paidNotifiedAt" in args.data) row.paidNotifiedAt = args.data.paidNotifiedAt as Date;
        updates.push({ id, data: args.data, where: args.where });
        return { count: 1 };
      }
    },
    workerIdentity: {
      findUnique: async () =>
        opts?.recipient === false
          ? { user: null }
          : { user: { emailNormalized: "w@x.com", primaryLanguage: "en" } }
    }
  } as unknown as PrismaClient;
  return { prisma, updates };
}

function sender(behaviour: "sent" | "error"): EmailSender {
  return {
    configured: true,
    async send(_m: EmailMessage): Promise<{ status: "sent"; id: string } | { status: "error" }> {
      void _m;
      return behaviour === "sent" ? ({ status: "sent", id: "x" } as const) : ({ status: "error" } as const);
    }
  };
}

describe("worker payout progression — durable notification retry", () => {
  it("delivers the 'registered' notice for a confirmed-but-unnotified payout and stamps the marker", async () => {
    const rows: PayoutRow[] = [
      { id: "p1", workerIdentityId: "wi1", amountMinor: 33000, currency: "CAD", registeredAt: new Date(), registeredNotifiedAt: null }
    ];
    const { prisma } = makeFakePrisma(rows);
    const counts = await runWorkerPayoutProgressionPass({ prisma, emailSender: sender("sent") });
    expect(counts.registeredNotified).toBe(1);
    expect(counts.registeredFailed).toBe(0);
    expect(rows[0]!.registeredNotifiedAt).not.toBeNull();
  });

  it("is idempotent — a second pass does not re-send an already-delivered notice", async () => {
    const rows: PayoutRow[] = [
      { id: "p1", workerIdentityId: "wi1", amountMinor: 33000, currency: "CAD", registeredAt: new Date(), registeredNotifiedAt: null }
    ];
    const { prisma } = makeFakePrisma(rows);
    await runWorkerPayoutProgressionPass({ prisma, emailSender: sender("sent") });
    const second = await runWorkerPayoutProgressionPass({ prisma, emailSender: sender("sent") });
    expect(second.registeredNotified).toBe(0); // already stamped → no longer selected
  });

  it("leaves the marker null and counts a failure when the send fails — so it is retried", async () => {
    const rows: PayoutRow[] = [
      { id: "p1", workerIdentityId: "wi1", amountMinor: 33000, currency: "CAD", registeredAt: new Date(), registeredNotifiedAt: null }
    ];
    const { prisma } = makeFakePrisma(rows);
    const first = await runWorkerPayoutProgressionPass({ prisma, emailSender: sender("error") });
    expect(first.registeredNotified).toBe(0);
    expect(first.registeredFailed).toBe(1);
    expect(rows[0]!.registeredNotifiedAt).toBeNull(); // not delivered → still pending
    // A later pass with a working sender delivers it.
    const second = await runWorkerPayoutProgressionPass({ prisma, emailSender: sender("sent") });
    expect(second.registeredNotified).toBe(1);
    expect(rows[0]!.registeredNotifiedAt).not.toBeNull();
  });

  it("retries the 'paid' notice (paidAt set, paidNotifiedAt null) and stamps on success", async () => {
    const rows: PayoutRow[] = [
      { id: "p2", workerIdentityId: "wi1", amountMinor: 48000, currency: "CAD", paymentRef: "payout-test-synthetic-p2", paidAt: new Date(), paidNotifiedAt: null }
    ];
    const { prisma } = makeFakePrisma(rows);
    const counts = await runWorkerPayoutProgressionPass({ prisma, emailSender: sender("sent") });
    expect(counts.paidNotified).toBe(1);
    expect(rows[0]!.paidNotifiedAt).not.toBeNull();
  });

  it("does not stamp (and retries) when there is no recipient", async () => {
    const rows: PayoutRow[] = [
      { id: "p1", workerIdentityId: "wi1", amountMinor: 33000, currency: "CAD", registeredAt: new Date(), registeredNotifiedAt: null }
    ];
    const { prisma } = makeFakePrisma(rows, { recipient: false });
    const counts = await runWorkerPayoutProgressionPass({ prisma, emailSender: sender("sent") });
    expect(counts.registeredNotified).toBe(0);
    expect(counts.registeredFailed).toBe(1);
    expect(rows[0]!.registeredNotifiedAt).toBeNull();
  });
});

describe("worker payout progression runner — fail-closed gating", () => {
  const prisma = makeFakePrisma([]).prisma;

  it("is DISABLED (nothing runs) when the kill switch is off", async () => {
    const killSwitch: SweepKillSwitchPort = { isEnabled: () => false };
    let acquired = false;
    const lock: SweepRunLock = { tryAcquire: () => ((acquired = true), true), release: () => undefined };
    const runner = createWorkerPayoutProgressionRunner({ prisma, emailSender: sender("sent"), killSwitch, lock });
    const m = await runner.runOnce();
    expect(m.status).toBe("disabled");
    expect(acquired).toBe(false); // kill switch checked BEFORE the lock
  });

  it("is SKIPPED when the non-overlap lock is already held", async () => {
    const killSwitch: SweepKillSwitchPort = { isEnabled: () => true };
    const lock: SweepRunLock = { tryAcquire: () => false, release: () => undefined };
    const runner = createWorkerPayoutProgressionRunner({ prisma, emailSender: sender("sent"), killSwitch, lock });
    const m = await runner.runOnce();
    expect(m.status).toBe("skipped_locked");
  });

  it("COMPLETES one pass when enabled and unlocked, releasing the lock", async () => {
    const killSwitch: SweepKillSwitchPort = { isEnabled: () => true };
    let released = false;
    const lock: SweepRunLock = { tryAcquire: () => true, release: () => { released = true; } };
    const runner = createWorkerPayoutProgressionRunner({ prisma, emailSender: sender("sent"), killSwitch, lock });
    const m = await runner.runOnce();
    expect(m.status).toBe("completed");
    expect(released).toBe(true);
  });
});
