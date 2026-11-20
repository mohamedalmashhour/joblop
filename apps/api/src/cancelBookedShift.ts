import { randomUUID } from "node:crypto";
import type { AssignmentRepository, AssignmentStatus, AttendanceRepository } from "@rwos/auth";
import type { PrismaClient } from "@rwos/database";

// ONE path to cancel a booked shift, used by the worker (self-cancel), the employer (request cancel)
// and staff (attendance or assignment cancel). Owner decision 2026-11-11.
//
// A shift is "booked" while its assignment holds the place (confirmed … attendance_handoff). It can be
// cancelled only before the worker has started: the attendance record is still pending_start (or there
// is none yet). Cancelling does both halves together, so the place frees and the job board reopens:
//   - the attendance record → cancelled (the shift leaves the worker's schedule; no check-in);
//   - the assignment → worker_withdrawn / employer_cancelled / platform_cancelled (the place frees).
// Each half is skipped when it is already done, so a retry, or a route that already cancelled one half
// through its governed service, converges. Authorization is the caller's job (each route checks its
// actor first); money (late-cancellation charge, worker penalty) stays with the caller too.

/** Assignment statuses that hold a place on the job (the worker is booked). */
export const BOOKED_ASSIGNMENT_STATUSES = [
  "confirmed",
  "worker_acknowledged",
  "ready_for_attendance",
  "in_attendance_window",
  "attendance_handoff"
] as const satisfies readonly AssignmentStatus[];

/** Assignment statuses that mean the booking was cancelled. */
export const CANCELLED_ASSIGNMENT_STATUSES = [
  "worker_withdrawn",
  "employer_cancelled",
  "platform_cancelled"
] as const satisfies readonly AssignmentStatus[];

export type BookedShiftCanceller = "worker" | "employer" | "staff";

const CANCELLED_STATUS_BY: Record<BookedShiftCanceller, AssignmentStatus> = {
  worker: "worker_withdrawn",
  employer: "employer_cancelled",
  staff: "platform_cancelled"
};

const isBooked = (status: string) => (BOOKED_ASSIGNMENT_STATUSES as readonly string[]).includes(status);
const isCancelled = (status: string) => (CANCELLED_ASSIGNMENT_STATUSES as readonly string[]).includes(status);

export type CancelBookedShiftResult =
  | Readonly<{
      status: "cancelled";
      assignmentId: string;
      jobRequestId: string;
      workerIdentityId: string;
      organizationId: string;
      startAt: Date;
      /** False when the assignment had already been cancelled (e.g. by its governed service). */
      assignmentCancelled: boolean;
      attendanceCancelled: boolean;
    }>
  | Readonly<{ status: "not_found" }>
  /** The worker has checked in (or the record is otherwise past pending_start): not cancellable here. */
  | Readonly<{ status: "already_started" }>
  /** The assignment is neither booked nor cancelled (e.g. closed). */
  | Readonly<{ status: "not_booked" }>
  /** A concurrent change won; nothing further was written. Retry reads the new state. */
  | Readonly<{ status: "conflict" }>;

export type CancelBookedShiftDeps = Readonly<{
  assignmentRepository: Pick<AssignmentRepository, "findAssignmentById" | "updateAssignment" | "recordAssignmentAuditEvent">;
  attendanceRepository: Pick<AttendanceRepository, "findAttendanceByAssignmentId" | "updateAttendance" | "recordAttendanceAuditEvent">;
}>;

export async function cancelBookedShift(
  deps: CancelBookedShiftDeps,
  input: Readonly<{ assignmentId: string; by: BookedShiftCanceller; actorUserId: string | null; reason: string; now: Date }>
): Promise<CancelBookedShiftResult> {
  const assignment = await deps.assignmentRepository.findAssignmentById(input.assignmentId);
  if (!assignment) return { status: "not_found" };
  const attendance = await deps.attendanceRepository.findAttendanceByAssignmentId(assignment.id);
  if (attendance && attendance.status !== "pending_start" && attendance.status !== "cancelled") {
    return { status: "already_started" };
  }
  const assignmentBooked = isBooked(assignment.status);
  if (!assignmentBooked && !isCancelled(assignment.status)) return { status: "not_booked" };

  const correlationId = `cancel-booked-shift-${randomUUID()}`;
  const reason = input.reason.trim().slice(0, 120) || `${input.by}_cancelled`;

  let attendanceCancelled = false;
  if (attendance && attendance.status === "pending_start") {
    const updated = await deps.attendanceRepository.updateAttendance({
      attendanceRecordId: attendance.id,
      expectedVersion: attendance.version,
      actorUserId: input.actorUserId,
      status: "cancelled",
      cancelledAt: input.now,
      cancelledByUserId: input.actorUserId,
      now: input.now
    });
    if (!updated) return { status: "conflict" };
    attendanceCancelled = true;
    await deps.attendanceRepository.recordAttendanceAuditEvent({
      action: "attendance.cancelled",
      organizationId: attendance.organizationId,
      attendanceRecordId: attendance.id,
      assignmentId: assignment.id,
      actorUserId: input.actorUserId,
      priorState: "pending_start",
      newState: "cancelled",
      reason,
      correlationId,
      createdAt: input.now
    });
  }

  let assignmentCancelled = false;
  if (assignmentBooked) {
    const nextStatus = CANCELLED_STATUS_BY[input.by];
    const updated = await deps.assignmentRepository.updateAssignment({
      assignmentId: assignment.id,
      expectedVersion: assignment.version,
      actorUserId: input.actorUserId,
      status: nextStatus,
      ...(input.by === "worker" ? { workerWithdrawnAt: input.now } : { cancelledAt: input.now }),
      cancellationReasonCategory: reason,
      now: input.now
    });
    if (!updated) return { status: "conflict" };
    assignmentCancelled = true;
    await deps.assignmentRepository.recordAssignmentAuditEvent({
      action: `assignment.${nextStatus}` as "assignment.worker_withdrawn" | "assignment.employer_cancelled" | "assignment.platform_cancelled",
      organizationId: assignment.organizationId,
      assignmentId: assignment.id,
      workerOfferId: assignment.workerOfferId,
      jobRequestId: assignment.jobRequestId,
      actorUserId: input.actorUserId,
      priorState: assignment.status,
      newState: nextStatus,
      reason,
      correlationId,
      createdAt: input.now
    });
  }

  return {
    status: "cancelled",
    assignmentId: assignment.id,
    jobRequestId: assignment.jobRequestId,
    workerIdentityId: assignment.workerIdentityId,
    organizationId: assignment.organizationId,
    startAt: assignment.confirmedStartAt,
    assignmentCancelled,
    attendanceCancelled
  };
}

/**
 * Why a shift can no longer be worked (check-in, timesheet), or null when it still can: the
 * assignment was cancelled, the attendance record was cancelled, or the job itself was cancelled.
 */
export async function cancelledShiftReason(
  prisma: Pick<PrismaClient, "attendanceRecord">,
  attendanceRecordId: string
): Promise<"assignment_cancelled" | "attendance_cancelled" | "job_cancelled" | null> {
  const row = await prisma.attendanceRecord.findUnique({
    where: { id: attendanceRecordId },
    select: { status: true, assignment: { select: { status: true } }, jobRequest: { select: { status: true } } }
  });
  if (!row) return null;
  if (row.status === "cancelled") return "attendance_cancelled";
  if (row.assignment && isCancelled(row.assignment.status)) return "assignment_cancelled";
  if (row.jobRequest?.status === "cancelled") return "job_cancelled";
  return null;
}

export const SHIFT_CANCELLED_BODY = {
  error: "RWOS_SHIFT_CANCELLED",
  message: "This shift was cancelled, so it cannot be worked or timed."
} as const;

export const SHIFT_ALREADY_STARTED_BODY = {
  error: "RWOS_SHIFT_ALREADY_STARTED",
  message: "This shift has already started, so it can no longer be cancelled here. Contact Joblop."
} as const;
