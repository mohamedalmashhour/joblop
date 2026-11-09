import { describe, expect, it } from "vitest";
import {
  isLateCancellationTimesheet,
  LATE_CANCELLATION_TIMESHEET_MARKER,
  planLateCancellationCharge
} from "./cancellationObligation";

const start = new Date("2026-12-01T14:00:00.000Z");
const before = (ms: number) => new Date(start.getTime() - ms);
const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const workers = [
  { assignmentId: "a1", workerIdentityId: "w1" },
  { assignmentId: "a2", workerIdentityId: "w2" }
];
const base = {
  initiator: "employer" as const,
  shiftStartAt: start,
  jobLength: "short_term",
  employerHourlyRateMinor: 3000,
  confirmedAssignments: workers
};

describe("planLateCancellationCharge", () => {
  it("is free exactly 24 hours before the start", () => {
    const plan = planLateCancellationCharge({ ...base, cancelledAt: before(24 * HOUR) });
    expect(plan.applies).toBe(false);
    expect(plan.reason).toBe("outside_cutoff_window");
    expect(plan.subtotalMinor).toBe(0);
    expect(plan.charges).toEqual([]);
  });

  it("charges 6 hours per confirmed worker at 23h59 before the start", () => {
    const plan = planLateCancellationCharge({ ...base, cancelledAt: before(23 * HOUR + 59 * MINUTE) });
    expect(plan.applies).toBe(true);
    expect(plan.reason).toBe("employer_late_cancellation");
    expect(plan.minutesBeforeStart).toBe(23 * 60 + 59);
    expect(plan.charges).toEqual([
      { assignmentId: "a1", workerIdentityId: "w1", subtotalMinor: 18000 },
      { assignmentId: "a2", workerIdentityId: "w2", subtotalMinor: 18000 }
    ]);
    expect(plan.subtotalMinor).toBe(36000); // 2 workers × 6 h × $30
  });

  it("charges one millisecond inside the window and after the start", () => {
    expect(planLateCancellationCharge({ ...base, cancelledAt: before(24 * HOUR - 1) }).applies).toBe(true);
    expect(planLateCancellationCharge({ ...base, cancelledAt: new Date(start.getTime() + HOUR) }).applies).toBe(true);
  });

  it("charges only confirmed workers, never unfilled places, and never twice for one assignment", () => {
    const plan = planLateCancellationCharge({
      ...base,
      cancelledAt: before(2 * HOUR),
      confirmedAssignments: [workers[0]!, workers[0]!]
    });
    expect(plan.charges).toHaveLength(1);
    expect(plan.subtotalMinor).toBe(18000);
    const empty = planLateCancellationCharge({ ...base, cancelledAt: before(2 * HOUR), confirmedAssignments: [] });
    expect(empty).toMatchObject({ applies: false, reason: "no_confirmed_workers", subtotalMinor: 0 });
  });

  it("never charges long-term jobs", () => {
    const plan = planLateCancellationCharge({ ...base, jobLength: "long_term", cancelledAt: before(HOUR) });
    expect(plan).toMatchObject({ applies: false, reason: "long_term_job" });
  });

  it("never charges a staff, Joblop or worker cancellation", () => {
    for (const initiator of ["staff", "platform", "worker"] as const) {
      const plan = planLateCancellationCharge({ ...base, initiator, cancelledAt: before(HOUR) });
      expect(plan).toMatchObject({ applies: false, reason: "not_employer_cancellation", subtotalMinor: 0 });
    }
  });

  it("charges nothing without a bill rate", () => {
    const plan = planLateCancellationCharge({ ...base, employerHourlyRateMinor: null, cancelledAt: before(HOUR) });
    expect(plan).toMatchObject({ applies: false, reason: "no_bill_rate" });
  });

  it("recognises the late-cancellation timesheet marker", () => {
    expect(isLateCancellationTimesheet(LATE_CANCELLATION_TIMESHEET_MARKER)).toBe(true);
    expect(isLateCancellationTimesheet(null)).toBe(false);
    expect(isLateCancellationTimesheet("missed_checkout")).toBe(false);
  });
});
