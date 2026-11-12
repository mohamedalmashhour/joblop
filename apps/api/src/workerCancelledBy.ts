// Who cancelled a worker's shift, as one of three plain codes. Worker surfaces show only this
// (translated: "Cancelled by Joblop" / "Cancelled by the employer" / "You cancelled this shift"),
// never the free-text reason staff or the employer typed: that text is internal and can name other
// jobs, rates or approvals (a live card once read "JR-…-000004 was cancelled (below minimum wage);
// replaced by JR-…-000006 at the legal rate. Owner approved.").

export type WorkerCancelledBy = "joblop" | "employer" | "worker";

const ASSIGNMENT_CANCELLED_BY: Readonly<Record<string, WorkerCancelledBy>> = {
  worker_withdrawn: "worker",
  employer_cancelled: "employer",
  platform_cancelled: "joblop"
};

export function workerCancelledBy(input: Readonly<{
  attendanceStatus: string;
  attendanceCancelledByUserId?: string | null;
  workerUserId?: string | null;
  assignmentStatus?: string | null;
  jobStatus?: string | null;
  /** True when the employer cancelled the whole request (EmployerRequestCancellation exists). */
  jobCancelledByEmployer?: boolean;
}>): WorkerCancelledBy | null {
  const byAssignment = input.assignmentStatus ? ASSIGNMENT_CANCELLED_BY[input.assignmentStatus] : undefined;
  const cancelled = input.attendanceStatus === "cancelled" || byAssignment !== undefined || input.jobStatus === "cancelled";
  if (!cancelled) return null;
  if (byAssignment) return byAssignment;
  if (input.workerUserId && input.attendanceCancelledByUserId === input.workerUserId) return "worker";
  if (input.jobStatus === "cancelled" && input.jobCancelledByEmployer) return "employer";
  return "joblop";
}

/**
 * One attendance record as a worker may see it: the record without the staff-only fields (the
 * free-text exception / cancel reason, the supervisor note, evidence and staff user ids).
 */
export function workerAttendanceView<T extends Record<string, unknown>>(record: T): Omit<T, (typeof STAFF_ONLY_ATTENDANCE_FIELDS)[number]> {
  const copy: Record<string, unknown> = { ...record };
  for (const key of STAFF_ONLY_ATTENDANCE_FIELDS) delete copy[key];
  return copy as Omit<T, (typeof STAFF_ONLY_ATTENDANCE_FIELDS)[number]>;
}

export const STAFF_ONLY_ATTENDANCE_FIELDS = [
  "exceptionCategory",
  "supervisorNote",
  "checkInEvidenceSummary",
  "checkOutEvidenceSummary",
  "createdByUserId",
  "updatedByUserId",
  "checkedInByUserId",
  "checkedOutByUserId",
  "cancelledByUserId"
] as const;
