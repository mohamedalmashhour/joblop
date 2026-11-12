import type { MessageKey } from "../i18n/messages";

// "Report my hours" on the schedule card: what the card shows for a shift, from the API's fields
// (canReportHours, hoursReport, reportHoursUntil). The API decides; the card only reads it, plus a
// local deadline check so an open page stops offering the form once the 48 hours are over.

export type HoursReportFields = Readonly<{
  canReportHours?: boolean;
  hoursReport?: Readonly<{ status: string }> | null;
  reportHoursUntil?: string | null;
}>;

export type ReportHoursView = "form" | "waiting" | "rejected" | null;

export function reportHoursView(shift: HoursReportFields, now: number = Date.now()): ReportHoursView {
  if (shift.hoursReport?.status === "pending") return "waiting";
  const open = shift.canReportHours === true && (!shift.reportHoursUntil || now <= new Date(shift.reportHoursUntil).getTime());
  if (open) return "form";
  if (shift.hoursReport?.status === "rejected") return "rejected";
  return null;
}

/** "HH:MM" (24 h) of an instant in the shift's time zone, for the time inputs' starting values. */
export function shiftClock(iso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone, hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch {
    return new Date(iso).toISOString().slice(11, 16);
  }
}

/** The message for a refused report (API `reason`). */
export function reportErrorKey(reason: string | null | undefined): MessageKey {
  switch (reason) {
    case "end_before_start":
      return "sched.reportErrEndBeforeStart";
    case "in_future":
      return "sched.reportErrFuture";
    case "reason_required":
      return "sched.reportErrReason";
    case "invalid_time":
      return "sched.reportErrTimes";
    case "already_pending":
      return "sched.reportWaiting";
    default:
      return "sched.reportErrClosed";
  }
}
