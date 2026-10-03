import type { PrismaClient } from "@rwos/database";
import { nextWorkerPayoutStatus, workerPayoutHoldUntilMs, type WorkerPayoutStatus } from "@rwos/shared";

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
// then move each payout to the status the world dictates (pure nextWorkerPayoutStatus): an open
// dispute on its calculation holds it; a resolved/withdrawn dispute un-holds it; a pending payout
// past its two-week hold with no dispute is released automatically. Reporting/ledger only: it
// creates/updates ledger rows; the external Interac/EFT send ("paid") is a provider integration.
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

  // Which of these payouts' calculations currently carry an OPEN dispute.
  const openDisputes = await prisma.workerDispute.findMany({
    where: {
      workerIdentityId,
      status: "open",
      payrollCalculationId: { in: payouts.map((p) => p.payrollCalculationId) }
    },
    select: { payrollCalculationId: true }
  });
  const disputed = new Set(openDisputes.map((d) => d.payrollCalculationId));

  for (const p of payouts) {
    const next = nextWorkerPayoutStatus({
      status: p.status as WorkerPayoutStatus,
      holdUntilMs: p.holdUntil.getTime(),
      nowMs: now.getTime(),
      hasOpenDispute: disputed.has(p.payrollCalculationId)
    });
    if (next === p.status) continue;
    const data: { status: WorkerPayoutStatus; releasedAt?: Date; heldReason?: string | null } = { status: next };
    if (next === "released") data.releasedAt = now;
    if (next === "held") data.heldReason = "dispute";
    if (next === "pending") data.heldReason = null;
    await prisma.workerPayout.updateMany({ where: { id: p.id, status: p.status }, data });
    p.status = next;
    if (next === "released") p.releasedAt = now;
    if (next === "held") p.heldReason = "dispute";
    if (next === "pending") p.heldReason = null;
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
