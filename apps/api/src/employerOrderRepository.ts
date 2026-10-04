import type { PrismaClient } from "@rwos/database";
import type { JobRequestService, JobRequestUrgency, JobRequestType } from "@rwos/auth";
import {
  rollupEmployerOrderStatus,
  validateEmployerOrderLines,
  type ChildRequestStatus,
  type EmployerOrderStatus
} from "@rwos/shared";

// Only the governed job-request operations the order service reuses. Each child role line is created
// and submitted through these, so every child keeps its contract-rate, site/role and 6-hour checks,
// its number sequence and its audit trail. The order layer never bypasses them.
type OrderJobRequestService = Pick<JobRequestService, "createDraft" | "submit" | "cancel">;

export type EmployerOrderChildView = Readonly<{
  jobRequestId: string;
  jobRequestNumber: string;
  roleDefinitionId: string;
  title: string;
  numberOfWorkers: number;
  status: string;
}>;

export type EmployerOrderView = Readonly<{
  id: string;
  orderNumber: string;
  organizationId: string;
  residenceId: string;
  departmentId: string;
  title: string;
  note: string | null;
  perks: string | null;
  requestType: string;
  urgency: string;
  timezone: string;
  startAt: string;
  endAt: string;
  status: EmployerOrderStatus;
  createdAt: string;
  submittedAt: string | null;
  cancelledAt: string | null;
  children: readonly EmployerOrderChildView[];
}>;

export type EmployerOrderLine = Readonly<{
  workGroup: string;
  roleDefinition: string;
  numberOfWorkers: number;
  title: string;
  description?: string;
}>;

export type CreateEmployerOrderInput = Readonly<{
  actorUserId: string;
  organizationId: string;
  residenceId: string;
  departmentId: string;
  title: string;
  note: string | null;
  perks: string | null;
  urgency: JobRequestUrgency;
  requestType: JobRequestType;
  timezone: string;
  startAt: Date;
  endAt: Date;
  lines: unknown;
}>;

export type CreateEmployerOrderResult =
  | { ok: true; order: EmployerOrderView }
  | { ok: false; reason: "no_lines" | "too_many_lines" | "invalid_line" | "child_create_failed" };

export function formatEmployerOrderNumber(year: number, sequenceValue: number): string {
  return `ORD-${year}-${String(sequenceValue).padStart(6, "0")}`;
}

type JobRequestRow = Readonly<{
  id: string;
  jobRequestNumber: string;
  roleDefinitionId: string;
  title: string;
  numberOfWorkers: number;
  status: string;
}>;

function childView(r: JobRequestRow): EmployerOrderChildView {
  return {
    jobRequestId: r.id,
    jobRequestNumber: r.jobRequestNumber,
    roleDefinitionId: r.roleDefinitionId,
    title: r.title,
    numberOfWorkers: r.numberOfWorkers,
    status: r.status
  };
}

function orderView(
  order: {
    id: string;
    orderNumber: string;
    organizationId: string;
    residenceId: string;
    departmentId: string;
    title: string;
    note: string | null;
    perks: string | null;
    requestType: string;
    urgency: string;
    timezone: string;
    startAt: Date;
    endAt: Date;
    createdAt: Date;
    submittedAt: Date | null;
    cancelledAt: Date | null;
  },
  children: readonly JobRequestRow[]
): EmployerOrderView {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    organizationId: order.organizationId,
    residenceId: order.residenceId,
    departmentId: order.departmentId,
    title: order.title,
    note: order.note,
    perks: order.perks,
    requestType: order.requestType,
    urgency: order.urgency,
    timezone: order.timezone,
    startAt: order.startAt.toISOString(),
    endAt: order.endAt.toISOString(),
    // Children are the source of truth; the order's shown status is rolled up from them.
    status: rollupEmployerOrderStatus(children.map((c) => c.status as ChildRequestStatus)),
    createdAt: order.createdAt.toISOString(),
    submittedAt: order.submittedAt ? order.submittedAt.toISOString() : null,
    cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : null,
    children: children.map(childView)
  };
}

const CHILD_SELECT = { id: true, jobRequestNumber: true, roleDefinitionId: true, title: true, numberOfWorkers: true, status: true } as const;

// Create a multi-role order: validate the lines, create one child job request per line through the
// governed createDraft (which enforces auth, contract rate, active site/role and the 6-hour minimum),
// then create the order row and link the children to it atomically. A line that createDraft rejects
// aborts the order; any children created before it remain as standalone drafts the employer can see.
export async function createEmployerOrderWithChildren(
  prisma: PrismaClient,
  jobRequestService: OrderJobRequestService,
  input: CreateEmployerOrderInput
): Promise<CreateEmployerOrderResult> {
  const validated = validateEmployerOrderLines(input.lines);
  if (!validated.ok) return { ok: false, reason: validated.reason };

  const childIds: string[] = [];
  for (const line of validated.lines) {
    try {
      const child = await jobRequestService.createDraft({
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        residenceId: input.residenceId,
        departmentId: input.departmentId,
        workGroupSlug: line.workGroup,
        roleDefinitionIdentifier: line.roleDefinition,
        title: line.title,
        description: line.description ?? null,
        numberOfWorkers: line.numberOfWorkers,
        urgency: input.urgency,
        requestType: input.requestType,
        timezone: input.timezone,
        startAt: input.startAt,
        endAt: input.endAt
      });
      childIds.push(child.id);
    } catch {
      return { ok: false, reason: "child_create_failed" };
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const year = input.startAt.getUTCFullYear();
    await tx.employerOrderSequence.upsert({ where: { scopeYear: year }, create: { scopeYear: year, lastValue: 0 }, update: {} });
    const sequence = await tx.employerOrderSequence.update({ where: { scopeYear: year }, data: { lastValue: { increment: 1 } } });
    const orderNumber = formatEmployerOrderNumber(year, sequence.lastValue);
    const order = await tx.employerOrder.create({
      data: {
        orderNumber,
        organizationId: input.organizationId,
        residenceId: input.residenceId,
        departmentId: input.departmentId,
        creatorUserId: input.actorUserId,
        createdByUserId: input.actorUserId,
        title: input.title,
        note: input.note,
        perks: input.perks,
        requestType: input.requestType,
        urgency: input.urgency,
        timezone: input.timezone,
        startAt: input.startAt,
        endAt: input.endAt,
        status: "draft"
      }
    });
    await tx.jobRequest.updateMany({ where: { id: { in: childIds }, organizationId: input.organizationId }, data: { orderId: order.id } });
    const children = await tx.jobRequest.findMany({ where: { orderId: order.id }, select: CHILD_SELECT, orderBy: { createdAt: "asc" } });
    return { order, children };
  });

  return { ok: true, order: orderView(created.order, created.children) };
}

export async function listEmployerOrders(prisma: PrismaClient, organizationId: string): Promise<EmployerOrderView[]> {
  const orders = await prisma.employerOrder.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });
  const views: EmployerOrderView[] = [];
  for (const order of orders) {
    const children = await prisma.jobRequest.findMany({ where: { orderId: order.id }, select: CHILD_SELECT, orderBy: { createdAt: "asc" } });
    views.push(orderView(order, children));
  }
  return views;
}

export async function getEmployerOrder(prisma: PrismaClient, organizationId: string, orderId: string): Promise<EmployerOrderView | null> {
  const order = await prisma.employerOrder.findFirst({ where: { id: orderId, organizationId } });
  if (!order) return null;
  const children = await prisma.jobRequest.findMany({ where: { orderId: order.id }, select: CHILD_SELECT, orderBy: { createdAt: "asc" } });
  return orderView(order, children);
}

// Submit every still-draft child through the governed submit transition (optimistic-concurrency by
// each child's version), then stamp the order submitted and roll its status up from the children.
export async function submitEmployerOrder(
  prisma: PrismaClient,
  jobRequestService: OrderJobRequestService,
  input: { actorUserId: string; organizationId: string; orderId: string; now: Date }
): Promise<{ ok: true; order: EmployerOrderView } | { ok: false; reason: "not_found" | "submit_failed" }> {
  const order = await prisma.employerOrder.findFirst({ where: { id: input.orderId, organizationId: input.organizationId } });
  if (!order) return { ok: false, reason: "not_found" };

  const children = await prisma.jobRequest.findMany({
    where: { orderId: order.id },
    select: { id: true, status: true, version: true }
  });
  for (const child of children) {
    if (child.status !== "draft" && child.status !== "information_required") continue;
    try {
      await jobRequestService.submit({ actorUserId: input.actorUserId, organizationId: input.organizationId, jobRequestId: child.id, expectedVersion: child.version });
    } catch {
      return { ok: false, reason: "submit_failed" };
    }
  }

  const refreshed = await prisma.jobRequest.findMany({ where: { orderId: order.id }, select: CHILD_SELECT, orderBy: { createdAt: "asc" } });
  const rolled = rollupEmployerOrderStatus(refreshed.map((c) => c.status as ChildRequestStatus));
  const updated = await prisma.employerOrder.update({
    where: { id: order.id },
    data: { status: rolled, submittedAt: order.submittedAt ?? input.now }
  });
  return { ok: true, order: orderView(updated, refreshed) };
}


// Cancel the whole order: cancel every child role line that is still cancellable (draft, submitted,
// information_required or approved_for_dispatch) through the governed cancel transition (optimistic-
// concurrency per child, with a reason), then stamp the order cancelled and roll its status up.
export async function cancelEmployerOrder(
  prisma: PrismaClient,
  jobRequestService: OrderJobRequestService,
  input: { actorUserId: string; organizationId: string; orderId: string; reason: string; now: Date }
): Promise<{ ok: true; order: EmployerOrderView } | { ok: false; reason: "not_found" | "cancel_failed" }> {
  const order = await prisma.employerOrder.findFirst({ where: { id: input.orderId, organizationId: input.organizationId } });
  if (!order) return { ok: false, reason: "not_found" };

  const cancellable = new Set(["draft", "submitted", "information_required", "approved_for_dispatch"]);
  const children = await prisma.jobRequest.findMany({
    where: { orderId: order.id },
    select: { id: true, status: true, version: true }
  });
  for (const child of children) {
    if (!cancellable.has(child.status)) continue;
    try {
      await jobRequestService.cancel({
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        jobRequestId: child.id,
        expectedVersion: child.version,
        reason: input.reason
      });
    } catch {
      return { ok: false, reason: "cancel_failed" };
    }
  }

  const refreshed = await prisma.jobRequest.findMany({ where: { orderId: order.id }, select: CHILD_SELECT, orderBy: { createdAt: "asc" } });
  const rolled = rollupEmployerOrderStatus(refreshed.map((c) => c.status as ChildRequestStatus));
  const updated = await prisma.employerOrder.update({
    where: { id: order.id },
    data: { status: rolled, cancelledAt: order.cancelledAt ?? input.now }
  });
  return { ok: true, order: orderView(updated, refreshed) };
}
