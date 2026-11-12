import type { AttendanceService, AuthorizationRoleKey, SessionValidationResult, TimesheetService } from "@rwos/auth";
import type { EmailMessage } from "./mailer/emailSender";
import { noticeSms, smsLanguage } from "./notifications/smsBrand";
import { intlLocale, type WorkerLanguage } from "./notifications/workerLanguage";

// "Report my hours": a worker who worked a shift but never checked in (or out) reports the arrival
// and departure times. The report waits for staff (pending); staff approve it, possibly with edited
// times, which writes the times onto the attendance record and prepares the timesheet the normal way
// (15-minute margin, capping at the scheduled start/end, 6-hour minimum), or reject it with a reason
// the worker is told. Reports carry no money. This file holds the pure rules, the approval steps and
// the messages; the routes are in hoursReportRoutes.ts.

const HOUR_MS = 3_600_000;

/** A worker can report hours until this many hours after the scheduled end. */
export const HOURS_REPORT_WINDOW_HOURS = 12;
export const HOURS_REPORT_REASON_MAX = 500;
export const HOURS_REPORT_REASON_MIN = 3;

export type HoursReportStatus = "pending" | "approved" | "rejected";

export type HoursReportShift = Readonly<{
  attendanceStatus: string;
  assignmentCancelled: boolean;
  jobCancelled: boolean;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  /** The latest report on this attendance record, if any. */
  latestReportStatus: HoursReportStatus | null;
  /** A long-term job has no clock-in and no timesheets (the employer pays directly). */
  longTerm?: boolean;
}>;

export type HoursReportUnavailable =
  | "cancelled"
  | "long_term"
  | "checked_in"
  | "not_reportable"
  | "not_ended"
  | "window_closed"
  | "already_pending"
  | "already_approved";

/** The last instant a worker can report hours for a shift: the scheduled end + HOURS_REPORT_WINDOW_HOURS. */
export function hoursReportDeadline(scheduledEndAt: Date): Date {
  return new Date(scheduledEndAt.getTime() + HOURS_REPORT_WINDOW_HOURS * HOUR_MS);
}

/** The deadline as a worker reads it, always on Québec time (America/Toronto), in their language. */
export function formatHoursReportDeadline(deadline: Date, language: WorkerLanguage): string {
  return new Intl.DateTimeFormat(intlLocale(language), { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto" }).format(deadline);
}

/**
 * Whether the worker can report hours now: the shift ended, had no check-in or check-out, is not
 * cancelled (attendance, booking or job), is pending_start or missed, and ended at most HOURS_REPORT_WINDOW_HOURS (12) h ago.
 * A rejected report can be followed by a new one inside the window; a pending or approved one cannot.
 */
export function hoursReportAvailability(
  shift: HoursReportShift,
  now: Date
): { available: true } | { available: false; reason: HoursReportUnavailable } {
  if (shift.attendanceStatus === "cancelled" || shift.assignmentCancelled || shift.jobCancelled) return { available: false, reason: "cancelled" };
  if (shift.longTerm) return { available: false, reason: "long_term" };
  if (shift.checkInAt || shift.checkOutAt) return { available: false, reason: "checked_in" };
  if (shift.latestReportStatus === "pending") return { available: false, reason: "already_pending" };
  if (shift.latestReportStatus === "approved") return { available: false, reason: "already_approved" };
  if (shift.attendanceStatus !== "pending_start" && shift.attendanceStatus !== "missed") return { available: false, reason: "not_reportable" };
  if (now.getTime() < shift.scheduledEndAt.getTime()) return { available: false, reason: "not_ended" };
  if (now.getTime() > hoursReportDeadline(shift.scheduledEndAt).getTime()) return { available: false, reason: "window_closed" };
  return { available: true };
}

const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** The local calendar day ("YYYY-MM-DD") of an instant in a time zone. */
export function localDayOf(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

function localClockOf(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).format(at);
}

/** "HH:MM" on a local day in a zone, as an instant (correct across a daylight-saving change); null if not a time. */
export function localTimeOnDay(day: string, clock: string, timeZone: string): Date | null {
  const match = CLOCK.exec(clock.trim());
  const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match || !dayMatch) return null;
  const wall = Date.UTC(Number(dayMatch[1]), Number(dayMatch[2]) - 1, Number(dayMatch[3]), Number(match[1]), Number(match[2]));
  // Start from the wall time read as UTC, then correct by the zone's offset (two passes for DST).
  let guess = wall;
  for (let i = 0; i < 2; i += 1) {
    const [hh, mm] = localClockOf(new Date(guess), timeZone).split(":").map(Number);
    const shownDay = localDayOf(new Date(guess), timeZone);
    const shown = Date.UTC(Number(shownDay.slice(0, 4)), Number(shownDay.slice(5, 7)) - 1, Number(shownDay.slice(8, 10)), hh ?? 0, mm ?? 0);
    guess += wall - shown;
  }
  return localDayOf(new Date(guess), timeZone) === day && localClockOf(new Date(guess), timeZone) === clock.trim() ? new Date(guess) : null;
}

export type ReportedTimesError = "invalid_time" | "end_before_start" | "in_future";

/**
 * The arrival and departure ("HH:MM", the shift's time zone) on the shift day, as instants. Both are
 * on the day the shift starts; the departure must be after the arrival and not in the future.
 */
export function resolveReportedTimes(
  shift: Readonly<{ scheduledStartAt: Date; timezone: string }>,
  arrival: string,
  departure: string,
  now: Date
): { ok: true; checkInAt: Date; checkOutAt: Date } | { ok: false; error: ReportedTimesError } {
  const timeZone = shift.timezone || "America/Toronto";
  const day = localDayOf(shift.scheduledStartAt, timeZone);
  const checkInAt = localTimeOnDay(day, arrival, timeZone);
  const checkOutAt = localTimeOnDay(day, departure, timeZone);
  if (!checkInAt || !checkOutAt) return { ok: false, error: "invalid_time" };
  if (checkOutAt.getTime() <= checkInAt.getTime()) return { ok: false, error: "end_before_start" };
  if (checkOutAt.getTime() > now.getTime()) return { ok: false, error: "in_future" };
  return { ok: true, checkInAt, checkOutAt };
}

/** The worker's short reason, trimmed; null when too short. */
export function normalizeReportReason(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim().slice(0, HOURS_REPORT_REASON_MAX);
  return text.length >= HOURS_REPORT_REASON_MIN ? text : null;
}

/** The evidence written on the attendance record when staff approve: who approved, and when. */
export function approvedEvidenceSummary(input: Readonly<{ staffLabel: string; approvedAt: Date; edited: boolean }>): string {
  return `Reported by the worker (no check-in); approved by staff ${input.staffLabel} at ${input.approvedAt.toISOString()}${input.edited ? "; times edited by staff" : ""}.`.slice(0, 240);
}

// ── Approval: the same steps as staff "prepare" ──

export type ApproveReportedHoursDeps = Readonly<{
  attendanceService: Pick<AttendanceService, "readAttendance" | "recordReportedHours" | "markCompleted">;
  timesheetService: Pick<TimesheetService, "createFromAttendance" | "calculate">;
}>;

/**
 * Write the approved times onto the attendance record (checked_out, marked as reported by the worker
 * and approved by staff), then prepare the timesheet exactly as POST /platform/timesheets/prepare
 * does: complete the attendance, create the timesheet and calculate it with the normal engine.
 * `onAttendanceRefused` runs when the attendance step fails (nothing was written), so the caller can
 * put the report back to pending; a failure after it leaves a normal finished shift staff can prepare.
 */
export async function approveReportedHours(
  deps: ApproveReportedHoursDeps,
  input: Readonly<{
    session: SessionValidationResult;
    roles: readonly AuthorizationRoleKey[];
    attendanceRecordId: string;
    checkInAt: Date;
    checkOutAt: Date;
    evidenceSummary: string;
  }>,
  onAttendanceRefused: () => Promise<void> = async () => undefined
) {
  const { session, roles, attendanceRecordId } = input;
  let recorded;
  try {
    const attendance = await deps.attendanceService.readAttendance({ session, roles, attendanceRecordId });
    recorded = await deps.attendanceService.recordReportedHours({
      session,
      roles,
      attendanceRecordId,
      expectedVersion: attendance.version,
      checkInAt: input.checkInAt,
      checkOutAt: input.checkOutAt,
      evidenceSummary: input.evidenceSummary
    });
  } catch (error) {
    await onAttendanceRefused().catch(() => undefined);
    throw error;
  }
  await deps.attendanceService.markCompleted({ session, roles, attendanceRecordId, expectedVersion: recorded.version });
  const created = await deps.timesheetService.createFromAttendance({ session, roles, attendanceRecordId });
  const timesheet = await deps.timesheetService.calculate({ session, roles, timesheetId: created.id, expectedVersion: created.version });
  return { attendance: recorded, timesheet };
}

// ── Messages ──

type ShiftLine = Readonly<{ title: string; startAt: Date; timezone: string }>;

function shiftWhen(shift: ShiftLine, language: WorkerLanguage): string {
  try {
    return new Intl.DateTimeFormat(intlLocale(language), { dateStyle: "medium", timeStyle: "short", timeZone: shift.timezone || "America/Toronto" }).format(shift.startAt);
  } catch {
    return shift.startAt.toISOString();
  }
}

/** Worker: staff did not accept the hours they reported. In the worker's language. */
export function hoursReportRejectedEmail(input: ShiftLine & { to: string; language: WorkerLanguage; reason: string }): EmailMessage {
  const when = shiftWhen(input, input.language);
  const reason = input.reason.trim();
  if (input.language === "en") {
    return {
      to: input.to,
      subject: "Joblop — your reported hours were not accepted",
      text:
        `Joblop did not accept the hours you reported for your shift "${input.title}" on ${when}.\n\n` +
        (reason ? `Joblop's note: ${reason}\n\n` : "") +
        `If you think this is a mistake, contact Joblop from your schedule ("Ask Joblop about this shift").\n\n— Joblop`
    };
  }
  if (input.language === "ar") {
    return {
      to: input.to,
      subject: "Joblop — لم تُقبل الساعات التي أبلغت عنها",
      text:
        `لم تقبل Joblop الساعات التي أبلغت عنها لمناوبتك «${input.title}» في ${when}.\n\n` +
        (reason ? `ملاحظة Joblop: ${reason}\n\n` : "") +
        `إذا كنت تظن أن هذا خطأ، تواصل مع Joblop من جدولك («اسأل Joblop عن هذه المناوبة»).\n\n— Joblop`
    };
  }
  return {
    to: input.to,
    subject: "Joblop — vos heures déclarées n'ont pas été acceptées",
    text:
      `Joblop n'a pas accepté les heures que vous avez déclarées pour votre quart « ${input.title} » le ${when}.\n\n` +
      (reason ? `Note de Joblop : ${reason}\n\n` : "") +
      `Si vous pensez que c'est une erreur, écrivez à Joblop depuis votre horaire (« Poser une question à Joblop sur ce quart »).\n\n— Joblop`
  };
}

/** Worker text (only for a worker with no email): staff did not accept the reported hours. */
export function hoursReportRejectedSmsText(raw: ShiftLine & { language: WorkerLanguage }): string {
  // Arabic readers get the French text message (smsLanguage); the Arabic line stays for a reversal.
  const input = { ...raw, language: smsLanguage(raw.language) };
  const when = shiftWhen(input, input.language);
  if (input.language === "en") return noticeSms("en", `the hours you reported for ${input.title} on ${when} were not accepted. Contact Joblop if this is a mistake.`);
  if (input.language === "ar") return noticeSms("ar", `لم تُقبل الساعات التي أبلغت عنها لمناوبة ${input.title} في ${when}. تواصل مع Joblop إذا كان هذا خطأ.`);
  return noticeSms("fr", `les heures déclarées pour ${input.title} le ${when} n'ont pas été acceptées. Écrivez à Joblop si c'est une erreur.`);
}

/**
 * Staff inbox: a worker reported hours for a shift with no check-in. The staff inbox has no single
 * reader's language, so the alert carries EN, FR and AR in one email (like the worker-cancelled alert).
 */
export function hoursReportStaffAlertEmail(input: Readonly<{
  to: string;
  jobCode: string;
  title: string;
  startAt: Date;
  timezone: string;
  arrival: string;
  departure: string;
  reason: string;
}>): EmailMessage {
  const line = (language: WorkerLanguage) => shiftWhen(input, language);
  const en =
    `A worker reported their hours for "${input.title}" (${input.jobCode}, ${line("en")}): ${input.arrival}–${input.departure}. They did not check in.\n` +
    `Reason: ${input.reason}\n` +
    `Approve or reject it in the admin console: Timesheets → Reported hours.`;
  const fr =
    `Un travailleur a déclaré ses heures pour « ${input.title} » (${input.jobCode}, ${line("fr")}) : ${input.arrival}–${input.departure}. Il n'avait pas pointé son arrivée.\n` +
    `Raison : ${input.reason}\n` +
    `Approuvez ou refusez dans la console d'administration : Feuilles de temps → Heures déclarées.`;
  const ar =
    `أبلغ عامل عن ساعاته لمناوبة «${input.title}» (${input.jobCode}، ${line("ar")}): ${input.arrival}–${input.departure}. لم يسجّل حضوره.\n` +
    `السبب: ${input.reason}\n` +
    `وافق أو ارفض في لوحة الإدارة: كشوف الساعات ← الساعات المُبلغ عنها.`;
  return {
    to: input.to,
    subject: `Joblop — hours reported / heures déclarées / ساعات مُبلغ عنها ${input.jobCode}`,
    text: `${en}\n\n— — —\n\n${fr}\n\n— — —\n\n${ar}\n\n— Joblop`
  };
}
