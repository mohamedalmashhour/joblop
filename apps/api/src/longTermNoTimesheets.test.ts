import { describe, expect, it, vi } from "vitest";
import {
  LONG_TERM_NO_TIMESHEETS_BODY,
  LONG_TERM_NO_TIMESHEETS_ERROR,
  clockInFields,
  isLongTermAssignment,
  isLongTermAttendance
} from "./longTermNoTimesheets";

// Long-term jobs (employer plans flag) are paid listings: the employer pays the worker directly, so
// Joblop refuses check-in / check-out, attendance records and timesheets for them. Flag off: no
// database read and no refusal, exactly as today.

const ATT = "00000000-0000-4000-8000-0000000000c1";
const ASG = "00000000-0000-4000-8000-0000000000c2";

function fakePrisma(jobLength: string | null) {
  const attendanceFind = vi.fn(async () => (jobLength === null ? null : { jobRequest: { jobLength } }));
  const assignmentFind = vi.fn(async () => (jobLength === null ? null : { jobRequest: { jobLength } }));
  const prisma = {
    attendanceRecord: { findUnique: attendanceFind },
    assignment: { findUnique: assignmentFind }
  } as unknown as Parameters<typeof isLongTermAttendance>[0];
  return { prisma, attendanceFind, assignmentFind };
}

describe("no clock-in or timesheet on long-term jobs", () => {
  it("flag OFF: never refuses and never reads the database", async () => {
    const { prisma, attendanceFind, assignmentFind } = fakePrisma("long_term");
    expect(await isLongTermAttendance(prisma, ATT, false)).toBe(false);
    expect(await isLongTermAssignment(prisma, ASG, false)).toBe(false);
    expect(attendanceFind).not.toHaveBeenCalled();
    expect(assignmentFind).not.toHaveBeenCalled();
    expect(clockInFields("long_term", false)).toEqual({});
  });

  it("flag ON: a long-term job's attendance / assignment is refused", async () => {
    const { prisma, attendanceFind } = fakePrisma("long_term");
    expect(await isLongTermAttendance(prisma, ATT, true)).toBe(true);
    expect(await isLongTermAssignment(prisma, ASG, true)).toBe(true);
    expect(attendanceFind).toHaveBeenCalledWith({ where: { id: ATT }, select: { jobRequest: { select: { jobLength: true } } } });
  });

  it("flag ON: short-term jobs, unknown records and non-UUID ids are left to the normal path", async () => {
    expect(await isLongTermAttendance(fakePrisma("short_term").prisma, ATT, true)).toBe(false);
    expect(await isLongTermAttendance(fakePrisma(null).prisma, ATT, true)).toBe(false);
    const { prisma, attendanceFind } = fakePrisma("long_term");
    expect(await isLongTermAttendance(prisma, "attendance-1", true)).toBe(false);
    expect(attendanceFind).not.toHaveBeenCalled();
    expect(await isLongTermAttendance(null, ATT, true)).toBe(false);
  });

  it("refuses with one clear error code", () => {
    expect(LONG_TERM_NO_TIMESHEETS_ERROR).toBe("RWOS_LONG_TERM_NO_TIMESHEETS");
    expect(LONG_TERM_NO_TIMESHEETS_BODY.error).toBe("RWOS_LONG_TERM_NO_TIMESHEETS");
    expect(LONG_TERM_NO_TIMESHEETS_BODY.message).toMatch(/employer pays you directly/);
  });

  it("worker schedule rows: clock-in hidden only for long-term jobs with the flag on", () => {
    expect(clockInFields("long_term", true)).toEqual({ clockInAllowed: false });
    expect(clockInFields("short_term", true)).toEqual({});
    expect(clockInFields(null, true)).toEqual({});
  });
});
