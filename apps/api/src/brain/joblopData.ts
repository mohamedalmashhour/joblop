import type { PrismaClient } from "@rwos/database";
import { listUnfilledShifts } from "../unfilledShiftAlerts";
import type { JoblopBrainData } from "./joblopRules";

// Read-only Prisma adapter for the Joblop rules: broad, bounded candidate queries. The rules do the
// exact deciding. No row here carries money amounts.

const HOUR_MS = 3_600_000;
const BATCH = 500;

const LIVE_ASSIGNMENT = ["confirmed", "worker_acknowledged", "ready_for_attendance", "in_attendance_window", "attendance_handoff"] as const;
const UNPAID_INVOICE = ["issued", "sent", "viewed", "partially_paid", "overdue"] as const;

const CANCELLED_ASSIGNMENT = ["worker_withdrawn", "employer_cancelled", "platform_cancelled"] as const;
/** Attendance states of a shift that ended and needs hours (a cancelled one never does). */
const NEEDS_HOURS_ATTENDANCE = ["pending_start", "checked_in", "checked_out", "completed", "exception"] as const;
const PREPARE_LOOKBACK_DAYS = 14;

type Remaining =(jobs: readonly Readonly<{ id: string; numberOfWorkers: number }>[]) => Promise<Map<string, number>>;

export function createPrismaJoblopBrainData(prisma: PrismaClient, remaining: Remaining): JoblopBrainData {
  return {
    async unfilledJobs(now) {
      const shifts = await listUnfilledShifts(prisma, remaining, now);
      if (shifts.length === 0) return [];
      const ids = shifts.map((s) => s.jobRequestId);
      const [priced, bonuses, boards, cancelled] = await Promise.all([
        prisma.requestPricingSnapshot.findMany({ where: { jobRequestId: { in: ids } }, select: { jobRequestId: true } }),
        // A declined offer counts: the employer is asked once.
        prisma.jobBonus.findMany({
          where: { jobRequestId: { in: ids }, status: { in: ["offered_to_employer", "employer_accepted", "approved", "employer_declined"] } },
          select: { jobRequestId: true }
        }),
        prisma.jobRequest.findMany({ where: { id: { in: ids }, openClaim: true }, select: { id: true } }),
        prisma.assignment.groupBy({
          by: ["jobRequestId"],
          where: { jobRequestId: { in: ids }, status: { in: [...CANCELLED_ASSIGNMENT] } },
          _count: { _all: true }
        })
      ]);
      const pricedIds = new Set(priced.map((p) => p.jobRequestId));
      const bonusIds = new Set(bonuses.map((b) => b.jobRequestId));
      const boardIds = new Set(boards.map((b) => b.id));
      const cancelledCount = new Map(cancelled.map((c) => [c.jobRequestId, c._count._all]));
      return shifts.map((s) => ({
        jobRequestId: s.jobRequestId,
        jobRequestNumber: s.jobRequestNumber,
        title: s.role,
        startAt: s.startAt,
        openings: s.openings,
        filled: s.filled,
        priced: pricedIds.has(s.jobRequestId),
        hasBonus: bonusIds.has(s.jobRequestId),
        onJobBoard: boardIds.has(s.jobRequestId),
        cancelledBookings: cancelledCount.get(s.jobRequestId) ?? 0
      }));
    },

    async startedShifts(now) {
      const rows = await prisma.assignment.findMany({
        where: {
          status: { in: [...LIVE_ASSIGNMENT] },
          confirmedStartAt: { lte: now, gte: new Date(now.getTime() - 24 * HOUR_MS) },
          confirmedEndAt: { gt: now },
          // Never chase a worker whose shift was cancelled: by its attendance record or with the job.
          NOT: { attendanceRecord: { is: { status: "cancelled" } } },
          jobRequest: { status: { not: "cancelled" } }
        },
        select: {
          id: true,
          jobRequestId: true,
          confirmedTitle: true,
          confirmedStartAt: true,
          confirmedEndAt: true,
          attendanceRecord: { select: { checkInAt: true } }
        },
        orderBy: [{ confirmedStartAt: "asc" }],
        take: BATCH
      });
      return rows.map((r) => ({
        assignmentId: r.id,
        jobRequestId: r.jobRequestId,
        title: r.confirmedTitle,
        startAt: r.confirmedStartAt,
        endAt: r.confirmedEndAt,
        checkedIn: Boolean(r.attendanceRecord?.checkInAt)
      }));
    },

    async deliveryFailures(now) {
      const rows = await prisma.messageDeliveryFailure.findMany({
        where: { failedAt: { gte: new Date(now.getTime() - 24 * HOUR_MS) }, resentAt: null },
        select: { id: true, channel: true, recipient: true, failedAt: true, retryable: true, resentAt: true },
        orderBy: [{ failedAt: "asc" }],
        take: BATCH
      });
      return rows.map((r) => ({ ...r, channel: r.channel === "sms" ? "sms" : "email" }));
    },

    async requestsInReview() {
      const rows = await prisma.jobRequest.findMany({
        where: { status: { in: ["submitted", "admin_review"] } },
        select: {
          id: true,
          jobRequestNumber: true,
          title: true,
          status: true,
          submittedAt: true,
          startAt: true,
          endAt: true,
          numberOfWorkers: true,
          description: true,
          jobLength: true,
          requiredCertificateOther: true,
          residence: { select: { addressLine1: true, addressSummary: true, city: true } }
        },
        orderBy: [{ submittedAt: "asc" }],
        take: BATCH
      });
      if (rows.length === 0) return [];
      const escalated = await prisma.requestEscalation.findMany({
        where: { jobRequestId: { in: rows.map((r) => r.id) }, status: "open" },
        select: { jobRequestId: true }
      });
      const escalatedIds = new Set(escalated.map((e) => e.jobRequestId));
      return rows.map((r) => ({
        jobRequestId: r.id,
        jobRequestNumber: r.jobRequestNumber,
        title: r.title,
        status: r.status,
        submittedAt: r.submittedAt,
        startAt: r.startAt,
        endAt: r.endAt,
        numberOfWorkers: r.numberOfWorkers,
        description: r.description,
        jobLength: r.jobLength,
        hasWorksiteAddress: Boolean((r.residence?.addressLine1 ?? r.residence?.addressSummary)?.trim() && r.residence?.city?.trim()),
        requiredCertificateOther: r.requiredCertificateOther,
        openEscalation: escalatedIds.has(r.id)
      }));
    },

    async openTimesheets() {
      const rows = await prisma.timesheet.findMany({
        where: { status: { in: ["worker_review", "employer_review", "platform_review"] } },
        select: {
          id: true,
          status: true,
          scheduledStartAt: true,
          scheduledEndAt: true,
          workerReviewStatus: true,
          employerReviewStatus: true,
          actualCheckInAt: true,
          actualCheckOutAt: true,
          exceptionSummary: true,
          jobRequest: { select: { jobRequestNumber: true, title: true } },
          attendanceRecord: { select: { exceptionCategory: true } }
        },
        orderBy: [{ scheduledEndAt: "asc" }],
        take: BATCH
      });
      return rows.map((r) => ({
        timesheetId: r.id,
        jobRequestNumber: r.jobRequest.jobRequestNumber,
        title: r.jobRequest.title,
        status: r.status,
        scheduledStartAt: r.scheduledStartAt,
        scheduledEndAt: r.scheduledEndAt,
        workerReviewStatus: r.workerReviewStatus,
        employerReviewStatus: r.employerReviewStatus,
        actualCheckInAt: r.actualCheckInAt,
        actualCheckOutAt: r.actualCheckOutAt,
        exceptionSummary: r.exceptionSummary,
        attendanceException: r.attendanceRecord.exceptionCategory
      }));
    },

    async overdueInvoices(now) {
      const rows = await prisma.invoice.findMany({
        where: { status: { in: [...UNPAID_INVOICE] }, dueAt: { lt: now } },
        select: { id: true, invoiceNumber: true, status: true, dueAt: true },
        orderBy: [{ dueAt: "asc" }],
        take: BATCH
      });
      return rows.flatMap((r) => (r.dueAt ? [{ invoiceId: r.id, invoiceNumber: r.invoiceNumber, status: r.status, dueAt: r.dueAt }] : []));
    },

    async finishedShiftsWithoutTimesheet(now) {
      const rows = await prisma.attendanceRecord.findMany({
        where: {
          status: { in: [...NEEDS_HOURS_ATTENDANCE] },
          scheduledEndAt: { lte: now, gte: new Date(now.getTime() - PREPARE_LOOKBACK_DAYS * 24 * HOUR_MS) },
          timesheet: { is: null },
          assignment: { status: { notIn: [...CANCELLED_ASSIGNMENT] } },
          jobRequest: { status: { not: "cancelled" } }
        },
        select: {
          id: true,
          assignmentId: true,
          scheduledEndAt: true,
          checkInAt: true,
          jobRequest: { select: { jobRequestNumber: true, title: true } }
        },
        orderBy: [{ scheduledEndAt: "asc" }],
        take: BATCH
      });
      return rows.map((r) => ({
        attendanceRecordId: r.id,
        assignmentId: r.assignmentId,
        jobRequestNumber: r.jobRequest.jobRequestNumber,
        title: r.jobRequest.title,
        scheduledEndAt: r.scheduledEndAt,
        checkedIn: r.checkInAt !== null
      }));
    }
  };
}
