import type { ActionOutcome, BrainRule, DetectedIssue } from "@rwos/brain";
import { ATTENDANCE_DEVIATION_FLAGS, attendanceDeviationFlags } from "@rwos/shared";
import { unfilledThreshold } from "../unfilledShiftAlerts";

// Joblop's deterministic rules for the brain. Each rule reads candidate rows through the data adapter
// (JoblopBrainData) and decides, with plain thresholds, what is an issue and what to recommend. No
// outside AI: the same rows always give the same issues.

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

export const CHECK_IN_GRACE_MINUTES = 10;
export const REVIEW_WAIT_HOURS = 2;
export const TIMESHEET_CONFIRM_HOURS = 24;
export const DELIVERY_FAILURE_WINDOW_HOURS = 24;
/** A request must start at least this far ahead to be approved without a person. */
export const AUTO_APPROVE_MIN_LEAD_HOURS = 2;

// ── Data adapter: what the rules read ──

export type UnfilledJobRow = Readonly<{
  jobRequestId: string;
  jobRequestNumber: string;
  title: string;
  startAt: Date;
  openings: number;
  filled: number;
  priced: boolean;
  /** An offered, accepted or approved bonus already exists. */
  hasBonus: boolean;
}>;

export type CheckInRow = Readonly<{
  assignmentId: string;
  jobRequestId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  checkedIn: boolean;
}>;

export type DeliveryFailureRow = Readonly<{
  id: string;
  channel: "email" | "sms";
  recipient: string;
  failedAt: Date;
  retryable: boolean;
  resentAt: Date | null;
}>;

export type ReviewRequestRow = Readonly<{
  jobRequestId: string;
  jobRequestNumber: string;
  title: string;
  status: string;
  submittedAt: Date | null;
  startAt: Date;
  endAt: Date;
  numberOfWorkers: number;
  description: string | null;
  jobLength: string;
  hasWorksiteAddress: boolean;
  requiredCertificateOther: string | null;
  openEscalation: boolean;
}>;

export type TimesheetRow = Readonly<{
  timesheetId: string;
  jobRequestNumber: string;
  title: string;
  status: string;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  workerReviewStatus: string;
  employerReviewStatus: string;
  actualCheckInAt: Date | null;
  actualCheckOutAt: Date | null;
  exceptionSummary: string | null;
  attendanceException: string | null;
}>;

export type InvoiceRow = Readonly<{
  invoiceId: string;
  invoiceNumber: string | null;
  status: string;
  dueAt: Date;
}>;

export interface JoblopBrainData {
  /** Approved short-term jobs starting within 24 h with places still open. */
  unfilledJobs(now: Date): Promise<readonly UnfilledJobRow[]>;
  /** Confirmed assignments whose shift has started and is not over yet. */
  startedShifts(now: Date): Promise<readonly CheckInRow[]>;
  /** Failed sends from the last 24 hours. */
  deliveryFailures(now: Date): Promise<readonly DeliveryFailureRow[]>;
  /** Requests in submitted or admin_review. */
  requestsInReview(now: Date): Promise<readonly ReviewRequestRow[]>;
  /** Timesheets waiting for the employer or for platform approval. */
  openTimesheets(now: Date): Promise<readonly TimesheetRow[]>;
  /** Unpaid invoices whose due date has passed. */
  overdueInvoices(now: Date): Promise<readonly InvoiceRow[]>;
}

// ── Effects adapter: what the actions do (implemented with the existing Joblop senders and flows) ──

export interface JoblopBrainEffects {
  resendFailedMessage(failureId: string): Promise<ActionOutcome>;
  remindWorkerToCheckIn(assignmentId: string): Promise<ActionOutcome>;
  remindEmployerToConfirmHours(timesheetId: string): Promise<ActionOutcome>;
  offerEmployerBonus(jobRequestId: string, reason: string): Promise<ActionOutcome>;
  approveRequest(jobRequestId: string): Promise<ActionOutcome>;
  approveTimesheet(timesheetId: string): Promise<ActionOutcome>;
  withdrawBonusOffer(bonusId: string, staffUserId: string): Promise<Readonly<{ ok: boolean; detail: string }>>;
  reopenTimesheet(timesheetId: string, staffUserId: string): Promise<Readonly<{ ok: boolean; detail: string }>>;
}

export type JoblopBrainContext = Readonly<{ data: JoblopBrainData; effects: JoblopBrainEffects }>;

// ── Pure checks ──

/** What blocks a request from being approved without a person. Empty lists = every check passes. */
export function requestReadiness(row: ReviewRequestRow, now: Date): { missing: string[]; needsPerson: string[] } {
  const missing: string[] = [];
  const needsPerson: string[] = [];
  if (!row.title.trim()) missing.push("title");
  if (!row.description || row.description.trim().length < 3) missing.push("description");
  if (!row.hasWorksiteAddress) missing.push("worksite address");
  if (!Number.isInteger(row.numberOfWorkers) || row.numberOfWorkers < 1) missing.push("number of workers");
  if (row.endAt.getTime() <= row.startAt.getTime()) missing.push("end time after start time");
  if (row.startAt.getTime() <= now.getTime()) missing.push("a start time in the future");
  if (row.jobLength === "long_term") needsPerson.push("long-term listing");
  if (row.requiredCertificateOther && row.requiredCertificateOther.trim()) needsPerson.push("an 'other' certificate to check");
  if (row.openEscalation) needsPerson.push("an open owner escalation");
  if (row.startAt.getTime() - now.getTime() < AUTO_APPROVE_MIN_LEAD_HOURS * HOUR_MS) needsPerson.push("starts in under 2 hours");
  return { missing, needsPerson };
}

/**
 * The exceptions on a timesheet that still need a person, under the same time-margin rule as the
 * timesheet engine (ATTENDANCE_TIME_MARGIN_MINUTES): an arrival/departure flag is dropped when the
 * actual time is within the margin of the schedule (e.g. a timesheet calculated before the margin
 * existed), and the 6-hour-floor note is dropped when nothing else is left.
 */
export function remainingTimesheetExceptions(row: TimesheetRow): string[] {
  const flags = (row.exceptionSummary ?? "").split(",").map((f) => f.trim()).filter(Boolean);
  if (flags.length === 0 || !row.actualCheckInAt || !row.actualCheckOutAt) return flags;
  const outsideMargin = new Set<string>(
    attendanceDeviationFlags({
      checkInAt: row.actualCheckInAt,
      checkOutAt: row.actualCheckOutAt,
      scheduledStartAt: row.scheduledStartAt,
      scheduledEndAt: row.scheduledEndAt
    })
  );
  const deviation = new Set<string>(ATTENDANCE_DEVIATION_FLAGS);
  const kept = flags.filter((f) => !deviation.has(f) || outsideMargin.has(f));
  return kept.every((f) => f === "minimum_shift_floor_applied") ? [] : kept;
}

/** Hours can be approved without a person: both sides confirmed, check-in and check-out, no exceptions. */
export function timesheetReadyForApproval(row: TimesheetRow): boolean {
  return (
    row.status === "platform_review" &&
    row.workerReviewStatus === "confirmed" &&
    row.employerReviewStatus === "confirmed" &&
    row.actualCheckInAt !== null &&
    row.actualCheckOutAt !== null &&
    row.actualCheckOutAt.getTime() > row.actualCheckInAt.getTime() &&
    remainingTimesheetExceptions(row).length === 0 &&
    !row.attendanceException?.trim()
  );
}

const lastDigits = (recipient: string) => (recipient.length <= 4 ? "****" : `…${recipient.slice(-4)}`);
const iso = (d: Date) => d.toISOString();

// ── Rules ──

export const jobUnfilledSoonRule: BrainRule<JoblopBrainContext> = {
  key: "job_unfilled_soon",
  async detect({ data }, now) {
    const out: DetectedIssue[] = [];
    for (const job of await data.unfilledJobs(now)) {
      const threshold = unfilledThreshold(job.startAt, now);
      if (threshold === null || job.filled >= job.openings) continue;
      out.push({
        ruleKey: "job_unfilled_soon",
        fingerprint: `job_unfilled_soon:${job.jobRequestId}:${threshold}:${iso(job.startAt)}`,
        subjectType: "job_request",
        subjectId: job.jobRequestId,
        severity: threshold <= 4 ? "urgent" : "warning",
        summary: `${job.title} (${job.jobRequestNumber}) starts in under ${threshold} h with ${job.openings - job.filled} of ${job.openings} places open.`,
        inputs: { jobRequestNumber: job.jobRequestNumber, startAt: iso(job.startAt), openings: job.openings, filled: job.filled, thresholdHours: threshold, hasBonus: job.hasBonus, priced: job.priced },
        // Policy: offer the employer a bonus first. Only once per job, and only on a priced job.
        recommendedAction: job.priced && !job.hasBonus ? "offer_employer_bonus" : null
      });
    }
    return out;
  }
};

export const workerNotCheckedInRule: BrainRule<JoblopBrainContext> = {
  key: "worker_not_checked_in",
  async detect({ data }, now) {
    const out: DetectedIssue[] = [];
    for (const shift of await data.startedShifts(now)) {
      if (shift.checkedIn) continue;
      const late = now.getTime() - shift.startAt.getTime();
      if (late < CHECK_IN_GRACE_MINUTES * MINUTE_MS || now.getTime() >= shift.endAt.getTime()) continue;
      out.push({
        ruleKey: "worker_not_checked_in",
        fingerprint: `worker_not_checked_in:${shift.assignmentId}:${iso(shift.startAt)}`,
        subjectType: "assignment",
        subjectId: shift.assignmentId,
        severity: "urgent",
        summary: `A confirmed worker has not checked in for ${shift.title}, ${Math.floor(late / MINUTE_MS)} min after the start.`,
        inputs: { jobRequestId: shift.jobRequestId, startAt: iso(shift.startAt), minutesLate: Math.floor(late / MINUTE_MS) },
        recommendedAction: "remind_worker_check_in"
      });
    }
    return out;
  }
};

export const deliveryFailedRule: BrainRule<JoblopBrainContext> = {
  key: "delivery_failed",
  async detect({ data }, now) {
    const out: DetectedIssue[] = [];
    for (const failure of await data.deliveryFailures(now)) {
      if (failure.resentAt) continue;
      if (now.getTime() - failure.failedAt.getTime() > DELIVERY_FAILURE_WINDOW_HOURS * HOUR_MS) continue;
      const what = failure.channel === "sms" ? "A text" : "An email";
      out.push({
        ruleKey: "delivery_failed",
        fingerprint: `delivery_failed:${failure.id}`,
        subjectType: "message_delivery_failure",
        subjectId: failure.id,
        severity: "warning",
        summary: `${what} to ${lastDigits(failure.recipient)} failed to send${failure.retryable ? "." : " (a code or attachment: a person must re-send it)."}`,
        inputs: { channel: failure.channel, recipient: lastDigits(failure.recipient), failedAt: iso(failure.failedAt), retryable: failure.retryable },
        // One-time codes and attachments are never re-sent automatically.
        recommendedAction: failure.retryable ? "resend_failed_message" : null
      });
    }
    return out;
  }
};

export const requestWaitingReviewRule: BrainRule<JoblopBrainContext> = {
  key: "request_waiting_review",
  async detect({ data }, now) {
    const out: DetectedIssue[] = [];
    for (const row of await data.requestsInReview(now)) {
      if (row.status !== "submitted" && row.status !== "admin_review") continue;
      const { missing, needsPerson } = requestReadiness(row, now);
      const ready = missing.length === 0 && needsPerson.length === 0;
      const waitedHours = row.submittedAt ? (now.getTime() - row.submittedAt.getTime()) / HOUR_MS : 0;
      const waitingLong = waitedHours >= REVIEW_WAIT_HOURS;
      // A ready request is an issue right away (so it can be approved); a blocked one after 2 hours.
      if (!ready && !waitingLong) continue;
      if (missing.length > 0 && !waitingLong) continue;
      out.push({
        ruleKey: "request_waiting_review",
        fingerprint: `request_waiting_review:${row.jobRequestId}:${row.submittedAt ? iso(row.submittedAt) : "unsubmitted"}`,
        subjectType: "job_request",
        subjectId: row.jobRequestId,
        severity: waitingLong ? "warning" : "info",
        summary: ready
          ? `${row.title} (${row.jobRequestNumber}) passes every check and is waiting for approval${waitingLong ? ` (${Math.floor(waitedHours)} h)` : ""}.`
          : `${row.title} (${row.jobRequestNumber}) has waited ${Math.floor(waitedHours)} h for review. Needs: ${[...missing, ...needsPerson].join(", ")}.`,
        inputs: { jobRequestNumber: row.jobRequestNumber, status: row.status, submittedAt: row.submittedAt ? iso(row.submittedAt) : null, missing, needsPerson },
        recommendedAction: ready ? "auto_approve_request" : null
      });
    }
    return out;
  }
};

export const jobMissingInfoRule: BrainRule<JoblopBrainContext> = {
  key: "job_missing_info",
  async detect({ data }, now) {
    const out: DetectedIssue[] = [];
    for (const row of await data.requestsInReview(now)) {
      if (row.status !== "submitted" && row.status !== "admin_review") continue;
      const { missing } = requestReadiness(row, now);
      if (missing.length === 0) continue;
      out.push({
        ruleKey: "job_missing_info",
        fingerprint: `job_missing_info:${row.jobRequestId}:${[...missing].sort().join("|")}`,
        subjectType: "job_request",
        subjectId: row.jobRequestId,
        severity: "warning",
        summary: `${row.title} (${row.jobRequestNumber}) is missing: ${missing.join(", ")}.`,
        inputs: { jobRequestNumber: row.jobRequestNumber, missing },
        // Phase 2: ask the employer for the missing details. For now a person follows up.
        recommendedAction: null
      });
    }
    return out;
  }
};

export const timesheetUnconfirmedRule: BrainRule<JoblopBrainContext> = {
  key: "timesheet_unconfirmed",
  async detect({ data }, now) {
    const out: DetectedIssue[] = [];
    for (const row of await data.openTimesheets(now)) {
      if (row.status !== "worker_review" && row.status !== "employer_review") continue;
      if (row.employerReviewStatus === "confirmed" || row.employerReviewStatus === "disputed") continue;
      if (now.getTime() - row.scheduledEndAt.getTime() < TIMESHEET_CONFIRM_HOURS * HOUR_MS) continue;
      out.push({
        ruleKey: "timesheet_unconfirmed",
        fingerprint: `timesheet_unconfirmed:${row.timesheetId}`,
        subjectType: "timesheet",
        subjectId: row.timesheetId,
        severity: "warning",
        summary: `Hours for ${row.title} (${row.jobRequestNumber}) are not confirmed by the employer 24 h after the shift.`,
        inputs: { jobRequestNumber: row.jobRequestNumber, shiftEndedAt: iso(row.scheduledEndAt), status: row.status, employerReviewStatus: row.employerReviewStatus },
        recommendedAction: "remind_employer_timesheet"
      });
    }
    return out;
  }
};

export const timesheetReadyRule: BrainRule<JoblopBrainContext> = {
  key: "timesheet_ready",
  async detect({ data }, now) {
    const out: DetectedIssue[] = [];
    for (const row of await data.openTimesheets(now)) {
      if (!timesheetReadyForApproval(row)) continue;
      out.push({
        ruleKey: "timesheet_ready",
        fingerprint: `timesheet_ready:${row.timesheetId}`,
        subjectType: "timesheet",
        subjectId: row.timesheetId,
        severity: "info",
        summary: `Hours for ${row.title} (${row.jobRequestNumber}) are confirmed by both sides, with check-in, check-out and no problems.`,
        inputs: { jobRequestNumber: row.jobRequestNumber, checkInAt: iso(row.actualCheckInAt!), checkOutAt: iso(row.actualCheckOutAt!) },
        recommendedAction: "auto_approve_timesheet"
      });
    }
    return out;
  }
};

export const invoiceOverdueRule: BrainRule<JoblopBrainContext> = {
  key: "invoice_overdue",
  async detect({ data }, now) {
    const out: DetectedIssue[] = [];
    for (const row of await data.overdueInvoices(now)) {
      if (row.dueAt.getTime() >= now.getTime()) continue;
      const days = Math.floor((now.getTime() - row.dueAt.getTime()) / (24 * HOUR_MS));
      out.push({
        ruleKey: "invoice_overdue",
        fingerprint: `invoice_overdue:${row.invoiceId}`,
        subjectType: "invoice",
        subjectId: row.invoiceId,
        severity: days >= 7 ? "urgent" : "warning",
        summary: `Invoice ${row.invoiceNumber ?? row.invoiceId} is ${days} day(s) past due.`,
        inputs: { invoiceNumber: row.invoiceNumber, dueAt: iso(row.dueAt), status: row.status, daysOverdue: days },
        // Collecting money stays with people.
        recommendedAction: null
      });
    }
    return out;
  }
};

export const JOBLOP_BRAIN_RULES: readonly BrainRule<JoblopBrainContext>[] = [
  jobUnfilledSoonRule,
  workerNotCheckedInRule,
  deliveryFailedRule,
  requestWaitingReviewRule,
  jobMissingInfoRule,
  timesheetUnconfirmedRule,
  timesheetReadyRule,
  invoiceOverdueRule
];
