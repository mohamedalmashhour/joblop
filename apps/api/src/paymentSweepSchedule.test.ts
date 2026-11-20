import type { PaymentRecord } from "@rwos/shared";
import { describe, expect, it, vi } from "vitest";
import { createPaymentSweepRunner } from "./paymentSweepSchedule";

// money-golive-readiness — activation wrapper for the aged-processing sweep. These prove the two durable
// safety controls are wired and fail closed: the Postgres kill switch is checked FIRST (OFF → nothing
// selected, nothing reconciled), and the runner enforces the conservative min-age / batch floors.

type QueryHandler = (sql: string, args: unknown[]) => unknown[];

function fakePrisma(options: {
  killSwitchEnabled: boolean;
  candidates?: Array<{ id: string; organizationId: string }>;
}) {
  const findMany = vi.fn(async () => options.candidates ?? []);
  const queryHandler: QueryHandler = (sql) => {
    if (/FROM payment_sweep_control/i.test(sql)) {
      return options.killSwitchEnabled ? [{ enabled: true }] : [];
    }
    if (/INSERT INTO payment_sweep_lease/i.test(sql)) {
      return [{ owner: "test-owner", fencingToken: 1n }]; // lease acquired
    }
    if (/UPDATE payment_sweep_lease/i.test(sql)) {
      return [{ name: "aged_processing_sweep" }]; // released
    }
    return [];
  };
  const prisma = {
    $queryRawUnsafe: vi.fn(async (sql: string, ...args: unknown[]) => queryHandler(sql, args)),
    employerPaymentAttempt: { findMany }
  };
  return { prisma: prisma as never, findMany };
}

const reconciled = (state: PaymentRecord["state"]): PaymentRecord =>
  ({ state } as unknown as PaymentRecord);

describe("payment sweep activation (money-golive-readiness)", () => {
  it("kill switch OFF (missing control row) → disabled: nothing selected, nothing reconciled", async () => {
    const { prisma, findMany } = fakePrisma({ killSwitchEnabled: false });
    const reconcile = vi.fn(async () => reconciled("processing"));
    const runner = createPaymentSweepRunner({ prisma, reconcile, intervalMinutes: 30 });
    const metrics = await runner.runOnce();
    expect(metrics.status).toBe("disabled");
    expect(metrics.selected).toBe(0);
    expect(findMany).not.toHaveBeenCalled(); // kill switch is checked BEFORE candidate selection
    expect(reconcile).not.toHaveBeenCalled();
  });

  it("kill switch ON + no aged candidates → completed with nothing to do", async () => {
    const { prisma, findMany } = fakePrisma({ killSwitchEnabled: true, candidates: [] });
    const reconcile = vi.fn(async () => reconciled("processing"));
    const runner = createPaymentSweepRunner({ prisma, reconcile, intervalMinutes: 30 });
    const metrics = await runner.runOnce();
    expect(metrics.status).toBe("completed");
    expect(metrics.selected).toBe(0);
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(reconcile).not.toHaveBeenCalled();
  });

  it("kill switch ON + one aged candidate → reconcile is invoked exactly once (query-only backstop)", async () => {
    const { prisma } = fakePrisma({
      killSwitchEnabled: true,
      candidates: [{ id: "pay-1", organizationId: "org-1" }]
    });
    const reconcile = vi.fn(async () => reconciled("succeeded"));
    const runner = createPaymentSweepRunner({ prisma, reconcile, intervalMinutes: 30 });
    const metrics = await runner.runOnce();
    expect(metrics.status).toBe("completed");
    expect(metrics.selected).toBe(1);
    expect(metrics.resolved).toBe(1);
    expect(reconcile).toHaveBeenCalledTimes(1);
    expect(reconcile).toHaveBeenCalledWith({ paymentId: "pay-1", organizationId: "org-1" });
  });

  it("refuses a min age below the 10-minute policy floor", () => {
    const { prisma } = fakePrisma({ killSwitchEnabled: true });
    expect(() =>
      createPaymentSweepRunner({ prisma, reconcile: async () => reconciled("processing"), intervalMinutes: 30, minAgeMs: 5 * 60_000 })
    ).toThrow(/at least 10 minutes/);
  });

  it("refuses a batch size above the bounded cap of 100", () => {
    const { prisma } = fakePrisma({ killSwitchEnabled: true });
    expect(() =>
      createPaymentSweepRunner({ prisma, reconcile: async () => reconciled("processing"), intervalMinutes: 30, maxBatchSize: 101 })
    ).toThrow(/bounded cap/);
  });
});
