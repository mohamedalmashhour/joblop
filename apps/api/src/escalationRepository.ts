import type { PrismaClient } from "@rwos/database";

export type EscalationView = Readonly<{
  id: string;
  jobRequestId: string;
  orderId: string | null;
  organizationId: string;
  reason: string;
  status: string;
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
  jobRequestNumber: string | null;
  jobRequestTitle: string | null;
  jobRequestStatus: string | null;
  orderNumber: string | null;
}>;

export type RaiseEscalationResult =
  | { ok: true; escalationId: string }
  | { ok: false; reason: "already_open" };

// Raise an owner escalation for a role line. At most one OPEN escalation per role at a time.
export async function raiseEscalation(
  prisma: PrismaClient,
  input: { jobRequestId: string; orderId: string | null; organizationId: string; reason: string; raisedByUserId: string }
): Promise<RaiseEscalationResult> {
  const open = await prisma.requestEscalation.findFirst({ where: { jobRequestId: input.jobRequestId, status: "open" }, select: { id: true } });
  if (open) return { ok: false, reason: "already_open" };
  const created = await prisma.requestEscalation.create({
    data: {
      jobRequestId: input.jobRequestId,
      orderId: input.orderId,
      organizationId: input.organizationId,
      reason: input.reason,
      raisedByUserId: input.raisedByUserId,
      status: "open"
    }
  });
  return { ok: true, escalationId: created.id };
}

// The open owner-escalation queue, enriched with the role and order context owners need to decide.
export async function listOpenEscalations(prisma: PrismaClient): Promise<EscalationView[]> {
  const rows = await prisma.requestEscalation.findMany({ where: { status: "open" }, orderBy: { createdAt: "asc" } });
  const requestIds = rows.map((r) => r.jobRequestId);
  const orderIds = rows.map((r) => r.orderId).filter((id): id is string => id !== null);
  const requests = await prisma.jobRequest.findMany({ where: { id: { in: requestIds } }, select: { id: true, jobRequestNumber: true, title: true, status: true } });
  const orders = orderIds.length > 0 ? await prisma.employerOrder.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNumber: true } }) : [];
  const reqById = new Map(requests.map((r) => [r.id, r]));
  const orderById = new Map(orders.map((o) => [o.id, o]));
  return rows.map((e) => {
    const req = reqById.get(e.jobRequestId);
    const order = e.orderId ? orderById.get(e.orderId) : undefined;
    return {
      id: e.id,
      jobRequestId: e.jobRequestId,
      orderId: e.orderId,
      organizationId: e.organizationId,
      reason: e.reason,
      status: e.status,
      resolution: e.resolution,
      createdAt: e.createdAt.toISOString(),
      resolvedAt: e.resolvedAt ? e.resolvedAt.toISOString() : null,
      jobRequestNumber: req?.jobRequestNumber ?? null,
      jobRequestTitle: req?.title ?? null,
      jobRequestStatus: req?.status ?? null,
      orderNumber: order?.orderNumber ?? null
    };
  });
}

// Owner closes an escalation: resolved (handled) or dismissed (no action needed). Any actual approval
// happens separately through the governed intake transition.
export async function closeEscalation(
  prisma: PrismaClient,
  input: { escalationId: string; resolvedByUserId: string; resolution: string | null; dismiss: boolean; now: Date }
): Promise<{ ok: true } | { ok: false; reason: "not_found" | "not_open" }> {
  const esc = await prisma.requestEscalation.findUnique({ where: { id: input.escalationId } });
  if (!esc) return { ok: false, reason: "not_found" };
  if (esc.status !== "open") return { ok: false, reason: "not_open" };
  await prisma.requestEscalation.updateMany({
    where: { id: esc.id, status: "open" },
    data: { status: input.dismiss ? "dismissed" : "resolved", resolvedByUserId: input.resolvedByUserId, resolution: input.resolution, resolvedAt: input.now }
  });
  return { ok: true };
}
