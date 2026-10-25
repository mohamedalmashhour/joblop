import { describe, expect, it } from "vitest";
import { deriveWorkerCancellationPenalty } from "./workerCancellationPenalty";

const shiftStartIso = "2026-08-10T20:00:00.000Z";
const nowAtHoursBefore = (h: number) => new Date(Date.parse(shiftStartIso) - h * 3_600_000).toISOString();

describe("deriveWorkerCancellationPenalty", () => {
  it("no penalty at/outside 24h before start", () => {
    expect(
      deriveWorkerCancellationPenalty({ shiftStartIso, nowIso: nowAtHoursBefore(24), priorLateCancellations: 0 }).penalty
    ).toBe("none");
    expect(
      deriveWorkerCancellationPenalty({ shiftStartIso, nowIso: nowAtHoursBefore(48), priorLateCancellations: 3 }).penalty
    ).toBe("none");
  });

  it("first late cancellation (<24h) → 7-day suspension", () => {
    const p = deriveWorkerCancellationPenalty({ shiftStartIso, nowIso: nowAtHoursBefore(5), priorLateCancellations: 0 });
    expect(p.penalty).toBe("suspend");
    expect(p.suspensionDays).toBe(7);
    expect(p.reason).toBe("first_late_cancellation");
  });

  it("repeat late cancellation (<24h, prior >= 1) → permanent close", () => {
    const p = deriveWorkerCancellationPenalty({ shiftStartIso, nowIso: nowAtHoursBefore(2), priorLateCancellations: 1 });
    expect(p.penalty).toBe("permanent_close");
    expect(p.suspensionDays).toBe(0);
    expect(p.reason).toBe("repeat_late_cancellation");
  });

  it("rejects a negative prior count", () => {
    expect(() =>
      deriveWorkerCancellationPenalty({ shiftStartIso, nowIso: nowAtHoursBefore(1), priorLateCancellations: -1 })
    ).toThrow();
  });
});
