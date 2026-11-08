import type { PrismaClient } from "@rwos/database";
import { isEmployerPlansEnabled } from "./employerPlanRepository";

// No clock-in, no timesheets on LONG-TERM jobs (owner decision; behind EMPLOYER_PLANS_ENABLED). A
// long-term job is a paid listing: the employer hires and pays the worker directly, so Joblop keeps no
// attendance, no timesheet, no invoice and no payroll for it. Invoices and payroll already skip these
// jobs; this guard refuses the steps before them (attendance record, worker check-in / check-out,
// timesheet creation) with one clear error code.
//
// Flag OFF: every check returns false without touching the database, so today's behaviour is unchanged.

export const LONG_TERM_NO_TIMESHEETS_ERROR = "RWOS_LONG_TERM_NO_TIMESHEETS";
export const LONG_TERM_NO_TIMESHEETS_BODY = {
  error: LONG_TERM_NO_TIMESHEETS_ERROR,
  message:
    "This is a long-term job: the employer pays you directly, so Joblop keeps no check-in, check-out or timesheet for it."
} as const;

type GuardPrisma = Readonly<{
  attendanceRecord: Pick<PrismaClient["attendanceRecord"], "findUnique">;
  assignment: Pick<PrismaClient["assignment"], "findUnique">;
}>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when the attendance record belongs to a long-term job and the flag is on. */
export async function isLongTermAttendance(
  prisma: GuardPrisma | null | undefined,
  attendanceRecordId: string,
  enabled: boolean = isEmployerPlansEnabled()
): Promise<boolean> {
  if (!enabled || !prisma || !UUID.test(attendanceRecordId)) return false;
  const row = await prisma.attendanceRecord.findUnique({
    where: { id: attendanceRecordId },
    select: { jobRequest: { select: { jobLength: true } } }
  });
  return row?.jobRequest?.jobLength === "long_term";
}

/** True when the assignment belongs to a long-term job and the flag is on. */
export async function isLongTermAssignment(
  prisma: GuardPrisma | null | undefined,
  assignmentId: string,
  enabled: boolean = isEmployerPlansEnabled()
): Promise<boolean> {
  if (!enabled || !prisma || !UUID.test(assignmentId)) return false;
  const row = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { jobRequest: { select: { jobLength: true } } }
  });
  return row?.jobRequest?.jobLength === "long_term";
}

/**
 * Worker schedule rows: with the flag on, a long-term job's row says `clockInAllowed: false` so the
 * worker apps hide the check-in button. Flag off or short-term: nothing is added.
 */
export function clockInFields(
  jobLength: string | null | undefined,
  enabled: boolean = isEmployerPlansEnabled()
): Readonly<{ clockInAllowed: false }> | Readonly<Record<string, never>> {
  return enabled && jobLength === "long_term" ? { clockInAllowed: false } : {};
}
