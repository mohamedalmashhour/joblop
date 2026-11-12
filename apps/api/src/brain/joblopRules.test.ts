import { describe, expect, it } from "vitest";
import { HOUR, MIN, NOW, at, context, emptyRows, failure, invoice, request, shift, timesheet, unfilledJob } from "./brainTestFixtures";
import {
  deliveryFailedRule,
  hoursNotPreparedRule,
  invoiceOverdueRule,
  jobMissingInfoRule,
  jobUnfilledSoonRule,
  remainingTimesheetExceptions,
  requestReadiness,
  requestWaitingReviewRule,
  timesheetReadyRule,
  timesheetUnconfirmedRule,
  workerNotCheckedInRule
} from "./joblopRules";

describe("joblop brain rules", () => {
  describe("job_unfilled_soon", () => {
    it("flags an approved job under 24 h with open places and recommends the employer bonus offer", async () => {
      const rows = { ...emptyRows(), unfilled: [unfilledJob()] };
      const [issue] = await jobUnfilledSoonRule.detect(context(rows), NOW);
      expect(issue).toMatchObject({ severity: "warning", recommendedAction: "offer_employer_bonus", inputs: { thresholdHours: 24 } });
    });

    it("moving from 24 h to 4 h updates the same issue (same fingerprint), now urgent", async () => {
      const job = unfilledJob({ startAt: at(10 * HOUR) });
      const [early] = await jobUnfilledSoonRule.detect(context({ ...emptyRows(), unfilled: [job] }), NOW);
      const [late] = await jobUnfilledSoonRule.detect(context({ ...emptyRows(), unfilled: [job] }), at(7 * HOUR));
      expect(early).toMatchObject({ severity: "warning", inputs: { thresholdHours: 24 } });
      expect(late).toMatchObject({ severity: "urgent", inputs: { thresholdHours: 4 } });
      expect(late?.fingerprint).toBe(early?.fingerprint);
    });

    it("a cancelled booking that reopens a place is a new issue", async () => {
      const [before] = await jobUnfilledSoonRule.detect(context({ ...emptyRows(), unfilled: [unfilledJob()] }), NOW);
      const [after] = await jobUnfilledSoonRule.detect(context({ ...emptyRows(), unfilled: [unfilledJob({ cancelledBookings: 1 })] }), NOW);
      expect(after?.fingerprint).not.toBe(before?.fingerprint);
    });

    it("no bonus recommendation for a job that is not on the job board", async () => {
      const [issue] = await jobUnfilledSoonRule.detect(context({ ...emptyRows(), unfilled: [unfilledJob({ onJobBoard: false })] }), NOW);
      expect(issue).toMatchObject({ recommendedAction: null, inputs: { onJobBoard: false } });
    });

    it("no recommendation when a bonus already exists or the job is unpriced; nothing when full or far away", async () => {
      const rows = {
        ...emptyRows(),
        unfilled: [
          unfilledJob({ jobRequestId: "a", hasBonus: true }),
          unfilledJob({ jobRequestId: "b", priced: false }),
          unfilledJob({ jobRequestId: "c", filled: 2 }),
          unfilledJob({ jobRequestId: "d", startAt: at(30 * HOUR) })
        ]
      };
      const issues = await jobUnfilledSoonRule.detect(context(rows), NOW);
      expect(issues.map((i) => [i.subjectId, i.recommendedAction])).toEqual([
        ["a", null],
        ["b", null]
      ]);
    });
  });

  describe("worker_not_checked_in", () => {
    it("flags a confirmed worker with no check-in 10+ minutes after the start", async () => {
      const issues = await workerNotCheckedInRule.detect(context({ ...emptyRows(), shifts: [shift()] }), NOW);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({ severity: "urgent", recommendedAction: "remind_worker_check_in", inputs: { minutesLate: 15 } });
    });

    it("ignores under 10 minutes, checked-in workers and finished shifts", async () => {
      const rows = {
        ...emptyRows(),
        shifts: [
          shift({ assignmentId: "a", startAt: at(-9 * MIN) }),
          shift({ assignmentId: "b", checkedIn: true }),
          shift({ assignmentId: "c", startAt: at(-9 * HOUR), endAt: at(-1 * MIN) })
        ]
      };
      expect(await workerNotCheckedInRule.detect(context(rows), NOW)).toEqual([]);
    });
  });

  describe("delivery_failed", () => {
    it("recommends a re-send only for a safe message, and masks the recipient", async () => {
      const rows = { ...emptyRows(), failures: [failure(), failure({ id: "x", retryable: false, channel: "sms", recipient: "+15145550123" })] };
      const issues = await deliveryFailedRule.detect(context(rows), NOW);
      expect(issues.map((i) => i.recommendedAction)).toEqual(["resend_failed_message", null]);
      expect(issues[1]?.summary).toContain("…0123");
      expect(JSON.stringify(issues)).not.toContain("+15145550123");
      expect(JSON.stringify(issues)).not.toContain("boss@example.com");
    });

    it("ignores re-sent or older than 24 h", async () => {
      const rows = { ...emptyRows(), failures: [failure({ resentAt: NOW }), failure({ id: "old", failedAt: at(-25 * HOUR) })] };
      expect(await deliveryFailedRule.detect(context(rows), NOW)).toEqual([]);
    });
  });

  describe("request_waiting_review and readiness", () => {
    it("a request passing every check is recommended for auto-approval at once", async () => {
      const [issue] = await requestWaitingReviewRule.detect(context({ ...emptyRows(), requests: [request()] }), NOW);
      expect(issue).toMatchObject({ severity: "info", recommendedAction: "auto_approve_request" });
    });

    it("a blocked request appears only after 2 hours, with no automatic action", async () => {
      const blocked = request({ requiredCertificateOther: "Forklift card" });
      expect(await requestWaitingReviewRule.detect(context({ ...emptyRows(), requests: [blocked] }), NOW)).toEqual([]);
      const late = request({ requiredCertificateOther: "Forklift card", submittedAt: at(-3 * HOUR) });
      const [issue] = await requestWaitingReviewRule.detect(context({ ...emptyRows(), requests: [late] }), NOW);
      expect(issue).toMatchObject({ severity: "warning", recommendedAction: null });
      expect(issue?.summary).toContain("'other' certificate");
    });

    it("readiness lists missing info and what needs a person", () => {
      expect(requestReadiness(request(), NOW)).toEqual({ missing: [], needsPerson: [] });
      const r = requestReadiness(
        request({ description: "", hasWorksiteAddress: false, numberOfWorkers: 0, jobLength: "long_term", openEscalation: true, startAt: at(1 * HOUR), endAt: at(1 * HOUR) }),
        NOW
      );
      expect(r.missing).toEqual(["description", "worksite address", "number of workers", "end time after start time"]);
      expect(r.needsPerson).toEqual(["long-term listing", "an open owner escalation", "starts in under 2 hours"]);
    });

    it("ignores requests that are not in review", async () => {
      expect(await requestWaitingReviewRule.detect(context({ ...emptyRows(), requests: [request({ status: "approved_for_dispatch" })] }), NOW)).toEqual([]);
    });
  });

  describe("job_missing_info", () => {
    it("flags missing details, with no automatic action", async () => {
      const [issue] = await jobMissingInfoRule.detect(context({ ...emptyRows(), requests: [request({ description: null })] }), NOW);
      expect(issue).toMatchObject({ recommendedAction: null, inputs: { missing: ["description"] } });
      expect(await jobMissingInfoRule.detect(context({ ...emptyRows(), requests: [request()] }), NOW)).toEqual([]);
    });
  });

  describe("timesheet_unconfirmed", () => {
    it("flags hours not confirmed by the employer 24 h after the shift", async () => {
      const [issue] = await timesheetUnconfirmedRule.detect(context({ ...emptyRows(), timesheets: [timesheet()] }), NOW);
      expect(issue?.recommendedAction).toBe("remind_employer_timesheet");
    });

    it("ignores under 24 h, confirmed or disputed, and other states", async () => {
      const rows = {
        ...emptyRows(),
        timesheets: [
          timesheet({ timesheetId: "a", scheduledEndAt: at(-23 * HOUR) }),
          timesheet({ timesheetId: "b", employerReviewStatus: "confirmed" }),
          timesheet({ timesheetId: "c", employerReviewStatus: "disputed" }),
          timesheet({ timesheetId: "d", status: "platform_review" })
        ]
      };
      expect(await timesheetUnconfirmedRule.detect(context(rows), NOW)).toEqual([]);
    });
  });

  describe("timesheet_unconfirmed, waiting for the worker", () => {
    it("reminds the WORKER (own fingerprint); the employer is not asked until the worker confirmed", async () => {
      const waiting = timesheet({ status: "worker_review", workerReviewStatus: "pending", employerReviewStatus: "pending" });
      const [issue] = await timesheetUnconfirmedRule.detect(context({ ...emptyRows(), timesheets: [waiting] }), NOW);
      expect(issue).toMatchObject({ recommendedAction: "remind_worker_timesheet", fingerprint: `timesheet_unconfirmed:${waiting.timesheetId}:worker` });
      const confirmedByWorker = timesheet({ status: "employer_review", workerReviewStatus: "confirmed" });
      const [next] = await timesheetUnconfirmedRule.detect(context({ ...emptyRows(), timesheets: [confirmedByWorker] }), NOW);
      expect(next?.recommendedAction).toBe("remind_employer_timesheet");
    });
  });

  describe("hours_not_prepared", () => {
    const row = { attendanceRecordId: "a1", assignmentId: "s1", jobRequestNumber: "JR-9", title: "Cook", checkedIn: true };
    it("flags a shift that ended more than 2 h ago with no timesheet, for staff (no automatic action)", async () => {
      const finished = [
        { ...row, scheduledEndAt: at(-2 * HOUR - MIN) },
        { ...row, attendanceRecordId: "a2", scheduledEndAt: at(-2 * HOUR) },
        { ...row, attendanceRecordId: "a3", scheduledEndAt: at(-13 * HOUR), checkedIn: false }
      ];
      const issues = await hoursNotPreparedRule.detect(context({ ...emptyRows(), finished }), NOW);
      expect(issues.map((i) => [i.subjectId, i.recommendedAction])).toEqual([
        ["a1", null],
        ["a3", null]
      ]);
      expect(issues[0]?.summary).toContain("Hours not prepared");
      expect(issues[1]?.summary).toContain("no check-in");
    });

    it("does not chase a no-check-in shift whose reported hours are with staff (pending report)", async () => {
      const finished = [
        { ...row, attendanceRecordId: "pending", scheduledEndAt: at(-5 * HOUR), checkedIn: false, hoursReportPending: true },
        { ...row, attendanceRecordId: "rejected", scheduledEndAt: at(-13 * HOUR), checkedIn: false, hoursReportPending: false }
      ];
      const issues = await hoursNotPreparedRule.detect(context({ ...emptyRows(), finished }), NOW);
      expect(issues.map((i) => i.subjectId)).toEqual(["rejected"]);
    });
  });

  describe("worker_not_checked_in after approved reported hours", () => {
    it("an approved report writes the check-in time, so the shift is no longer a no-check-in issue", async () => {
      const before = await workerNotCheckedInRule.detect(context({ ...emptyRows(), shifts: [shift({ checkedIn: false })] }), NOW);
      expect(before).toHaveLength(1);
      const after = await workerNotCheckedInRule.detect(context({ ...emptyRows(), shifts: [shift({ checkedIn: true })] }), NOW);
      expect(after).toEqual([]);
    });
  });

  describe("timesheet_ready", () => {
    const ready = timesheet({ status: "platform_review", employerReviewStatus: "confirmed" });
    it("recommends auto-approval when both sides confirmed with check-in/out and no exceptions", async () => {
      const [issue] = await timesheetReadyRule.detect(context({ ...emptyRows(), timesheets: [ready] }), NOW);
      expect(issue?.recommendedAction).toBe("auto_approve_timesheet");
    });

    it("never for exceptions, missing check-out, or missing confirmations", async () => {
      const rows = {
        ...emptyRows(),
        timesheets: [
          { ...ready, timesheetId: "a", exceptionSummary: "late" },
          { ...ready, timesheetId: "b", attendanceException: "no_show" },
          { ...ready, timesheetId: "c", actualCheckOutAt: null },
          { ...ready, timesheetId: "d", workerReviewStatus: "pending" },
          { ...ready, timesheetId: "e", actualCheckOutAt: ready.actualCheckInAt }
        ]
      };
      expect(await timesheetReadyRule.detect(context(rows), NOW)).toEqual([]);
    });

    it("uses the 15-minute margin: arrival/departure flags inside it do not block auto-approval", async () => {
      const start = ready.scheduledStartAt.getTime();
      const end = ready.scheduledEndAt.getTime();
      // A timesheet calculated before the margin existed: 30 min early in, 15 min late out.
      const inside = {
        ...ready,
        timesheetId: "in",
        actualCheckInAt: new Date(start - 30 * MIN),
        actualCheckOutAt: new Date(end + 15 * MIN),
        exceptionSummary: "early_arrival, late_departure"
      };
      // 08:10 in for an 08:00 start: floored to 6 h, inside the margin.
      const floorOnly = {
        ...ready,
        timesheetId: "floor",
        actualCheckInAt: new Date(start + 10 * MIN),
        exceptionSummary: "late_arrival, minimum_shift_floor_applied"
      };
      const issues = await timesheetReadyRule.detect(context({ ...emptyRows(), timesheets: [inside, floorOnly] }), NOW);
      expect(issues.map((i) => i.subjectId)).toEqual(["in", "floor"]);
      expect(remainingTimesheetExceptions(inside)).toEqual([]);
    });

    it("still needs a person past the margin or with any other exception", async () => {
      const start = ready.scheduledStartAt.getTime();
      const end = ready.scheduledEndAt.getTime();
      const rows = {
        ...emptyRows(),
        timesheets: [
          { ...ready, timesheetId: "late-in", actualCheckInAt: new Date(start + 16 * MIN), exceptionSummary: "late_arrival" },
          { ...ready, timesheetId: "late-out", actualCheckOutAt: new Date(end + 30 * MIN), exceptionSummary: "late_departure" },
          { ...ready, timesheetId: "left", actualCheckOutAt: new Date(end - 2 * HOUR), exceptionSummary: "early_departure, minimum_shift_floor_applied" },
          { ...ready, timesheetId: "other", exceptionSummary: "attendance_exception:injury" }
        ]
      };
      expect(await timesheetReadyRule.detect(context(rows), NOW)).toEqual([]);
      expect(remainingTimesheetExceptions(rows.timesheets[2]!)).toEqual(["early_departure", "minimum_shift_floor_applied"]);
    });
  });

  describe("invoice_overdue", () => {
    it("flags an overdue invoice for a person (collecting money is never automatic)", async () => {
      const [issue] = await invoiceOverdueRule.detect(context({ ...emptyRows(), invoices: [invoice()] }), NOW);
      expect(issue).toMatchObject({ recommendedAction: null, severity: "warning", inputs: { daysOverdue: 3 } });
      const [late] = await invoiceOverdueRule.detect(context({ ...emptyRows(), invoices: [invoice({ dueAt: at(-8 * 24 * HOUR) })] }), NOW);
      expect(late?.severity).toBe("urgent");
    });

    it("never flags a future due date", async () => {
      expect(await invoiceOverdueRule.detect(context({ ...emptyRows(), invoices: [invoice({ dueAt: at(HOUR) })] }), NOW)).toEqual([]);
    });
  });
});
