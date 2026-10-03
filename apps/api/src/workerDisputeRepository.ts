import type { PrismaClient } from "@rwos/database";
import type { WorkerDisputeCategory } from "@rwos/shared";

export type WorkerDisputeView = Readonly<{
  id: string;
  payrollCalculationId: string;
  organizationId: string;
  status: string;
  category: string;
  reason: string;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
}>;

export type RaiseWorkerDisputeResult =
  | { ok: true; dispute: WorkerDisputeView }
  | { ok: false; reason: "not_found" | "already_open" | "already_paid" };

function toView(d: {
  id: string;
  payrollCalculationId: string;
  organizationId: string;
  status: string;
  category: string;
  reason: string;
  resolution: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
}): WorkerDisputeView {
  return {
    id: d.id,
    payrollCalculationId: d.payrollCalculationId,
    organizationId: d.organizationId,
    status: d.status,
    category: d.category,
    reason: d.reason,
    resolution: d.resolution,
    resolvedAt: d.resolvedAt ? d.resolvedAt.toISOString() : null,
    createdAt: d.createdAt.toISOString()
  };
}

// Raise a dispute on one of the worker's own payouts (identified by its payroll calculation). The
// payout must exist and belong to this worker. A dispute cannot be raised on money already sent, nor
// duplicated while one is still open. Raising it PAUSES the payout: pending/released -> held.
export async function raiseWorkerDispute(
  prisma: PrismaClient,
  input: { workerIdentityId: string; payrollCalculationId: string; category: WorkerDisputeCategory; reason: string; now: Date }
): Promise<RaiseWorkerDisputeResult> {
  const payout = await prisma.workerPayout.findUnique({
    where: { payrollCalculationId: input.payrollCalculationId },
    select: { id: true, workerIdentityId: true, organizationId: true, status: true }
  });
  if (!payout || payout.workerIdentityId !== input.workerIdentityId) return { ok: false, reason: "not_found" };
  if (payout.status === "paid") return { ok: false, reason: "already_paid" };

  const openAlready = await prisma.workerDispute.findFirst({
    where: { workerIdentityId: input.workerIdentityId, payrollCalculationId: input.payrollCalculationId, status: "open" },
    select: { id: true }
  });
  if (openAlready) return { ok: false, reason: "already_open" };

  const created = await prisma.workerDispute.create({
    data: {
      workerIdentityId: input.workerIdentityId,
      payrollCalculationId: input.payrollCalculationId,
      organizationId: payout.organizationId,
      status: "open",
      category: input.category,
      reason: input.reason
    }
  });

  // Pause the payout while the dispute is open (not money already sent).
  if (payout.status === "pending" || payout.status === "released") {
    await prisma.workerPayout.updateMany({
      where: { id: payout.id, status: payout.status },
      data: { status: "held", heldReason: "dispute", releasedAt: null }
    });
  }

  return { ok: true, dispute: toView(created) };
}

export async function listWorkerDisputes(prisma: PrismaClient, workerIdentityId: string): Promise<WorkerDisputeView[]> {
  const rows = await prisma.workerDispute.findMany({
    where: { workerIdentityId },
    orderBy: { createdAt: "desc" }
  });
  return rows.map(toView);
}

// Withdraw an open dispute the worker raised. Only an open, owned dispute can be withdrawn. When no
// other open dispute remains on that calculation, its held payout returns to pending (its hold is
// then re-evaluated on the next read).
export async function withdrawWorkerDispute(
  prisma: PrismaClient,
  input: { workerIdentityId: string; disputeId: string; now: Date }
): Promise<{ ok: true; dispute: WorkerDisputeView } | { ok: false; reason: "not_found" | "not_open" }> {
  const dispute = await prisma.workerDispute.findUnique({ where: { id: input.disputeId } });
  if (!dispute || dispute.workerIdentityId !== input.workerIdentityId) return { ok: false, reason: "not_found" };
  if (dispute.status !== "open") return { ok: false, reason: "not_open" };

  await prisma.workerDispute.updateMany({
    where: { id: dispute.id, status: "open" },
    data: { status: "withdrawn", resolvedAt: input.now, resolution: "withdrawn_by_worker" }
  });

  const stillOpen = await prisma.workerDispute.findFirst({
    where: { workerIdentityId: input.workerIdentityId, payrollCalculationId: dispute.payrollCalculationId, status: "open" },
    select: { id: true }
  });
  if (!stillOpen) {
    await prisma.workerPayout.updateMany({
      where: { payrollCalculationId: dispute.payrollCalculationId, status: "held" },
      data: { status: "pending", heldReason: null }
    });
  }

  const updated = await prisma.workerDispute.findUnique({ where: { id: dispute.id } });
  return { ok: true, dispute: toView(updated!) };
}
