import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AttendanceService, AuthorizationRoleKey, SessionValidationResult, TimesheetService } from "@rwos/auth";
import type { PrismaClient } from "@rwos/database";
import { CANCELLED_ASSIGNMENT_STATUSES, SHIFT_CANCELLED_BODY } from "./cancelBookedShift";
import {
  approveReportedHours,
  approvedEvidenceSummary,
  hoursReportAvailability,
  hoursReportRejectedEmail,
  hoursReportRejectedSmsText,
  hoursReportStaffAlertEmail,
  localDayOf,
  normalizeReportReason,
  resolveReportedTimes,
  type HoursReportStatus,
  type HoursReportUnavailable,
  type ReportedTimesError
} from "./hoursReport";
import { LONG_TERM_NO_TIMESHEETS_BODY } from "./longTermNoTimesheets";
import type { EmailSender } from "./mailer/emailSender";
import type { SmsSender } from "./mailer/smsSender";
import { sendsText } from "./notifications/noticeChannels";
import { resolveWorkerLanguage } from "./notifications/workerLanguage";

// Routes for "Report my hours" (rules and messages in hoursReport.ts):
//   POST /worker/attendance/:attendanceRecordId/report-hours           worker: report arrival/departure
//   GET  /platform/attendance/hours-reports                           staff: the reports (pending first)
//   POST /platform/attendance/hours-reports/:hoursReportId/approve     staff: approve (times may be edited)
//   POST /platform/attendance/hours-reports/:hoursReportId/reject      staff: reject with a reason
// Every step is audited (audit_events, entity "attendance_hours_report"); approving also writes the
// attendance audit events through the attendance service. No money is read or written here.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_FOUND = { error: "RWOS_SHIFT_NOT_FOUND", message: "That shift is not on your schedule." } as const;

const UNAVAILABLE_MESSAGE: Record<HoursReportUnavailable, string> = {
  cancelled: "This shift was cancelled, so no hours can be reported for it.",
  long_term: "This is a long-term job: Joblop keeps no hours for it.",
  checked_in: "This shift already has a check-in or check-out.",
  not_reportable: "Hours can no longer be reported for this shift.",
  not_ended: "You can report your hours once the shift has ended.",
  window_closed: "Hours can be reported up to 48 hours after the shift ends. Contact Joblop.",
  already_pending: "Your hours for this shift are already waiting for Joblop to approve.",
  already_approved: "Your hours for this shift were already approved."
};

const INVALID_MESSAGE: Record<ReportedTimesError | "reason_required", string> = {
  invalid_time: "Enter the arrival and departure times as HH:MM.",
  end_before_start: "The departure time must be after the arrival time.",
  in_future: "The departure time cannot be in the future.",
  reason_required: "Write a short reason."
};

export type HoursReportRouteDeps = Readonly<{
  prisma: PrismaClient | null;
  validateSession: (request: FastifyRequest) => Promise<SessionValidationResult>;
  resolveAuthorizationRoles: (userId: string) => Promise<readonly AuthorizationRoleKey[]> | readonly AuthorizationRoleKey[];
  attendanceService: AttendanceService;
  timesheetService: TimesheetService;
  emailSender: EmailSender;
  smsSender?: SmsSender | undefined;
  staffEmail: string | null;
  isLongTermAttendance: (attendanceRecordId: string) => Promise<boolean>;
  serializeTimesheet: (timesheet: Awaited<ReturnType<TimesheetService["calculate"]>>) => unknown;
  now?: () => Date;
}>;

const isCancelledAssignment = (status: string) => (CANCELLED_ASSIGNMENT_STATUSES as readonly string[]).includes(status);

function clockIn(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: timeZone || "America/Toronto", hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).format(at);
}

function readBody(request: FastifyRequest): Record<string, unknown> {
  return request.body && typeof request.body === "object" ? (request.body as Record<string, unknown>) : {};
}

function readString(body: Record<string, unknown>, key: string): string | null {
  const value = body[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function routeParam(request: FastifyRequest, key: string): string {
  const params = (request.params ?? {}) as Record<string, unknown>;
  return typeof params[key] === "string" ? (params[key] as string) : "";
}

/** The latest hours report per attendance record (for the worker's schedule). */
export async function latestHoursReports(
  prisma: Pick<PrismaClient, "attendanceHoursReport">,
  attendanceRecordIds: readonly string[]
): Promise<Map<string, HoursReportStatus>> {
  const out = new Map<string, HoursReportStatus>();
  if (attendanceRecordIds.length === 0) return out;
  const rows = await prisma.attendanceHoursReport.findMany({
    where: { attendanceRecordId: { in: [...attendanceRecordIds] } },
    orderBy: [{ submittedAt: "desc" }],
    select: { attendanceRecordId: true, status: true }
  });
  for (const row of rows) {
    if (!out.has(row.attendanceRecordId)) out.set(row.attendanceRecordId, row.status as HoursReportStatus);
  }
  return out;
}

async function recordHoursReportAudit(
  prisma: PrismaClient,
  input: Readonly<{
    reportId: string;
    organizationId: string;
    attendanceRecordId: string;
    actorUserId: string;
    actorLabel: string;
    action: "attendance_hours_report.submitted" | "attendance_hours_report.approved" | "attendance_hours_report.rejected";
    priorState: string | null;
    newState: string;
    reason: string | null;
    now: Date;
  }>
) {
  const actor = await prisma.auditActorReference.create({
    data: { actorType: "user", userId: input.actorUserId, organizationId: input.organizationId, displayLabel: input.actorLabel }
  });
  await prisma.auditEvent.create({
    data: {
      actorReferenceId: actor.id,
      organizationId: input.organizationId,
      entityType: "attendance_hours_report",
      entityId: input.reportId,
      entityPublicReference: input.attendanceRecordId,
      action: input.action,
      priorState: input.priorState,
      newState: input.newState,
      reason: input.reason ? input.reason.slice(0, 500) : null,
      source: "api",
      correlationId: randomUUID(),
      policyVersion: "hours-report-v1",
      createdAt: input.now
    }
  });
}

export function registerHoursReportRoutes(app: FastifyInstance, deps: HoursReportRouteDeps): void {
  const now = deps.now ?? (() => new Date());

  const requireStaff = async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await deps.validateSession(request);
    if (!session.authenticated || !session.user) {
      reply.code(401).send({ error: "RWOS_PLATFORM_DENIED", message: "Authentication is required." });
      return null;
    }
    const roles = await deps.resolveAuthorizationRoles(session.user.id);
    if (!roles.includes("PLATFORM_ADMINISTRATOR")) {
      reply.code(403).send({ error: "RWOS_PLATFORM_DENIED", message: "Platform authority is required." });
      return null;
    }
    if (!deps.prisma) {
      reply.code(503).send({ error: "RWOS_UNAVAILABLE", message: "Not available." });
      return null;
    }
    return { session, roles, user: session.user, prisma: deps.prisma };
  };

  // ── Worker: report the hours of a shift worked with no check-in ──
  app.post("/worker/attendance/:attendanceRecordId/report-hours", async (request, reply) => {
    const session = await deps.validateSession(request);
    if (!session.authenticated || !session.user) return reply.code(401).send({ error: "RWOS_ATTENDANCE_DENIED", message: "Authentication is required." });
    const prisma = deps.prisma;
    if (!prisma) return reply.code(503).send({ error: "RWOS_UNAVAILABLE", message: "Not available." });
    const userId = session.user.id;
    const attendanceRecordId = routeParam(request, "attendanceRecordId");
    if (!UUID.test(attendanceRecordId)) return reply.code(404).send(NOT_FOUND);

    const [identity, row] = await Promise.all([
      prisma.workerIdentity.findUnique({ where: { userId }, select: { id: true } }),
      prisma.attendanceRecord.findUnique({
        where: { id: attendanceRecordId },
        select: {
          id: true, workerIdentityId: true, organizationId: true, status: true, scheduledStartAt: true, scheduledEndAt: true, timezone: true,
          checkInAt: true, checkOutAt: true,
          assignment: { select: { status: true } },
          jobRequest: { select: { status: true, jobRequestNumber: true, title: true, roleDefinition: { select: { displayLabel: true } } } }
        }
      })
    ]);
    // Someone else's shift looks exactly like a missing one.
    if (!identity || !row || row.workerIdentityId !== identity.id) return reply.code(404).send(NOT_FOUND);

    const currentTime = now();
    const latest = await latestHoursReports(prisma, [row.id]);
    const availability = hoursReportAvailability(
      {
        attendanceStatus: row.status,
        assignmentCancelled: isCancelledAssignment(row.assignment.status),
        jobCancelled: row.jobRequest.status === "cancelled",
        scheduledStartAt: row.scheduledStartAt,
        scheduledEndAt: row.scheduledEndAt,
        checkInAt: row.checkInAt,
        checkOutAt: row.checkOutAt,
        latestReportStatus: latest.get(row.id) ?? null,
        longTerm: await deps.isLongTermAttendance(row.id)
      },
      currentTime
    );
    if (!availability.available) {
      return reply.code(409).send({ error: "RWOS_HOURS_REPORT_NOT_AVAILABLE", reason: availability.reason, message: UNAVAILABLE_MESSAGE[availability.reason] });
    }

    const body = readBody(request);
    const reason = normalizeReportReason(body.reason);
    if (!reason) return reply.code(400).send({ error: "RWOS_HOURS_REPORT_INVALID", reason: "reason_required", message: INVALID_MESSAGE.reason_required });
    const times = resolveReportedTimes(row, readString(body, "arrivalTime") ?? "", readString(body, "departureTime") ?? "", currentTime);
    if (!times.ok) return reply.code(400).send({ error: "RWOS_HOURS_REPORT_INVALID", reason: times.error, message: INVALID_MESSAGE[times.error] });

    let report;
    try {
      report = await prisma.attendanceHoursReport.create({
        data: {
          attendanceRecordId: row.id,
          workerIdentityId: identity.id,
          organizationId: row.organizationId,
          status: "pending",
          reportedCheckInAt: times.checkInAt,
          reportedCheckOutAt: times.checkOutAt,
          reason,
          submittedByUserId: userId,
          submittedAt: currentTime
        },
        select: { id: true, status: true, reportedCheckInAt: true, reportedCheckOutAt: true }
      });
    } catch (error) {
      // The partial unique index: a second pending report for the same shift (a double tap).
      if ((error as { code?: unknown }).code === "P2002") {
        return reply.code(409).send({ error: "RWOS_HOURS_REPORT_NOT_AVAILABLE", reason: "already_pending", message: UNAVAILABLE_MESSAGE.already_pending });
      }
      throw error;
    }
    await recordHoursReportAudit(prisma, {
      reportId: report.id, organizationId: row.organizationId, attendanceRecordId: row.id, actorUserId: userId, actorLabel: "Worker (report my hours)",
      action: "attendance_hours_report.submitted", priorState: null, newState: "pending", reason, now: currentTime
    });

    if (deps.staffEmail) {
      const timezone = row.timezone || "America/Toronto";
      await deps.emailSender
        .send(
          hoursReportStaffAlertEmail({
            to: deps.staffEmail,
            jobCode: row.jobRequest.jobRequestNumber,
            title: row.jobRequest.roleDefinition?.displayLabel?.trim() || row.jobRequest.title,
            startAt: row.scheduledStartAt,
            timezone,
            arrival: clockIn(times.checkInAt, timezone),
            departure: clockIn(times.checkOutAt, timezone),
            reason
          })
        )
        .catch(() => undefined);
    }

    return reply.code(201).send({
      hoursReport: {
        id: report.id,
        status: report.status,
        reportedCheckInAt: report.reportedCheckInAt.toISOString(),
        reportedCheckOutAt: report.reportedCheckOutAt.toISOString()
      }
    });
  });

  // ── Staff: the reports ──
  app.get("/platform/attendance/hours-reports", async (request, reply) => {
    const staff = await requireStaff(request, reply);
    if (!staff) return;
    const query = (request.query ?? {}) as Record<string, unknown>;
    const wanted = typeof query.status === "string" ? query.status : "pending";
    const statusFilter = wanted === "all" ? {} : { status: ["pending", "approved", "rejected"].includes(wanted) ? wanted : "pending" };
    const rows = await staff.prisma.attendanceHoursReport.findMany({
      where: statusFilter,
      orderBy: [{ submittedAt: "desc" }],
      take: 100,
      select: {
        id: true, attendanceRecordId: true, status: true, reportedCheckInAt: true, reportedCheckOutAt: true, reason: true, submittedAt: true,
        approvedCheckInAt: true, approvedCheckOutAt: true, decidedAt: true, decisionReason: true,
        attendanceRecord: {
          select: {
            status: true, scheduledStartAt: true, scheduledEndAt: true, timezone: true,
            organization: { select: { displayName: true } },
            workerIdentity: { select: { displayName: true, user: { select: { displayName: true } } } },
            jobRequest: { select: { jobRequestNumber: true, title: true } }
          }
        }
      }
    });
    return reply.code(200).send({
      reports: rows.map((r) => {
        const tz = r.attendanceRecord.timezone || "America/Toronto";
        return {
          id: r.id,
          attendanceRecordId: r.attendanceRecordId,
          status: r.status,
          attendanceStatus: r.attendanceRecord.status,
          jobRequestNumber: r.attendanceRecord.jobRequest.jobRequestNumber,
          title: r.attendanceRecord.jobRequest.title,
          employerName: r.attendanceRecord.organization.displayName,
          workerName: r.attendanceRecord.workerIdentity.displayName ?? r.attendanceRecord.workerIdentity.user?.displayName ?? null,
          scheduledStartAt: r.attendanceRecord.scheduledStartAt.toISOString(),
          scheduledEndAt: r.attendanceRecord.scheduledEndAt.toISOString(),
          timezone: tz,
          shiftDay: localDayOf(r.attendanceRecord.scheduledStartAt, tz),
          scheduledArrival: clockIn(r.attendanceRecord.scheduledStartAt, tz),
          scheduledDeparture: clockIn(r.attendanceRecord.scheduledEndAt, tz),
          reportedCheckInAt: r.reportedCheckInAt.toISOString(),
          reportedCheckOutAt: r.reportedCheckOutAt.toISOString(),
          reportedArrival: clockIn(r.reportedCheckInAt, tz),
          reportedDeparture: clockIn(r.reportedCheckOutAt, tz),
          reason: r.reason,
          submittedAt: r.submittedAt.toISOString(),
          approvedCheckInAt: r.approvedCheckInAt?.toISOString() ?? null,
          approvedCheckOutAt: r.approvedCheckOutAt?.toISOString() ?? null,
          decidedAt: r.decidedAt?.toISOString() ?? null,
          decisionReason: r.decisionReason
        };
      })
    });
  });

  const loadReport = (prisma: PrismaClient, id: string) =>
    prisma.attendanceHoursReport.findUnique({
      where: { id },
      select: {
        id: true, attendanceRecordId: true, organizationId: true, status: true, reportedCheckInAt: true, reportedCheckOutAt: true,
        attendanceRecord: {
          select: {
            status: true, scheduledStartAt: true, scheduledEndAt: true, timezone: true,
            assignment: { select: { status: true } },
            jobRequest: { select: { status: true, title: true, roleDefinition: { select: { displayLabel: true } } } },
            workerIdentity: { select: { preferredLanguage: true, user: { select: { emailNormalized: true, phone: true, primaryLanguage: true } } } }
          }
        }
      }
    });

  // ── Staff: approve (times may be edited) ──
  app.post("/platform/attendance/hours-reports/:hoursReportId/approve", async (request, reply) => {
    const staff = await requireStaff(request, reply);
    if (!staff) return;
    const { prisma, session, roles, user } = staff;
    const id = routeParam(request, "hoursReportId");
    const report = UUID.test(id) ? await loadReport(prisma, id) : null;
    if (!report) return reply.code(404).send({ error: "RWOS_HOURS_REPORT_NOT_FOUND", message: "Report not found." });
    if (report.status !== "pending") return reply.code(409).send({ error: "RWOS_HOURS_REPORT_DECIDED", message: "This report was already decided." });
    const shift = report.attendanceRecord;
    if (shift.status === "cancelled" || isCancelledAssignment(shift.assignment.status) || shift.jobRequest.status === "cancelled") {
      return reply.code(409).send(SHIFT_CANCELLED_BODY);
    }
    if (await deps.isLongTermAttendance(report.attendanceRecordId)) return reply.code(409).send(LONG_TERM_NO_TIMESHEETS_BODY);

    const currentTime = now();
    const body = readBody(request);
    const arrival = readString(body, "arrivalTime");
    const departure = readString(body, "departureTime");
    let checkInAt = report.reportedCheckInAt;
    let checkOutAt = report.reportedCheckOutAt;
    if (arrival || departure) {
      const tz = shift.timezone || "America/Toronto";
      const times = resolveReportedTimes(shift, arrival ?? clockIn(checkInAt, tz), departure ?? clockIn(checkOutAt, tz), currentTime);
      if (!times.ok) return reply.code(400).send({ error: "RWOS_HOURS_REPORT_INVALID", reason: times.error, message: INVALID_MESSAGE[times.error] });
      checkInAt = times.checkInAt;
      checkOutAt = times.checkOutAt;
    }
    const edited = checkInAt.getTime() !== report.reportedCheckInAt.getTime() || checkOutAt.getTime() !== report.reportedCheckOutAt.getTime();

    // Claim the report first, so two staff clicks never approve it twice.
    const claimed = await prisma.attendanceHoursReport.updateMany({
      where: { id: report.id, status: "pending" },
      data: {
        status: "approved",
        approvedCheckInAt: checkInAt,
        approvedCheckOutAt: checkOutAt,
        decidedByUserId: user.id,
        decidedAt: currentTime,
        decisionReason: edited ? "times_edited_by_staff" : null
      }
    });
    if (claimed.count !== 1) return reply.code(409).send({ error: "RWOS_HOURS_REPORT_DECIDED", message: "This report was already decided." });

    const { timesheet } = await approveReportedHours(
      { attendanceService: deps.attendanceService, timesheetService: deps.timesheetService },
      {
        session,
        roles,
        attendanceRecordId: report.attendanceRecordId,
        checkInAt,
        checkOutAt,
        evidenceSummary: approvedEvidenceSummary({ staffLabel: user.emailNormalized || user.id, approvedAt: currentTime, edited })
      },
      // Nothing was written on the attendance record: the report goes back to staff.
      async () => {
        await prisma.attendanceHoursReport.updateMany({
          where: { id: report.id, status: "approved" },
          data: { status: "pending", approvedCheckInAt: null, approvedCheckOutAt: null, decidedByUserId: null, decidedAt: null, decisionReason: null }
        });
      }
    );
    await recordHoursReportAudit(prisma, {
      reportId: report.id, organizationId: report.organizationId, attendanceRecordId: report.attendanceRecordId, actorUserId: user.id, actorLabel: "Staff (reported hours)",
      action: "attendance_hours_report.approved", priorState: "pending", newState: "approved",
      reason: `${checkInAt.toISOString()}–${checkOutAt.toISOString()}${edited ? " (times edited by staff)" : ""}`, now: currentTime
    });
    return reply.code(200).send({
      hoursReport: { id: report.id, status: "approved", approvedCheckInAt: checkInAt.toISOString(), approvedCheckOutAt: checkOutAt.toISOString() },
      timesheet: deps.serializeTimesheet(timesheet)
    });
  });

  // ── Staff: reject with a reason (the worker is told) ──
  app.post("/platform/attendance/hours-reports/:hoursReportId/reject", async (request, reply) => {
    const staff = await requireStaff(request, reply);
    if (!staff) return;
    const { prisma, user } = staff;
    const id = routeParam(request, "hoursReportId");
    const report = UUID.test(id) ? await loadReport(prisma, id) : null;
    if (!report) return reply.code(404).send({ error: "RWOS_HOURS_REPORT_NOT_FOUND", message: "Report not found." });
    const reason = normalizeReportReason(readBody(request).reason);
    if (!reason) return reply.code(400).send({ error: "RWOS_HOURS_REPORT_INVALID", reason: "reason_required", message: INVALID_MESSAGE.reason_required });
    const currentTime = now();
    const rejected = await prisma.attendanceHoursReport.updateMany({
      where: { id: report.id, status: "pending" },
      data: { status: "rejected", decidedByUserId: user.id, decidedAt: currentTime, decisionReason: reason }
    });
    if (rejected.count !== 1) return reply.code(409).send({ error: "RWOS_HOURS_REPORT_DECIDED", message: "This report was already decided." });
    await recordHoursReportAudit(prisma, {
      reportId: report.id, organizationId: report.organizationId, attendanceRecordId: report.attendanceRecordId, actorUserId: user.id, actorLabel: "Staff (reported hours)",
      action: "attendance_hours_report.rejected", priorState: "pending", newState: "rejected", reason, now: currentTime
    });

    // Tell the worker in their language: email; a text only when they have no email.
    const shift = report.attendanceRecord;
    const worker = shift.workerIdentity;
    const language = resolveWorkerLanguage(worker.user?.primaryLanguage, worker.preferredLanguage);
    const line = {
      title: shift.jobRequest.roleDefinition?.displayLabel?.trim() || shift.jobRequest.title,
      startAt: shift.scheduledStartAt,
      timezone: shift.timezone || "America/Toronto",
      language
    };
    const email = worker.user?.emailNormalized ?? null;
    let notified = false;
    if (email) {
      const sent = await deps.emailSender.send(hoursReportRejectedEmail({ ...line, to: email, reason })).catch(() => null);
      notified = sent?.status === "sent";
    }
    const phone = worker.user?.phone ?? null;
    if (deps.smsSender && phone && sendsText("hours_report_rejected", { urgent: !email })) {
      const sent = await deps.smsSender.send({ to: phone, text: hoursReportRejectedSmsText(line) }).catch(() => null);
      notified = notified || sent?.status === "sent";
    }
    return reply.code(200).send({ hoursReport: { id: report.id, status: "rejected", decisionReason: reason }, workerNotified: notified });
  });
}
