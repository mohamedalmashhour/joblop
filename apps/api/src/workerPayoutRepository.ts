import type { PrismaClient } from "@rwos/database";
import {
  WORKER_PAYOUT_HOLD_DAYS,
  canRegisterWorkerPayout,
  nextWorkerPayoutStatus,
  workerPayoutHoldUntilMs,
  workerPayoutRegisterableAtMs,
  workerPayoutStage,
  type WorkerPayoutStage,
  type WorkerPayoutStatus
} from "@rwos/shared";
import { resolvePayChannel, type PayChannel, type PayStatementLine, type SalesTax, type SlipType } from "./payChannel";

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
  // Phase 2: the TEST payment reference recorded when the payout was marked paid (null until paid).
  paymentRef: string | null;
  // Phase 2 two-timer hold: the job-completion anchor, when the 48h dispute window ends, and when the
  // amount became confirmed/"registered in the worker's account" (null until registered). `stage` is
  // the worker-facing state: review_window → registered → paid (or held).
  completionAt: string | null;
  disputeWindowEndsAt: string | null;
  registeredAt: string | null;
  stage: WorkerPayoutStage;
  periodStart: string;
  periodEnd: string;
  // Phase 2: which channel this payout belongs to, and the statement the worker should see.
  channel: PayChannel;
  slipType: SlipType;
  statementTitle: string;
  statementLines: readonly PayStatementLine[];
  employerCostMinor: number;
  salesTax: SalesTax | null;
  // What the worker actually receives: net pay (employee) or fee + collected GST/QST (contractor).
  // `amountMinor` above remains the base payroll amount; this is authoritative for "amount paid".
  workerReceivesMinor: number;
}>;

/** A payout that just became REGISTERED this pass — the caller fires the "registered in your account"
 *  notification for each (the amount is now confirmed/the worker's). */
export type NewlyRegisteredPayout = Readonly<{
  id: string;
  workerIdentityId: string;
  amountMinor: number;
  currency: string;
}>;

export type MaterializedWorkerPayouts = Readonly<{
  payouts: WorkerPayoutView[];
  newlyRegistered: readonly NewlyRegisteredPayout[];
}>;

// Job completion = the latest point at which all the work in the calculation was actually finished.
// The authoritative signal is the worker's ACTUAL check-out on the approved timesheet that fed the
// calculation (`Timesheet.actualCheckOutAt` — the normalized, reviewed real shift end), resolved per
// worked-time reference via its `timesheetId`. When a reference's timesheet carries no actual
// check-out (e.g. an auto-generated or not-yet-checked-out timesheet), that reference falls back to
// its `scheduledEndAt`. The calculation's completion is the latest such per-reference value. When a
// calculation has no worked-time references at all, the caller falls back to the pay-period end, so
// the 48h dispute window always has a defined anchor.
export type CompletionRef = Readonly<{ payrollCalculationId: string; timesheetId: string; scheduledEndAt: Date }>;

// Pure completion selection (unit-tested): per worked-time reference, the ACTUAL worker check-out on
// its timesheet when recorded, otherwise that reference's scheduled end; the calculation's completion
// is the latest such value across its references. Kept separate from the DB query so the
// actual-vs-scheduled anchor logic can be verified without seeding the full timesheet FK chain.
export function resolveCompletionByCalc(
  refs: readonly CompletionRef[],
  actualCheckOutByTimesheetId: ReadonlyMap<string, Date | null>
): Map<string, Date> {
  const map = new Map<string, Date>();
  for (const r of refs) {
    const completion = actualCheckOutByTimesheetId.get(r.timesheetId) ?? r.scheduledEndAt;
    const current = map.get(r.payrollCalculationId);
    if (!current || completion.getTime() > current.getTime()) {
      map.set(r.payrollCalculationId, completion);
    }
  }
  return map;
}

async function completionByCalc(
  prisma: PrismaClient,
  calcIds: readonly string[]
): Promise<Map<string, Date>> {
  if (calcIds.length === 0) return new Map();
  const refs = await prisma.payrollWorkedTimeReference.findMany({
    where: { payrollCalculationId: { in: [...calcIds] } },
    select: { payrollCalculationId: true, timesheetId: true, scheduledEndAt: true }
  });
  // Resolve the ACTUAL check-out for each referenced timesheet (null when it has none).
  const timesheetIds = [...new Set(refs.map((r) => r.timesheetId))];
  const timesheets = timesheetIds.length
    ? await prisma.timesheet.findMany({
        where: { id: { in: timesheetIds } },
        select: { id: true, actualCheckOutAt: true }
      })
    : [];
  const actualCheckOutById = new Map<string, Date | null>(timesheets.map((t) => [t.id, t.actualCheckOutAt]));
  return resolveCompletionByCalc(refs, actualCheckOutById);
}

// Materialize a pending payout for each of the worker's LOCKED payroll calculations that has none,
// then move each payout through the two-timer lifecycle (pure helpers): an open dispute holds it; a
// resolved/withdrawn dispute un-holds it; once its 48h completion-anchored dispute window has elapsed
// with no dispute it is REGISTERED (the amount becomes confirmed — the caller notifies the worker);
// and only a REGISTERED pending payout past its 14-day period-end transfer hold with no dispute is
// released automatically. Reporting/ledger only; the external (TEST) send ("paid") is executed
// elsewhere. Returns the views plus the payouts that newly registered this pass.
export async function materializeAndListWorkerPayouts(
  prisma: PrismaClient,
  workerIdentityId: string,
  now: Date
): Promise<MaterializedWorkerPayouts> {
  const newlyRegistered: NewlyRegisteredPayout[] = [];
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
  const completions = await completionByCalc(prisma, lockedCalcs.map((c) => c.id));
  for (const c of lockedCalcs) {
    if (have.has(c.id)) continue;
    const holdUntil = new Date(workerPayoutHoldUntilMs(c.payrollPeriod.periodEnd.getTime()));
    // The 48h dispute window anchors on job completion (latest shift end), not the pay-period end.
    const completionAt = completions.get(c.id) ?? c.payrollPeriod.periodEnd;
    await prisma.workerPayout
      .create({
        data: {
          workerIdentityId,
          payrollCalculationId: c.id,
          organizationId: c.organizationId,
          currency: c.currency,
          amountMinor: c.netPayMinor,
          status: "pending",
          holdUntil,
          completionAt
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

  // Completion anchors for every payout's calculation (superset of the locked ones), used to backfill
  // legacy rows whose completionAt is null and to evaluate the 48h window.
  const completionAll = await completionByCalc(prisma, payouts.map((p) => p.payrollCalculationId));
  const holdMs = WORKER_PAYOUT_HOLD_DAYS * 86_400_000;

  for (const p of payouts) {
    const hasOpenDispute = disputed.has(p.payrollCalculationId);

    // Backfill a missing completion anchor (legacy rows): the calc's latest shift end, else the
    // period-end the 14-day hold was derived from (holdUntil - 14 days). Persist so reads are stable.
    if (!p.completionAt) {
      const derived = completionAll.get(p.payrollCalculationId) ?? new Date(p.holdUntil.getTime() - holdMs);
      await prisma.workerPayout.updateMany({ where: { id: p.id, completionAt: null }, data: { completionAt: derived } });
      p.completionAt = derived;
    }

    // 48h dispute/confirmation window → REGISTERED. Set registeredAt once; collect for notification.
    if (
      !p.registeredAt &&
      canRegisterWorkerPayout({
        status: p.status as WorkerPayoutStatus,
        isRegistered: false,
        completionMs: p.completionAt.getTime(),
        nowMs: now.getTime(),
        hasOpenDispute
      })
    ) {
      const updated = await prisma.workerPayout.updateMany({ where: { id: p.id, registeredAt: null }, data: { registeredAt: now } });
      if (updated.count > 0) {
        p.registeredAt = now;
        newlyRegistered.push({ id: p.id, workerIdentityId, amountMinor: p.amountMinor, currency: p.currency });
      }
    }

    // Status transitions (dispute pause/resume; registered + 14-day hold → released).
    const next = nextWorkerPayoutStatus({
      status: p.status as WorkerPayoutStatus,
      isRegistered: p.registeredAt !== null,
      holdUntilMs: p.holdUntil.getTime(),
      nowMs: now.getTime(),
      hasOpenDispute
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

  // Phase 2b: the worker's GST/QST registration (contractors only; applied in the channel resolver).
  const taxProfile = await prisma.workerTaxProfile.findUnique({
    where: { workerIdentityId },
    select: { gstQstRegistered: true }
  });
  const gstQstRegistered = taxProfile?.gstQstRegistered === true;

  const views = payouts.map((p): WorkerPayoutView => {
    const period = periodByCalc.get(p.payrollCalculationId);
    const calc = calcById.get(p.payrollCalculationId);
    const channel = resolvePayChannel({
      classification: calc?.workerClassification ?? "employee",
      grossPayMinor: calc?.grossPayMinor ?? p.amountMinor,
      totalDeductionsMinor: calc?.totalDeductionsMinor ?? 0,
      netPayMinor: calc?.netPayMinor ?? p.amountMinor,
      totalEmployerCostMinor: calc?.totalEmployerCostMinor ?? 0,
      currency: p.currency,
      gstQstRegistered
    });
    const isRegistered = p.registeredAt !== null;
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
      paymentRef: p.paymentRef,
      completionAt: p.completionAt ? p.completionAt.toISOString() : null,
      disputeWindowEndsAt: p.completionAt
        ? new Date(workerPayoutRegisterableAtMs(p.completionAt.getTime())).toISOString()
        : null,
      registeredAt: p.registeredAt ? p.registeredAt.toISOString() : null,
      stage: workerPayoutStage({ status: p.status as WorkerPayoutStatus, isRegistered }),
      periodStart: period ? period.periodStart.toISOString() : p.holdUntil.toISOString(),
      periodEnd: period ? period.periodEnd.toISOString() : p.holdUntil.toISOString(),
      channel: channel.channel,
      slipType: channel.slipType,
      statementTitle: channel.statementTitle,
      statementLines: channel.statementLines,
      employerCostMinor: channel.employerCostMinor,
      salesTax: channel.salesTax,
      workerReceivesMinor: channel.workerReceivesMinor
    };
  });

  return { payouts: views, newlyRegistered };
}
