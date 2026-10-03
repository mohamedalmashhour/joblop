import type { PrismaClient } from "@rwos/database";
import { canReleaseWorkerPayout, workerPayoutHoldUntilMs } from "@rwos/shared";

export type WorkerPayoutView = Readonly<{
  id: string;
  payrollCalculationId: string;
  organizationId: string;
  currency: string;
  amountMinor: number;
  status: string;
  holdUntil: string;
  releasedAt: string | null;
  paidAt: string | null;
  heldReason: string | null;
  periodStart: string;
  periodEnd: string;
}>;

// Materialize a pending payout for each of the worker's LOCKED payroll calculations that has none,
// then auto-release any pending payout whose hold has elapsed. Dispute support is not wired yet, so
// hasOpenDispute is false here (the disputes slice flips this). Reporting-only: it creates/releases
// ledger rows; the external Interac/EFT send ("paid") is a provider integration handled separately.
export async function materializeAndListWorkerPayouts(
  prisma: PrismaClient,
  workerIdentityId: string,
  now: Date
): Promise<WorkerPayoutView[]> {
  const lockedCalcs = await prisma.payrollCalculation.findMany({
    where: { workerIdentityId, status: "locked" },
    select: {
      id: true,
      organizationId: true,
      currency: true,
      netPayMinor: true,
      payrollPeriod: { select: { periodStart: true, periodEnd: true } }
    }
  });
  const existing = await prisma.workerPayout.findMany({
    where: { payrollCalculationId: { in: lockedCalcs.map((c) => c.id) } },
    select: { payrollCalculationId: true }
  });
  const have = new Set(existing.map((e) => e.payrollCalculationId));
  for (const c of lockedCalcs) {
    if (have.has(c.id)) continue;
    const holdUntil = new Date(workerPayoutHoldUntilMs(c.payrollPeriod.periodEnd.getTime()));
    await prisma.workerPayout
      .create({
        data: {
          workerIdentityId,
          payrollCalculationId: c.id,
          organizationId: c.organizationId,
          currency: c.currency,
          amountMinor: c.netPayMinor,
          status: "pending",
          holdUntil
        }
      })
      .catch(() => undefined); // tolerate a concurrent create (unique on payrollCalculationId)
  }

  const payouts = await prisma.workerPayout.findMany({
    where: { workerIdentityId },
    orderBy: { createdAt: "desc" }
  });
  for (const p of payouts) {
    if (
      canReleaseWorkerPayout({
        status: p.status,
        holdUntilMs: p.holdUntil.getTime(),
        nowMs: now.getTime(),
        hasOpenDispute: false
      })
    ) {
      await prisma.workerPayout.updateMany({
        where: { id: p.id, status: "pending" },
        data: { status: "released", releasedAt: now }
      });
      p.status = "released";
      p.releasedAt = now;
    }
  }

  const periodByCalc = new Map(lockedCalcs.map((c) => [c.id, c.payrollPeriod]));
  return payouts.map((p) => {
    const period = periodByCalc.get(p.payrollCalculationId);
    return {
      id: p.id,
      payrollCalculationId: p.payrollCalculationId,
      organizationId: p.organizationId,
      currency: p.currency,
      amountMinor: p.amountMinor,
      status: p.status,
      holdUntil: p.holdUntil.toISOString(),
      releasedAt: p.releasedAt ? p.releasedAt.toISOString() : null,
      paidAt: p.paidAt ? p.paidAt.toISOString() : null,
      heldReason: p.heldReason,
      periodStart: period ? period.periodStart.toISOString() : p.holdUntil.toISOString(),
      periodEnd: period ? period.periodEnd.toISOString() : p.holdUntil.toISOString()
    };
  });
}
