import type { PrismaClient } from "@rwos/database";
import { nextWorkerPayoutStatus, workerPayoutHoldUntilMs, type WorkerPayoutStatus } from "@rwos/shared";
import { resolvePayChannel, type PayChannel, type PayStatementLine, type SlipType } from "./payChannel";

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
  // Phase 2: which channel this payout belongs to, and the statement the worker should see.
  channel: PayChannel;
  slipType: SlipType;
  statementTitle: string;
  statementLines: readonly PayStatementLine[];
  employerCostMinor: number;
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

  // Phase 2: resolve each payout's channel + statement from its payroll calculation.
  const calcDetails = await prisma.payrollCalculation.findMany({
    where: { id: { in: payouts.map((p) => p.payrollCalculationId) } },
    select: {
      id: true,
      workerClassification: true,
      grossPayMinor: true,
      totalDeductionsMinor: true,
      netPayMinor: true,
      totalEmployerCostMinor: true,
      currency: true
    }
  });
  const calcById = new Map(calcDetails.map((c) => [c.id, c]));

  return payouts.map((p) => {
    const period = periodByCalc.get(p.payrollCalculationId);
    const calc = calcById.get(p.payrollCalculationId);
    const channel = resolvePayChannel({
      classification: calc?.workerClassification ?? "employee",
      grossPayMinor: calc?.grossPayMinor ?? p.amountMinor,
      totalDeductionsMinor: calc?.totalDeductionsMinor ?? 0,
      netPayMinor: calc?.netPayMinor ?? p.amountMinor,
      totalEmployerCostMinor: calc?.totalEmployerCostMinor ?? 0,
      currency: p.currency
    });
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
      periodEnd: period ? period.periodEnd.toISOString() : p.holdUntil.toISOString(),
      channel: channel.channel,
      slipType: channel.slipType,
      statementTitle: channel.statementTitle,
      statementLines: channel.statementLines,
      employerCostMinor: channel.employerCostMinor
    };
  });
}
