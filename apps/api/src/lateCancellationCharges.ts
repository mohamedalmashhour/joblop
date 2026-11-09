import type { PrismaClient } from "@rwos/database";
import {
  LATE_CANCELLATION_CHARGE_HOURS,
  LATE_CANCELLATION_CUTOFF_HOURS,
  LATE_CANCELLATION_TIMESHEET_MARKER,
  planLateCancellationCharge,
  type LateCancellationChargePlan
} from "@rwos/shared";
import { CONFIRMED_ASSIGNMENT_STATUSES } from "@rwos/auth";
import { autoGenerateInvoiceForLockedTimesheet } from "./invoiceFromTimesheet";
import type { InvoiceRepository } from "./invoiceRepository";

// Late employer cancellation charge (pricing promise: canceled less than 24 hours before the start,
// each confirmed worker is billed 6 hours). Runs only on the EMPLOYER cancel paths, never on staff,
// Joblop or worker cancellations.
//
// Billing goes through the existing path: for each confirmed worker a locked timesheet marked
// "late_cancellation" (billable 6 h, payable 0) is written, and the usual draft invoice is generated
// from it, so GST/QST, numbering, approval, issue and collection all work as for a worked shift.
// Owner decision 2026-11-09: no automatic worker pay. Payroll skips these timesheets; staff see each
// charge and its worker in admin and decide case by case.
//
// One charge row per assignment: assignment_id and the idempotency key are unique, so a retry, a
// replayed confirm or a race can never bill the same worker twice.

export type ConfirmedAssignment = Readonly<{ assignmentId: string; workerIdentityId: string; jobRequestId: string }>;

export type LateCancellationSource = "employer_cancel_confirm" | "employer_order_cancel" | "employer_job_cancel";

/** Workers holding a confirmed place on the given jobs right now. Read BEFORE the cancel runs. */
export async function readConfirmedAssignments(
  prisma: PrismaClient,
  organizationId: string,
  jobRequestIds: readonly string[]
): Promise<ConfirmedAssignment[]> {
  if (jobRequestIds.length === 0) return [];
  const rows = await prisma.assignment.findMany({
    where: { organizationId, jobRequestId: { in: [...jobRequestIds] }, status: { in: [...CONFIRMED_ASSIGNMENT_STATUSES] as never } },
    select: { id: true, workerIdentityId: true, jobRequestId: true }
  });
  return rows.map((row) => ({ assignmentId: row.id, workerIdentityId: row.workerIdentityId, jobRequestId: row.jobRequestId }));
}

type JobBilling = Readonly<{ startAt: Date; jobLength: string | null; employerHourlyRateMinor: number | null; currency: string }>;

async function readJobBilling(prisma: PrismaClient, organizationId: string, jobRequestIds: readonly string[]) {
  const jobs = await prisma.jobRequest.findMany({
    where: { organizationId, id: { in: [...jobRequestIds] } },
    select: {
      id: true,
      startAt: true,
      jobLength: true,
      pricingSnapshot: { select: { employerHourlyRateMinor: true, currency: true, jobLength: true } }
    }
  });
  const map = new Map<string, JobBilling>();
  for (const job of jobs) {
    map.set(job.id, {
      startAt: job.startAt,
      // The snapshot is what invoicing uses; a long-term marker on either side excludes the job.
      jobLength: job.pricingSnapshot?.jobLength === "long_term" || job.jobLength === "long_term" ? "long_term" : job.jobLength,
      employerHourlyRateMinor: job.pricingSnapshot?.employerHourlyRateMinor ?? null,
      currency: job.pricingSnapshot?.currency ?? "CAD"
    });
  }
  return map;
}

export type LateCancellationPreview = Readonly<{
  applies: boolean;
  cutoffHours: number;
  chargeHours: number;
  confirmedWorkers: number;
  /** Pre-tax estimate. GST and QST are added on the invoice. Never a rate or Joblop's share. */
  estimatedSubtotalMinor: number;
  currency: string;
}>;

/** What canceling these jobs now would bill the employer (read-only, server clock). */
export async function previewLateCancellation(
  prisma: PrismaClient,
  input: Readonly<{ organizationId: string; jobRequestIds: readonly string[]; now: Date }>
): Promise<LateCancellationPreview> {
  const [billing, confirmed] = await Promise.all([
    readJobBilling(prisma, input.organizationId, input.jobRequestIds),
    readConfirmedAssignments(prisma, input.organizationId, input.jobRequestIds)
  ]);
  let workers = 0;
  let subtotal = 0;
  let currency = "CAD";
  for (const [jobRequestId, job] of billing) {
    const plan = planFor(job, input.now, confirmed.filter((a) => a.jobRequestId === jobRequestId));
    if (!plan.applies) continue;
    workers += plan.charges.length;
    subtotal += plan.subtotalMinor;
    currency = job.currency;
  }
  return {
    applies: workers > 0,
    cutoffHours: LATE_CANCELLATION_CUTOFF_HOURS,
    chargeHours: LATE_CANCELLATION_CHARGE_HOURS,
    confirmedWorkers: workers,
    estimatedSubtotalMinor: subtotal,
    currency
  };
}

function planFor(job: JobBilling, cancelledAt: Date, confirmed: readonly ConfirmedAssignment[]): LateCancellationChargePlan {
  return planLateCancellationCharge({
    initiator: "employer",
    shiftStartAt: job.startAt,
    cancelledAt,
    jobLength: job.jobLength,
    employerHourlyRateMinor: job.employerHourlyRateMinor,
    confirmedAssignments: confirmed
  });
}

export type LateCancellationOutcome = Readonly<{
  plan: LateCancellationChargePlan | null;
  charged: readonly Readonly<{ assignmentId: string; chargeId: string; invoiceId: string | null }>[];
  skipped: readonly Readonly<{ assignmentId: string; reason: string }>[];
}>;

/**
 * Applies the charge for one job the employer just cancelled. `confirmed` must be read before the
 * cancel; `cancelledAt` is the moment the employer cancelled (server clock). Idempotent per worker.
 */
export async function applyLateCancellationCharges(
  prisma: PrismaClient,
  invoiceRepository: InvoiceRepository | null,
  input: Readonly<{
    organizationId: string;
    jobRequestId: string;
    actorUserId: string;
    cancelledAt: Date;
    source: LateCancellationSource;
    cancellationId?: string | null;
    confirmed: readonly ConfirmedAssignment[];
  }>
): Promise<LateCancellationOutcome> {
  const billing = (await readJobBilling(prisma, input.organizationId, [input.jobRequestId])).get(input.jobRequestId);
  if (!billing) return { plan: null, charged: [], skipped: [] };
  const plan = planFor(billing, input.cancelledAt, input.confirmed.filter((a) => a.jobRequestId === input.jobRequestId));
  if (!plan.applies) return { plan, charged: [], skipped: [] };

  const charged: { assignmentId: string; chargeId: string; invoiceId: string | null }[] = [];
  const skipped: { assignmentId: string; reason: string }[] = [];
  for (const charge of plan.charges) {
    let written: { chargeId: string; timesheetId: string } | { skip: string };
    try {
      written = await writeCharge(prisma, input, billing, plan, charge.assignmentId, charge.subtotalMinor);
    } catch (error) {
      written = { skip: isUniqueViolation(error) ? "already_charged" : "write_failed" };
    }
    if ("skip" in written) {
      skipped.push({ assignmentId: charge.assignmentId, reason: written.skip });
      continue;
    }
    let invoiceId: string | null = null;
    let invoiceError: string | null = invoiceRepository ? null : "invoice_repository_unavailable";
    if (invoiceRepository) {
      const invoice = await autoGenerateInvoiceForLockedTimesheet(prisma, invoiceRepository, written.timesheetId, input.actorUserId);
      if (invoice.ok) invoiceId = invoice.invoiceId;
      else invoiceError = invoice.reason.slice(0, 500);
    }
    await prisma.lateCancellationCharge
      .update({ where: { id: written.chargeId }, data: { invoiceId, invoiceError } })
      .catch(() => undefined);
    charged.push({ assignmentId: charge.assignmentId, chargeId: written.chargeId, invoiceId });
  }
  return { plan, charged, skipped };
}

async function writeCharge(
  prisma: PrismaClient,
  input: Parameters<typeof applyLateCancellationCharges>[2],
  billing: JobBilling,
  plan: LateCancellationChargePlan,
  assignmentId: string,
  subtotalMinor: number
): Promise<{ chargeId: string; timesheetId: string } | { skip: string }> {
  return prisma.$transaction(async (tx) => {
    if (await tx.lateCancellationCharge.findUnique({ where: { assignmentId }, select: { id: true } })) {
      return { skip: "already_charged" };
    }
    const assignment = await tx.assignment.findFirst({
      where: { id: assignmentId, organizationId: input.organizationId, jobRequestId: input.jobRequestId },
      select: {
        id: true, version: true, workerIdentityId: true, residenceId: true, departmentId: true, workGroupId: true,
        roleDefinitionId: true, status: true, confirmedStartAt: true, confirmedEndAt: true, timezone: true
      }
    });
    if (!assignment) return { skip: "assignment_not_found" };
    // A timesheet already exists: the worker started (or the shift was handled another way). Worked
    // time is billed through its own timesheet, with the 6-hour minimum, so nothing is added here.
    if (await tx.timesheet.findUnique({ where: { assignmentId }, select: { id: true } })) {
      return { skip: "timesheet_exists" };
    }
    let attendance = await tx.attendanceRecord.findUnique({
      where: { assignmentId },
      select: { id: true, version: true, status: true }
    });
    if (attendance && !["pending_start", "cancelled", "missed"].includes(attendance.status)) {
      return { skip: "attendance_started" };
    }
    if (!attendance) {
      attendance = await tx.attendanceRecord.create({
        data: {
          assignmentId,
          jobRequestId: input.jobRequestId,
          workerIdentityId: assignment.workerIdentityId,
          organizationId: input.organizationId,
          residenceId: assignment.residenceId,
          departmentId: assignment.departmentId,
          workGroupId: assignment.workGroupId,
          roleDefinitionId: assignment.roleDefinitionId,
          status: "cancelled",
          scheduledStartAt: assignment.confirmedStartAt,
          scheduledEndAt: assignment.confirmedEndAt,
          timezone: assignment.timezone,
          assignmentStatusSnapshot: assignment.status,
          exceptionCategory: LATE_CANCELLATION_TIMESHEET_MARKER,
          createdByUserId: input.actorUserId,
          cancelledByUserId: input.actorUserId,
          cancelledAt: input.cancelledAt
        },
        select: { id: true, version: true, status: true }
      });
    }
    const now = new Date();
    const timesheet = await tx.timesheet.create({
      data: {
        assignmentId,
        attendanceRecordId: attendance.id,
        jobRequestId: input.jobRequestId,
        workerIdentityId: assignment.workerIdentityId,
        organizationId: input.organizationId,
        residenceId: assignment.residenceId,
        departmentId: assignment.departmentId,
        workGroupId: assignment.workGroupId,
        roleDefinitionId: assignment.roleDefinitionId,
        status: "locked",
        attendanceVersionSnapshot: attendance.version,
        assignmentVersionSnapshot: assignment.version,
        scheduledStartAt: assignment.confirmedStartAt,
        scheduledEndAt: assignment.confirmedEndAt,
        timezone: assignment.timezone,
        rawElapsedMinutes: 0,
        payableMinutes: 0,
        billableMinutes: LATE_CANCELLATION_CHARGE_HOURS * 60,
        exceptionSummary: LATE_CANCELLATION_TIMESHEET_MARKER,
        workerReviewStatus: "not_required",
        employerReviewStatus: "not_required",
        platformReviewStatus: "not_required",
        approvedAt: now,
        lockedAt: now,
        createdByUserId: input.actorUserId
      },
      select: { id: true }
    });
    const created = await tx.lateCancellationCharge.create({
      data: {
        idempotencyKey: `late-cancel:${input.jobRequestId}:${assignmentId}`,
        organizationId: input.organizationId,
        jobRequestId: input.jobRequestId,
        assignmentId,
        workerIdentityId: assignment.workerIdentityId,
        cancellationId: input.cancellationId ?? null,
        source: input.source,
        cancelledByUserId: input.actorUserId,
        cancelledAt: input.cancelledAt,
        shiftStartAt: billing.startAt,
        minutesBeforeStart: plan.minutesBeforeStart,
        chargeHours: plan.chargeHours,
        employerHourlyRateMinor: plan.employerHourlyRateMinor,
        subtotalMinor,
        currency: billing.currency,
        timesheetId: timesheet.id
      },
      select: { id: true }
    });
    return { chargeId: created.id, timesheetId: timesheet.id };
  });
}

export type LateCancellationChargeRow = Readonly<{
  id: string;
  organizationName: string;
  jobRequestId: string;
  jobRequestNumber: string;
  jobTitle: string;
  shiftStartAt: string;
  cancelledAt: string;
  minutesBeforeStart: number;
  source: string;
  workerIdentityId: string;
  workerName: string | null;
  chargeHours: number;
  subtotalMinor: number;
  currency: string;
  invoiceId: string | null;
  invoiceStatus: string | null;
  invoiceTotalMinor: number | null;
  invoiceError: string | null;
  workerFollowUp: string;
}>;

/** Staff view: every late-cancellation charge with the confirmed worker it affected, newest first. */
export async function listLateCancellationCharges(prisma: PrismaClient, limit = 100): Promise<LateCancellationChargeRow[]> {
  const rows = await prisma.lateCancellationCharge.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 500),
    include: {
      organization: { select: { displayName: true } },
      jobRequest: { select: { jobRequestNumber: true, title: true } }
    }
  });
  const workerIds = [...new Set(rows.map((r) => r.workerIdentityId))];
  const invoiceIds = rows.map((r) => r.invoiceId).filter((id): id is string => id !== null);
  const [workers, invoices] = await Promise.all([
    workerIds.length
      ? prisma.workerIdentity.findMany({ where: { id: { in: workerIds } }, select: { id: true, displayName: true } })
      : Promise.resolve([]),
    invoiceIds.length
      ? prisma.invoice.findMany({ where: { id: { in: invoiceIds } }, select: { id: true, status: true, totalMinor: true } })
      : Promise.resolve([])
  ]);
  const workerName = new Map(workers.map((w) => [w.id, w.displayName]));
  const invoiceById = new Map(invoices.map((i) => [i.id, i]));
  return rows.map((row) => {
    const invoice = row.invoiceId ? invoiceById.get(row.invoiceId) : undefined;
    return {
      id: row.id,
      organizationName: row.organization.displayName,
      jobRequestId: row.jobRequestId,
      jobRequestNumber: row.jobRequest.jobRequestNumber,
      jobTitle: row.jobRequest.title,
      shiftStartAt: row.shiftStartAt.toISOString(),
      cancelledAt: row.cancelledAt.toISOString(),
      minutesBeforeStart: row.minutesBeforeStart,
      source: row.source,
      workerIdentityId: row.workerIdentityId,
      workerName: workerName.get(row.workerIdentityId) ?? null,
      chargeHours: row.chargeHours,
      subtotalMinor: row.subtotalMinor,
      currency: row.currency,
      invoiceId: row.invoiceId,
      invoiceStatus: invoice?.status ?? null,
      invoiceTotalMinor: invoice ? Number(invoice.totalMinor) : null,
      invoiceError: row.invoiceError,
      workerFollowUp: row.workerFollowUp
    };
  });
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}
