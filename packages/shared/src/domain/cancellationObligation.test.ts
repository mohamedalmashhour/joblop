import { describe, expect, it } from "vitest";
import {
  computeLateCancellationObligation,
  type CancellationCause
} from "./cancellationObligation";

// Shift starts at a fixed instant; vary "now" to hit the 48h boundary precisely.
const shiftStartIso = "2026-08-10T20:00:00.000Z";
const nowAtHoursBefore = (h: number) =>
  new Date(Date.parse(shiftStartIso) - h * 3_600_000).toISOString();

const base = {
  cause: "EMPLOYER_CANCELLED" as CancellationCause,
  shiftStartIso,
  governedRateMinor: 3000, // $30/hr
  currency: "CAD" as const,
  affectedConfirmedWorkers: 2
};

describe("employer late-cancellation commercial obligation", () => {
  it("charges nothing at exactly 48 hours before start (>= cutoff is free)", () => {
    const o = computeLateCancellationObligation({ ...base, nowIso: nowAtHoursBefore(48) });
    expect(o.applies).toBe(false);
    expect(o.reason).toBe("outside_cutoff_window");
    expect(o.amount.amountMinor).toBe(0);
  });

  it("charges at 47h59m before start (inside the window)", () => {
    const o = computeLateCancellationObligation({
      ...base,
      nowIso: nowAtHoursBefore(47 + 59 / 60)
    });
    expect(o.applies).toBe(true);
    expect(o.reason).toBe("employer_late_cancellation");
    // 6h × $30 × 2 = $360.00
    expect(o.amount).toMatchObject({ amountMinor: 36000, currency: "CAD" });
  });

  it("charges nothing well outside the window (>48h)", () => {
    const o = computeLateCancellationObligation({ ...base, nowIso: nowAtHoursBefore(72) });
    expect(o.applies).toBe(false);
    expect(o.amount.amountMinor).toBe(0);
  });

  it("scales with multiple confirmed workers", () => {
    const one = computeLateCancellationObligation({
      ...base,
      affectedConfirmedWorkers: 1,
      nowIso: nowAtHoursBefore(10)
    });
    const four = computeLateCancellationObligation({
      ...base,
      affectedConfirmedWorkers: 4,
      nowIso: nowAtHoursBefore(10)
    });
    expect(one.amount.amountMinor).toBe(18000); // 6×3000×1
    expect(four.amount.amountMinor).toBe(72000); // 6×3000×4
  });

  it("charges only for confirmed workers on a partially filled request", () => {
    // 3 requested, 2 confirmed -> obligation is on the 2 confirmed.
    const o = computeLateCancellationObligation({
      ...base,
      affectedConfirmedWorkers: 2,
      nowIso: nowAtHoursBefore(5)
    });
    expect(o.amount.amountMinor).toBe(36000);
  });

  it("charges nothing when zero workers are confirmed", () => {
    const o = computeLateCancellationObligation({
      ...base,
      affectedConfirmedWorkers: 0,
      nowIso: nowAtHoursBefore(5)
    });
    expect(o.applies).toBe(false);
    expect(o.reason).toBe("no_confirmed_workers");
    expect(o.amount.amountMinor).toBe(0);
  });

  it("applies NO obligation for non-employer causes, even inside the window", () => {
    const nonEmployer: CancellationCause[] = [
      "WORKER_CANCELLED",
      "WORKER_NO_SHOW",
      "PLATFORM_UNABLE_TO_FILL",
      "PLATFORM_CANCELLED",
      "MUTUALLY_CANCELLED"
    ];
    for (const cause of nonEmployer) {
      const o = computeLateCancellationObligation({
        ...base,
        cause,
        nowIso: nowAtHoursBefore(1)
      });
      expect(o.applies).toBe(false);
      expect(o.reason).toBe("cause_not_employer_obligated");
      expect(o.amount.amountMinor).toBe(0);
    }
  });

  it("MUTUALLY_CANCELLED carries no obligation (owner-confirmed)", () => {
    const o = computeLateCancellationObligation({
      ...base,
      cause: "MUTUALLY_CANCELLED",
      nowIso: nowAtHoursBefore(1)
    });
    expect(o.applies).toBe(false);
    expect(o.amount.amountMinor).toBe(0);
  });

  it("uses the governed rate passed in (server-side), not any client value", () => {
    // A different governed rate flows straight through — the calculator never
    // sources the rate itself; callers must pass the contract-snapshot rate.
    const o = computeLateCancellationObligation({
      ...base,
      governedRateMinor: 3200,
      nowIso: nowAtHoursBefore(2)
    });
    expect(o.amount.amountMinor).toBe(6 * 3200 * 2);
  });

  it("rejects invalid rate / worker inputs", () => {
    expect(() =>
      computeLateCancellationObligation({ ...base, governedRateMinor: -1, nowIso: nowAtHoursBefore(1) })
    ).toThrow();
    expect(() =>
      computeLateCancellationObligation({
        ...base,
        affectedConfirmedWorkers: 1.5,
        nowIso: nowAtHoursBefore(1)
      })
    ).toThrow();
  });
});
