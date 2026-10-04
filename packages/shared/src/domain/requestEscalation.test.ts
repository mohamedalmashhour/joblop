import { describe, expect, it } from "vitest";
import { ESCALATION_REASON_MAX, canCloseEscalation, isOpenEscalation, normalizeEscalationReason } from "./requestEscalation";

describe("request escalation (pure)", () => {
  it("knows an open escalation", () => {
    expect(isOpenEscalation("open")).toBe(true);
    expect(isOpenEscalation("resolved")).toBe(false);
    expect(isOpenEscalation("dismissed")).toBe(false);
  });

  it("only closes an open escalation", () => {
    expect(canCloseEscalation("open")).toBe(true);
    expect(canCloseEscalation("resolved")).toBe(false);
  });

  it("normalizes the reason: trims, requires >=4 chars, bounds length", () => {
    expect(normalizeEscalationReason("  emergency cover  ")).toBe("emergency cover");
    expect(normalizeEscalationReason("no")).toBeNull();
    expect(normalizeEscalationReason(42)).toBeNull();
    expect((normalizeEscalationReason("x".repeat(5000)) ?? "").length).toBe(ESCALATION_REASON_MAX);
  });
});
