import { describe, expect, it } from "vitest";
import {
  WORKER_DISPUTE_CATEGORIES,
  WORKER_DISPUTE_REASON_MAX,
  canWithdrawWorkerDispute,
  hasOpenWorkerDispute,
  isOpenWorkerDispute,
  isWorkerDisputeCategory,
  normalizeWorkerDisputeReason
} from "./workerDispute";

describe("worker dispute (pure)", () => {
  it("only open disputes pause a payout", () => {
    expect(isOpenWorkerDispute("open")).toBe(true);
    expect(isOpenWorkerDispute("resolved")).toBe(false);
    expect(isOpenWorkerDispute("withdrawn")).toBe(false);
  });

  it("hasOpenWorkerDispute is true when any is open", () => {
    expect(hasOpenWorkerDispute(["resolved", "open"])).toBe(true);
    expect(hasOpenWorkerDispute(["resolved", "withdrawn"])).toBe(false);
    expect(hasOpenWorkerDispute([])).toBe(false);
  });

  it("validates dispute categories", () => {
    for (const c of WORKER_DISPUTE_CATEGORIES) expect(isWorkerDisputeCategory(c)).toBe(true);
    expect(isWorkerDisputeCategory("salary")).toBe(false);
    expect(isWorkerDisputeCategory(42)).toBe(false);
  });

  it("only an open dispute can be withdrawn", () => {
    expect(canWithdrawWorkerDispute("open")).toBe(true);
    expect(canWithdrawWorkerDispute("resolved")).toBe(false);
  });

  it("normalizes the reason: trims, bounds, rejects empty", () => {
    expect(normalizeWorkerDisputeReason("  too few hours  ")).toBe("too few hours");
    expect(normalizeWorkerDisputeReason("   ")).toBeNull();
    expect(normalizeWorkerDisputeReason(123)).toBeNull();
    expect((normalizeWorkerDisputeReason("x".repeat(5000)) ?? "").length).toBe(WORKER_DISPUTE_REASON_MAX);
  });
});
