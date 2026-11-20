import { describe, expect, it } from "vitest";
import { canSendTestPayout, payoutStatusLabel, type StaffPayout } from "./payoutCopy";

const payout = (status: string): StaffPayout => ({
  id: "p",
  workerDisplayName: "Worker A",
  organizationName: "Org A",
  amountMinor: 9924,
  currency: "CAD",
  status,
  holdUntil: "2026-11-22T00:00:00.000Z",
  paidAt: null,
  paymentRef: null
});

describe("staff payout copy", () => {
  it("only offers a test payout on a released payout while test mode is on", () => {
    expect(canSendTestPayout(payout("released"), true)).toBe(true);
    expect(canSendTestPayout(payout("released"), false)).toBe(false);
    for (const status of ["pending", "held", "paid", "cancelled"]) {
      expect(canSendTestPayout(payout(status), true)).toBe(false);
    }
  });

  it("uses plain words for each status", () => {
    expect(payoutStatusLabel("pending")).toBe("Waiting for release");
    expect(payoutStatusLabel("held")).toBe("Paused by a dispute");
  });
});
