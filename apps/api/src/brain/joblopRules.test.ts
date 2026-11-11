import { describe, expect, it } from "vitest";
import { HOUR, MIN, NOW, at, context, emptyRows, failure, invoice, request, shift, timesheet, unfilledJob } from "./brainTestFixtures";
import {
  deliveryFailedRule,
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

    it("uses the 4 h threshold (a new issue) and urgent severity close to the start", async () => {
      const rows = { ...emptyRows(), unfilled: [unfilledJob({ startAt: at(3 * HOUR) })] };
      const [issue] = await jobUnfilledSoonRule.detect(context(rows), NOW);
      expect(issue?.severity).toBe("urgent");
      expect(issue?.fingerprint).toContain(":4:");
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
