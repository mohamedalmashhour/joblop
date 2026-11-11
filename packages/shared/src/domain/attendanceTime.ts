// ONE rule for how actual check-in / check-out compare to the scheduled shift (owner decision
// 2026-11-11). Used by the timesheet engine (@rwos/auth) and the Joblop Brain's auto-approve check,
// so both always agree.
//
//  - Margin: arriving late or leaving early/late within ATTENDANCE_TIME_MARGIN_MINUTES of the
//    scheduled start / end is normal. Only a difference of MORE than the margin raises late_arrival /
//    early_departure / late_departure (which sends the timesheet to review_required).
//  - Early arrival never needs review: time before the scheduled start is not counted (below), and
//    check-in cannot open more than 30 minutes before the start anyway. "early_arrival" stays a known
//    flag only so timesheets calculated before this rule are still read correctly.
//  - Counted time: hours count from the scheduled start and stop at the scheduled end. Time before the
//    start or after the end is neither billed to the employer nor paid to the worker unless staff
//    adjust it. Arriving late or leaving early still counts the actual (shorter) time.
//    The 6-hour minimum is applied by the timesheet engine AFTER this.

export const ATTENDANCE_TIME_MARGIN_MINUTES = 15;

export type AttendanceDeviationFlag = "early_arrival" | "late_arrival" | "early_departure" | "late_departure";

export const ATTENDANCE_DEVIATION_FLAGS: readonly AttendanceDeviationFlag[] = [
  "early_arrival",
  "late_arrival",
  "early_departure",
  "late_departure"
];

export type AttendanceTimes = Readonly<{
  checkInAt: Date;
  checkOutAt: Date;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
}>;

const MARGIN_MS = ATTENDANCE_TIME_MARGIN_MINUTES * 60_000;

/** The arrival/departure flags that need a person: differences of more than the margin (never early arrival). */
export function attendanceDeviationFlags(t: AttendanceTimes): AttendanceDeviationFlag[] {
  const flags: AttendanceDeviationFlag[] = [];
  const startDiff = t.checkInAt.getTime() - t.scheduledStartAt.getTime();
  const endDiff = t.checkOutAt.getTime() - t.scheduledEndAt.getTime();
  if (startDiff > MARGIN_MS) flags.push("late_arrival");
  if (endDiff < -MARGIN_MS) flags.push("early_departure");
  if (endDiff > MARGIN_MS) flags.push("late_departure");
  return flags;
}

/** Whole minutes counted for pay and billing before the 6-hour minimum: actual time, capped to the schedule. */
export function countedAttendanceMinutes(t: AttendanceTimes): number {
  const start = Math.max(t.checkInAt.getTime(), t.scheduledStartAt.getTime());
  const end = Math.min(t.checkOutAt.getTime(), t.scheduledEndAt.getTime());
  return Math.max(0, Math.floor((end - start) / 60_000));
}
