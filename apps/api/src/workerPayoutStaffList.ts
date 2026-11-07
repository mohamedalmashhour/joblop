import type { PrismaClient } from "@rwos/database";

const STAFF_PAYOUT_LIST_LIMIT = 100;

export type StaffWorkerPayoutView = Readonly<{
  id: string;
  workerDisplayName: string | null;
  organizationName: string | null;
  amountMinor: number;
  currency: string;
  status: string;
  holdUntil: string;
  paidAt: string | null;
  paymentRef: string | null;
}>;

// What finance staff need to see and act on a worker's payout, newest first. It reads only: payouts
// move through their lifecycle elsewhere.
export async function listWorkerPayoutsForStaff(prisma: PrismaClient): Promise<StaffWorkerPayoutView[]> {
  const rows = await prisma.workerPayout.findMany({
    orderBy: [{ holdUntil: "desc" }, { id: "asc" }],
    take: STAFF_PAYOUT_LIST_LIMIT,
    select: {
      id: true,
      workerIdentityId: true,
      organizationId: true,
      amountMinor: true,
      currency: true,
      status: true,
      holdUntil: true,
      paidAt: true,
      paymentRef: true
    }
  });
  const [workers, organizations] = await Promise.all([
    prisma.workerIdentity.findMany({
      where: { id: { in: [...new Set(rows.map((row) => row.workerIdentityId))] } },
      select: { id: true, displayName: true, user: { select: { displayName: true } } }
    }),
    prisma.employerOrganization.findMany({
      where: { id: { in: [...new Set(rows.map((row) => row.organizationId))] } },
      select: { id: true, displayName: true }
    })
  ]);
  // A worker profile often has no name of its own yet; the account's name is the next best.
  const workerName = new Map(workers.map((worker) => [worker.id, worker.displayName ?? worker.user?.displayName ?? null]));
  const organizationName = new Map(organizations.map((organization) => [organization.id, organization.displayName]));
  return rows.map((row) => ({
    id: row.id,
    workerDisplayName: workerName.get(row.workerIdentityId) ?? null,
    organizationName: organizationName.get(row.organizationId) ?? null,
    amountMinor: row.amountMinor,
    currency: row.currency,
    status: row.status,
    holdUntil: row.holdUntil.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null,
    paymentRef: row.paymentRef
  }));
}
