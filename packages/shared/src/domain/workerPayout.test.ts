import { describe, expect, it } from "vitest";
import {
  WORKER_PAYOUT_DISPUTE_WINDOW_HOURS,
  WORKER_PAYOUT_HOLD_DAYS,
  canRegisterWorkerPayout,
  canReleaseWorkerPayout,
  nextWorkerPayoutStatus,
  workerPayoutHoldUntilMs,
  workerPayoutRegisterableAtMs,
  workerPayoutStage
} from "./workerPayout";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const periodEnd = Date.parse("2026-10-15T00:00:00.000Z");
const completion = Date.parse("2026-10-01T00:00:00.000Z"); // job completion (shift end)
const holdUntil = periodEnd + WORKER_PAYOUT_HOLD_DAYS * DAY;
const registerableAt = completion + WORKER_PAYOUT_DISPUTE_WINDOW_HOURS * HOUR;

describe("worker payout lifecycle — two timers", () => {
  it("holds 14 days from the period-end anchor (transfer) and 48h from completion (dispute window)", () => {
    expect(WORKER_PAYOUT_HOLD_DAYS).toBe(14);
    expect(WORKER_PAYOUT_DISPUTE_WINDOW_HOURS).toBe(48);
    expect(workerPayoutHoldUntilMs(periodEnd)).toBe(holdUntil);
    expect(workerPayoutRegisterableAtMs(completion)).toBe(registerableAt);
  });

  describe("48h dispute/confirmation window (completion-anchored)", () => {
    it("registers a pending, unregistered payout only after 48h, with no dispute", () => {
      expect(canRegisterWorkerPayout({ status: "pending", isRegistered: false, completionMs: completion, nowMs: registerableAt, hasOpenDispute: false })).toBe(true);
      expect(canRegisterWorkerPayout({ status: "pending", isRegistered: false, completionMs: completion, nowMs: registerableAt - 1, hasOpenDispute: false })).toBe(false);
    });
    it("never registers while a dispute is open (client flagged something in the window)", () => {
      expect(canRegisterWorkerPayout({ status: "pending", isRegistered: false, completionMs: completion, nowMs: registerableAt + DAY, hasOpenDispute: true })).toBe(false);
    });
    it("never re-registers an already-registered payout, nor a non-pending one", () => {
      expect(canRegisterWorkerPayout({ status: "pending", isRegistered: true, completionMs: completion, nowMs: registerableAt + DAY, hasOpenDispute: false })).toBe(false);
      for (const status of ["released", "paid", "held", "cancelled"] as const) {
        expect(canRegisterWorkerPayout({ status, isRegistered: false, completionMs: completion, nowMs: registerableAt + DAY, hasOpenDispute: false })).toBe(false);
      }
    });
  });

  describe("14-day transfer hold (period-end anchored) — gated on registration", () => {
    it("releases only a REGISTERED pending payout after the hold, with no dispute", () => {
      expect(canReleaseWorkerPayout({ status: "pending", isRegistered: true, holdUntilMs: holdUntil, nowMs: holdUntil, hasOpenDispute: false })).toBe(true);
      expect(canReleaseWorkerPayout({ status: "pending", isRegistered: true, holdUntilMs: holdUntil, nowMs: holdUntil - 1, hasOpenDispute: false })).toBe(false);
    });
    it("never releases an unregistered payout even after the 14-day hold elapsed", () => {
      expect(canReleaseWorkerPayout({ status: "pending", isRegistered: false, holdUntilMs: holdUntil, nowMs: holdUntil + DAY, hasOpenDispute: false })).toBe(false);
    });
    it("never releases while a dispute is open", () => {
      expect(canReleaseWorkerPayout({ status: "pending", isRegistered: true, holdUntilMs: holdUntil, nowMs: holdUntil + DAY, hasOpenDispute: true })).toBe(false);
    });
    it("never re-releases a non-pending payout", () => {
      for (const status of ["released", "paid", "held", "cancelled"] as const) {
        expect(canReleaseWorkerPayout({ status, isRegistered: true, holdUntilMs: holdUntil, nowMs: holdUntil + DAY, hasOpenDispute: false })).toBe(false);
      }
    });
  });

  it("status transitions: dispute pauses, resolution resumes, registered+hold elapses to released", () => {
    expect(nextWorkerPayoutStatus({ status: "pending", isRegistered: true, holdUntilMs: holdUntil, nowMs: periodEnd, hasOpenDispute: true })).toBe("held");
    expect(nextWorkerPayoutStatus({ status: "held", isRegistered: true, holdUntilMs: holdUntil, nowMs: periodEnd, hasOpenDispute: false })).toBe("pending");
    expect(nextWorkerPayoutStatus({ status: "pending", isRegistered: true, holdUntilMs: holdUntil, nowMs: holdUntil, hasOpenDispute: false })).toBe("released");
    // Unregistered: hold elapsed but NOT released (the 48h confirmation must happen first).
    expect(nextWorkerPayoutStatus({ status: "pending", isRegistered: false, holdUntilMs: holdUntil, nowMs: holdUntil + DAY, hasOpenDispute: false })).toBe("pending");
    expect(nextWorkerPayoutStatus({ status: "paid", isRegistered: true, holdUntilMs: holdUntil, nowMs: holdUntil + DAY, hasOpenDispute: false })).toBe("paid");
  });

  it("worker-facing stage reflects the three stages + paused", () => {
    expect(workerPayoutStage({ status: "pending", isRegistered: false })).toBe("review_window");
    expect(workerPayoutStage({ status: "pending", isRegistered: true })).toBe("registered");
    expect(workerPayoutStage({ status: "released", isRegistered: true })).toBe("registered");
    expect(workerPayoutStage({ status: "paid", isRegistered: true })).toBe("paid");
    expect(workerPayoutStage({ status: "held", isRegistered: false })).toBe("held");
  });
});
