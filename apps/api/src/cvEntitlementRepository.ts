import type { PrismaClient } from "@rwos/database";

// Worker Pro entitlement store. Server-side enforced; payments FROZEN (admin grant now, gated purchase
// later). Append-only grants; a grant supersedes prior active rows for the same worker.

export const PRO_PLAN = "pro";

export type EntitlementView = Readonly<{
  plan: string;
  status: string;
  source: string;
  expiresAt: string | null;
  createdAt: string;
}>;

/** The worker's active entitlement (status 'active' and not expired), or null. */
export async function getActiveEntitlement(prisma: PrismaClient, workerRef: string): Promise<EntitlementView | null> {
  const row = await prisma.cvEntitlement.findFirst({
    where: { workerRef, status: "active", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    orderBy: { createdAt: "desc" }
  });
  return row
    ? { plan: row.plan, status: row.status, source: row.source, expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null, createdAt: row.createdAt.toISOString() }
    : null;
}

export async function isPro(prisma: PrismaClient, workerRef: string): Promise<boolean> {
  const ent = await getActiveEntitlement(prisma, workerRef);
  return ent?.plan === PRO_PLAN;
}

export type GrantInput = Readonly<{
  workerRef: string;
  plan?: string;
  source?: "admin_grant" | "trial" | "purchase";
  grantedByUserId?: string | null;
  expiresAt?: Date | null;
}>;

/** Grant (or renew) an entitlement; supersedes the worker's prior active rows. Returns the active view. */
export async function grantEntitlement(prisma: PrismaClient, input: GrantInput): Promise<EntitlementView> {
  const plan = input.plan ?? PRO_PLAN;
  return prisma.$transaction(async (tx) => {
    await tx.cvEntitlement.updateMany({ where: { workerRef: input.workerRef, status: "active" }, data: { status: "revoked" } });
    const row = await tx.cvEntitlement.create({
      data: {
        workerRef: input.workerRef,
        plan,
        status: "active",
        source: input.source ?? "admin_grant",
        grantedByUserId: input.grantedByUserId ?? null,
        expiresAt: input.expiresAt ?? null
      }
    });
    return { plan: row.plan, status: row.status, source: row.source, expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null, createdAt: row.createdAt.toISOString() };
  });
}

/** Revoke all active entitlements for a worker. Returns how many rows were revoked. */
export async function revokeEntitlement(prisma: PrismaClient, workerRef: string): Promise<number> {
  const res = await prisma.cvEntitlement.updateMany({ where: { workerRef, status: "active" }, data: { status: "revoked" } });
  return res.count;
}
