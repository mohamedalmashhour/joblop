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

// What staff need to settle a dispute: who raised it, and the payout it is holding.
export type StaffWorkerDisputeView = WorkerDisputeView & Readonly<{
  workerDisplayName: string | null;
  organizationName: string | null;
  payout: Readonly<{ id: string; status: string; amountMinor: number; currency: string; heldReason: string | null }> | null;
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
// other open dispute remains on that calculation, its held payout returns to pending.
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

  await releaseHoldIfUndisputed(prisma, dispute.payrollCalculationId);

  const updated = await prisma.workerDispute.findUnique({ where: { id: dispute.id } });
  return { ok: true, dispute: toView(updated!) };
}

// A held payout returns to pending once no open dispute remains on its calculation. Its hold is then
// re-evaluated on the next read, so it continues through the normal lifecycle.
async function releaseHoldIfUndisputed(
  client: Pick<PrismaClient, "workerDispute" | "workerPayout">,
  payrollCalculationId: string
): Promise<void> {
  const stillOpen = await client.workerDispute.findFirst({
    where: { payrollCalculationId, status: "open" },
    select: { id: true }
  });
  if (stillOpen) return;
  await client.workerPayout.updateMany({
    where: { payrollCalculationId, status: "held" },
    data: { status: "pending", heldReason: null }
  });
}

const STAFF_DISPUTE_LIST_LIMIT = 100;

// Staff queue, oldest first so the longest-held payouts come up first.
export async function listWorkerDisputesForStaff(
  prisma: PrismaClient,
  input: { status: "open" | "resolved" | "withdrawn" }
): Promise<StaffWorkerDisputeView[]> {
  const rows = await prisma.workerDispute.findMany({
    where: { status: input.status },
    orderBy: { createdAt: "asc" },
    take: STAFF_DISPUTE_LIST_LIMIT,
    include: { workerIdentity: { select: { displayName: true } } }
  });
  const calcIds = rows.map((r) => r.payrollCalculationId);
  const orgIds = [...new Set(rows.map((r) => r.organizationId))];
  const [payouts, organizations] = await Promise.all([
    prisma.workerPayout.findMany({
      where: { payrollCalculationId: { in: calcIds } },
      select: { id: true, payrollCalculationId: true, status: true, amountMinor: true, currency: true, heldReason: true }
    }),
    prisma.employerOrganization.findMany({ where: { id: { in: orgIds } }, select: { id: true, displayName: true } })
  ]);
  const payoutByCalc = new Map(payouts.map((p) => [p.payrollCalculationId, p]));
  const orgName = new Map(organizations.map((o) => [o.id, o.displayName]));
  return rows.map((r) => {
    const payout = payoutByCalc.get(r.payrollCalculationId);
    return {
      ...toView(r),
      workerDisplayName: r.workerIdentity.displayName,
      organizationName: orgName.get(r.organizationId) ?? null,
      payout: payout
        ? { id: payout.id, status: payout.status, amountMinor: payout.amountMinor, currency: payout.currency, heldReason: payout.heldReason }
        : null
    };
  });
}

// Staff settle an open dispute. This records the decision and lifts the hold; it never changes an
// amount. If the worker is owed something different, staff correct it through payroll, which is the
// only place money figures change.
export async function resolveWorkerDispute(
  prisma: PrismaClient,
  input: { disputeId: string; resolution: string; now: Date }
): Promise<
  | { ok: true; dispute: WorkerDisputeView }
  | { ok: false; reason: "not_found" | "not_open" }
> {
  return prisma.$transaction(async (tx) => {
    const dispute = await tx.workerDispute.findUnique({ where: { id: input.disputeId } });
    if (!dispute) return { ok: false, reason: "not_found" } as const;
    const updated = await tx.workerDispute.updateMany({
      where: { id: dispute.id, status: "open" },
      data: { status: "resolved", resolvedAt: input.now, resolution: input.resolution }
    });
    if (updated.count === 0) return { ok: false, reason: "not_open" } as const;
    await releaseHoldIfUndisputed(tx, dispute.payrollCalculationId);
    const resolved = await tx.workerDispute.findUnique({ where: { id: dispute.id } });
    return { ok: true, dispute: toView(resolved!) } as const;
  });
}
