import { describe, expect, it } from "vitest";
import {
  WORKER_PAYOUT_HOLD_DAYS,
  canReleaseWorkerPayout,
  nextWorkerPayoutStatus,
  workerPayoutHoldUntilMs
} from "./workerPayout";

const DAY = 86_400_000;
const anchor = Date.parse("2026-10-01T00:00:00.000Z");
const holdUntil = anchor + WORKER_PAYOUT_HOLD_DAYS * DAY;

describe("worker payout lifecycle", () => {
  it("holds for 14 days from the anchor", () => {
    expect(WORKER_PAYOUT_HOLD_DAYS).toBe(14);
    expect(workerPayoutHoldUntilMs(anchor)).toBe(holdUntil);
  });

  it("releases a pending payout only after the hold, with no dispute", () => {
    expect(canReleaseWorkerPayout({ status: "pending", holdUntilMs: holdUntil, nowMs: holdUntil, hasOpenDispute: false })).toBe(true);
    expect(canReleaseWorkerPayout({ status: "pending", holdUntilMs: holdUntil, nowMs: holdUntil - 1, hasOpenDispute: false })).toBe(false);
  });

  it("never releases while a dispute is open", () => {
    expect(canReleaseWorkerPayout({ status: "pending", holdUntilMs: holdUntil, nowMs: holdUntil + DAY, hasOpenDispute: true })).toBe(false);
  });

  it("never re-releases a non-pending payout", () => {
    for (const status of ["released", "paid", "held", "cancelled"] as const) {
      expect(canReleaseWorkerPayout({ status, holdUntilMs: holdUntil, nowMs: holdUntil + DAY, hasOpenDispute: false })).toBe(false);
    }
  });

  it("transitions: dispute pauses, resolution resumes, hold elapses to released", () => {
    expect(nextWorkerPayoutStatus({ status: "pending", holdUntilMs: holdUntil, nowMs: anchor, hasOpenDispute: true })).toBe("held");
    expect(nextWorkerPayoutStatus({ status: "held", holdUntilMs: holdUntil, nowMs: anchor, hasOpenDispute: false })).toBe("pending");
    expect(nextWorkerPayoutStatus({ status: "pending", holdUntilMs: holdUntil, nowMs: holdUntil, hasOpenDispute: false })).toBe("released");
    expect(nextWorkerPayoutStatus({ status: "pending", holdUntilMs: holdUntil, nowMs: holdUntil - DAY, hasOpenDispute: false })).toBe("pending");
    expect(nextWorkerPayoutStatus({ status: "paid", holdUntilMs: holdUntil, nowMs: holdUntil + DAY, hasOpenDispute: false })).toBe("paid");
  });
});
