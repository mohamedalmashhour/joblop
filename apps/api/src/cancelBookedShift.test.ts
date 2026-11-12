import { describe, expect, it } from "vitest";
import { CONFIRMED_ASSIGNMENT_STATUSES } from "@rwos/auth";
import {
  BOOKED_ASSIGNMENT_STATUSES,
  cancelBookedShift,
  cancelledShiftReason,
  type CancelBookedShiftDeps
} from "./cancelBookedShift";

const NOW = new Date("2027-02-11T19:00:00.000Z");
const START = new Date("2027-02-12T13:00:00.000Z");

type Assignment = { id: string; status: string; version: number; organizationId: string; workerOfferId: string; jobRequestId: string; workerIdentityId: string; confirmedStartAt: Date; workerWithdrawnAt?: Date | null; cancelledAt?: Date | null };
type Attendance = { id: string; assignmentId: string; organizationId: string; status: string; version: number; cancelledAt?: Date | null };

function fakes(input: { assignmentStatus?: string; attendanceStatus?: string | null; staleAssignment?: boolean }) {
  const assignment: Assignment = {
    id: "a-1", status: input.assignmentStatus ?? "attendance_handoff", version: 3, organizationId: "org-1",
    workerOfferId: "offer-1", jobRequestId: "job-1", workerIdentityId: "w-1", confirmedStartAt: START
  };
  const attendance: Attendance | null =
    input.attendanceStatus === null ? null : { id: "att-1", assignmentId: "a-1", organizationId: "org-1", status: input.attendanceStatus ?? "pending_start", version: 1 };
  const audits: string[] = [];
  const deps = {
    assignmentRepository: {
      findAssignmentById: async (id: string) => (id === assignment.id ? { ...assignment } : null),
      updateAssignment: async (u: { expectedVersion: number; status?: string; workerWithdrawnAt?: Date | null; cancelledAt?: Date | null }) => {
        if (input.staleAssignment || u.expectedVersion !== assignment.version) return null;
        Object.assign(assignment, { status: u.status, version: assignment.version + 1, workerWithdrawnAt: u.workerWithdrawnAt ?? null, cancelledAt: u.cancelledAt ?? null });
        return { ...assignment };
      },
      recordAssignmentAuditEvent: async (e: { action: string }) => void audits.push(e.action)
    },
    attendanceRepository: {
      findAttendanceByAssignmentId: async () => (attendance ? { ...attendance } : null),
      updateAttendance: async (u: { expectedVersion: number; status?: string; cancelledAt?: Date | null }) => {
        if (!attendance || u.expectedVersion !== attendance.version) return null;
        Object.assign(attendance, { status: u.status, version: attendance.version + 1, cancelledAt: u.cancelledAt ?? null });
        return { ...attendance };
      },
      recordAttendanceAuditEvent: async (e: { action: string }) => void audits.push(e.action)
    }
  } as unknown as CancelBookedShiftDeps;
  return { deps, assignment, attendance, audits };
}

const run = (deps: CancelBookedShiftDeps, by: "worker" | "employer" | "staff") =>
  cancelBookedShift(deps, { assignmentId: "a-1", by, actorUserId: "u-1", reason: `${by}_cancelled`, now: NOW });

describe("cancel a booked shift (one path for worker, employer and staff)", () => {
  it("cancels the attendance record and the assignment together, with an audit for each", async () => {
    const { deps, assignment, attendance, audits } = fakes({});
    const result = await run(deps, "worker");
    expect(result).toMatchObject({ status: "cancelled", assignmentCancelled: true, attendanceCancelled: true, startAt: START, jobRequestId: "job-1" });
    expect(attendance).toMatchObject({ status: "cancelled", cancelledAt: NOW });
    expect(assignment).toMatchObject({ status: "worker_withdrawn", workerWithdrawnAt: NOW });
    expect(audits).toEqual(["attendance.cancelled", "assignment.worker_withdrawn"]);
  });

  it("records who cancelled: employer → employer_cancelled, staff → platform_cancelled", async () => {
    const employer = fakes({});
    await run(employer.deps, "employer");
    expect(employer.assignment).toMatchObject({ status: "employer_cancelled", cancelledAt: NOW });
    const staff = fakes({});
    await run(staff.deps, "staff");
    expect(staff.assignment).toMatchObject({ status: "platform_cancelled", cancelledAt: NOW });
  });

  it("refuses once the worker has checked in, and changes nothing", async () => {
    for (const started of ["checked_in", "checked_out", "completed", "exception"]) {
      const { deps, assignment, attendance } = fakes({ attendanceStatus: started });
      expect(await run(deps, "staff")).toEqual({ status: "already_started" });
      expect(assignment.status).toBe("attendance_handoff");
      expect(attendance?.status).toBe(started);
    }
  });

  it("finishes a half-done cancel: attendance already cancelled → only the assignment; assignment already cancelled → only the attendance", async () => {
    const first = fakes({ attendanceStatus: "cancelled" });
    expect(await run(first.deps, "staff")).toMatchObject({ status: "cancelled", attendanceCancelled: false, assignmentCancelled: true });
    const second = fakes({ assignmentStatus: "platform_cancelled" });
    expect(await run(second.deps, "staff")).toMatchObject({ status: "cancelled", attendanceCancelled: true, assignmentCancelled: false });
    expect(second.assignment.status).toBe("platform_cancelled");
  });

  it("works before the shift is on the schedule (no attendance record yet)", async () => {
    const { deps, assignment } = fakes({ assignmentStatus: "confirmed", attendanceStatus: null });
    expect(await run(deps, "employer")).toMatchObject({ status: "cancelled", attendanceCancelled: false, assignmentCancelled: true });
    expect(assignment.status).toBe("employer_cancelled");
  });

  it("refuses a closed assignment and reports a lost race as a conflict", async () => {
    expect(await run(fakes({ assignmentStatus: "closed" }).deps, "staff")).toEqual({ status: "not_booked" });
    expect(await run(fakes({ staleAssignment: true }).deps, "staff")).toEqual({ status: "conflict" });
    const missing = await cancelBookedShift(fakes({}).deps, { assignmentId: "nope", by: "staff", actorUserId: null, reason: "", now: NOW });
    expect(missing).toEqual({ status: "not_found" });
  });

  it("the employer late-cancel count includes every booked status, including attendance_handoff", () => {
    for (const status of BOOKED_ASSIGNMENT_STATUSES) expect(CONFIRMED_ASSIGNMENT_STATUSES).toContain(status);
  });
});

describe("cancelledShiftReason (check-in and timesheet guard)", () => {
  const prismaWith = (row: { status: string; assignment: { status: string } | null; jobRequest: { status: string } | null } | null) =>
    ({ attendanceRecord: { findUnique: async () => row } }) as unknown as Parameters<typeof cancelledShiftReason>[0];

  it("blocks a cancelled attendance, a cancelled booking and a cancelled job; allows a live shift", async () => {
    expect(await cancelledShiftReason(prismaWith({ status: "cancelled", assignment: { status: "attendance_handoff" }, jobRequest: { status: "approved_for_dispatch" } }), "x")).toBe("attendance_cancelled");
    expect(await cancelledShiftReason(prismaWith({ status: "pending_start", assignment: { status: "employer_cancelled" }, jobRequest: { status: "approved_for_dispatch" } }), "x")).toBe("assignment_cancelled");
    expect(await cancelledShiftReason(prismaWith({ status: "pending_start", assignment: { status: "attendance_handoff" }, jobRequest: { status: "cancelled" } }), "x")).toBe("job_cancelled");
    expect(await cancelledShiftReason(prismaWith({ status: "pending_start", assignment: { status: "attendance_handoff" }, jobRequest: { status: "approved_for_dispatch" } }), "x")).toBeNull();
    expect(await cancelledShiftReason(prismaWith(null), "x")).toBeNull();
  });
});
