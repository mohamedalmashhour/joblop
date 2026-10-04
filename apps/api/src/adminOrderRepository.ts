import type { PrismaClient } from "@rwos/database";
import { rollupEmployerOrderStatus, recommendOrderRole, type AiManagerRecommendation, type AiManagerReasonCode, type ChildRequestStatus, type EmployerOrderStatus } from "@rwos/shared";

const REVIEW_STATES = ["submitted", "admin_review", "information_required"] as const;

export type AdminOrderChildView = Readonly<{
  jobRequestId: string;
  jobRequestNumber: string;
  roleDefinitionId: string;
  title: string;
  numberOfWorkers: number;
  status: string;
  version: number;
  adminReviewReason: string | null;
  recommendation: AiManagerRecommendation;
  suggestedMarginPpm: number;
  reasonCodes: readonly AiManagerReasonCode[];
}>;

export type AdminOrderView = Readonly<{
  id: string;
  orderNumber: string;
  organizationId: string;
  residenceId: string;
  departmentId: string;
  title: string;
  note: string | null;
  perks: string | null;
  urgency: string;
  requestType: string;
  timezone: string;
  startAt: string;
  endAt: string;
  status: EmployerOrderStatus;
  createdAt: string;
  submittedAt: string | null;
  children: readonly AdminOrderChildView[];
}>;

const CHILD_SELECT = {
  id: true,
  jobRequestNumber: true,
  roleDefinitionId: true,
  title: true,
  numberOfWorkers: true,
  status: true,
  version: true,
  adminReviewReason: true
} as const;

type OrderRow = {
  id: string;
  orderNumber: string;
  organizationId: string;
  residenceId: string;
  departmentId: string;
  title: string;
  note: string | null;
  perks: string | null;
  urgency: string;
  requestType: string;
  timezone: string;
  startAt: Date;
  endAt: Date;
  createdAt: Date;
  submittedAt: Date | null;
};

type ChildRow = {
  id: string;
  jobRequestNumber: string;
  roleDefinitionId: string;
  title: string;
  numberOfWorkers: number;
  status: string;
  version: number;
  adminReviewReason: string | null;
};

function view(order: OrderRow, children: readonly ChildRow[]): AdminOrderView {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    organizationId: order.organizationId,
    residenceId: order.residenceId,
    departmentId: order.departmentId,
    title: order.title,
    note: order.note,
    perks: order.perks,
    urgency: order.urgency,
    requestType: order.requestType,
    timezone: order.timezone,
    startAt: order.startAt.toISOString(),
    endAt: order.endAt.toISOString(),
    status: rollupEmployerOrderStatus(children.map((c) => c.status as ChildRequestStatus)),
    createdAt: order.createdAt.toISOString(),
    submittedAt: order.submittedAt ? order.submittedAt.toISOString() : null,
    children: children.map((c) => {
      const triage = recommendOrderRole({ urgency: order.urgency, numberOfWorkers: c.numberOfWorkers });
      return {
        jobRequestId: c.id,
        jobRequestNumber: c.jobRequestNumber,
        roleDefinitionId: c.roleDefinitionId,
        title: c.title,
        numberOfWorkers: c.numberOfWorkers,
        status: c.status,
        version: c.version,
        adminReviewReason: c.adminReviewReason,
        recommendation: triage.recommendation,
        suggestedMarginPpm: triage.suggestedMarginPpm,
        reasonCodes: triage.reasonCodes
      };
    })
  };
}

// Orders with at least one child role line still in a review state (submitted / admin_review /
// information_required). Platform-wide (admin sees every organization's work). Read-only grouping;
// the governed per-role review actions remain the existing intake endpoints.
export async function listPlatformOrdersInReview(prisma: PrismaClient): Promise<AdminOrderView[]> {
  const orders = await prisma.employerOrder.findMany({
    where: { jobRequests: { some: { status: { in: [...REVIEW_STATES] } } } },
    orderBy: { createdAt: "desc" }
  });
  const views: AdminOrderView[] = [];
  for (const order of orders) {
    const children = await prisma.jobRequest.findMany({ where: { orderId: order.id }, select: CHILD_SELECT, orderBy: { createdAt: "asc" } });
    views.push(view(order, children));
  }
  return views;
}

export async function getPlatformOrder(prisma: PrismaClient, orderId: string): Promise<AdminOrderView | null> {
  const order = await prisma.employerOrder.findUnique({ where: { id: orderId } });
  if (!order) return null;
  const children = await prisma.jobRequest.findMany({ where: { orderId: order.id }, select: CHILD_SELECT, orderBy: { createdAt: "asc" } });
  return view(order, children);
}
