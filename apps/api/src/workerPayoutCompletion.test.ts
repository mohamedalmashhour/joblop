import { describe, expect, it } from "vitest";
import { resolveCompletionByCalc, type CompletionRef } from "./workerPayoutRepository";

// Finding #4 — the 48h dispute window anchors on ACTUAL job completion (the worker's real check-out on
// the timesheet that fed the calculation), falling back to the scheduled shift end only when no actual
// timestamp exists.
describe("worker payout completion anchor — actual check-out over scheduled end", () => {
  const SCHED = new Date("2026-06-01T20:00:00.000Z");
  const ACTUAL_LATE = new Date("2026-06-01T22:30:00.000Z"); // worker stayed 2.5h past schedule
  const ACTUAL_EARLY = new Date("2026-06-01T18:00:00.000Z"); // worker left early

  it("uses the ACTUAL check-out when it is recorded (later than scheduled)", () => {
    const refs: CompletionRef[] = [{ payrollCalculationId: "c1", timesheetId: "t1", scheduledEndAt: SCHED }];
    const out = resolveCompletionByCalc(refs, new Map([["t1", ACTUAL_LATE]]));
    expect(out.get("c1")).toEqual(ACTUAL_LATE);
  });

  it("uses the ACTUAL check-out even when the worker left EARLY (actual < scheduled)", () => {
    const refs: CompletionRef[] = [{ payrollCalculationId: "c1", timesheetId: "t1", scheduledEndAt: SCHED }];
    const out = resolveCompletionByCalc(refs, new Map([["t1", ACTUAL_EARLY]]));
    expect(out.get("c1")).toEqual(ACTUAL_EARLY); // real completion, not the schedule
  });

  it("falls back to scheduledEndAt when the timesheet has no actual check-out (null)", () => {
    const refs: CompletionRef[] = [{ payrollCalculationId: "c1", timesheetId: "t1", scheduledEndAt: SCHED }];
    const out = resolveCompletionByCalc(refs, new Map([["t1", null]]));
    expect(out.get("c1")).toEqual(SCHED);
  });

  it("falls back to scheduledEndAt when there is no timesheet row at all", () => {
    const refs: CompletionRef[] = [{ payrollCalculationId: "c1", timesheetId: "t1", scheduledEndAt: SCHED }];
    const out = resolveCompletionByCalc(refs, new Map());
    expect(out.get("c1")).toEqual(SCHED);
  });

  it("takes the LATEST completion across references, mixing actual and scheduled per reference", () => {
    const earlierSched = new Date("2026-06-01T12:00:00.000Z");
    const refs: CompletionRef[] = [
      { payrollCalculationId: "c1", timesheetId: "t1", scheduledEndAt: earlierSched }, // actual present → ACTUAL_LATE
      { payrollCalculationId: "c1", timesheetId: "t2", scheduledEndAt: SCHED } // no actual → SCHED (20:00)
    ];
    const out = resolveCompletionByCalc(refs, new Map([["t1", ACTUAL_LATE]])); // 22:30 is the latest
    expect(out.get("c1")).toEqual(ACTUAL_LATE);
  });
});
