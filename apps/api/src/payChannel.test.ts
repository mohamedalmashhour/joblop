import { describe, expect, it } from "vitest";
import { resolvePayChannel } from "./payChannel";

// The real numbers from the simulation: 6h at $24/hr governed worker rate, +6% vacation = $152.64
// gross; employee deductions $53.40, net $99.24, employer cost $21.36.
const base = {
  grossPayMinor: 15264,
  totalDeductionsMinor: 5340,
  netPayMinor: 9924,
  totalEmployerCostMinor: 2136,
  currency: "CAD"
};

describe("resolvePayChannel", () => {
  it("routes an employee to the payroll channel (T4, net take-home)", () => {
    const r = resolvePayChannel({ classification: "employee", ...base });
    expect(r.channel).toBe("payroll");
    expect(r.slipType).toBe("T4");
    expect(r.workerReceivesMinor).toBe(9924);
    expect(r.employerCostMinor).toBe(2136);
    expect(r.statementLines.find((l) => l.kind === "deduction")?.amountMinor).toBe(-5340);
    expect(r.statementLines.find((l) => l.kind === "total")?.amountMinor).toBe(9924);
  });

  it("routes a contractor to the contractor channel (T4A, paid gross, no deductions/employer cost)", () => {
    const r = resolvePayChannel({
      classification: "contractor",
      grossPayMinor: 15264,
      totalDeductionsMinor: 0,
      netPayMinor: 15264,
      totalEmployerCostMinor: 0,
      currency: "CAD"
    });
    expect(r.channel).toBe("contractor");
    expect(r.slipType).toBe("T4A");
    expect(r.workerReceivesMinor).toBe(15264);
    expect(r.employerCostMinor).toBe(0);
    expect(r.statementLines.find((l) => l.kind === "total")?.amountMinor).toBe(15264);
    expect(r.statementLines.some((l) => l.kind === "deduction")).toBe(false);
  });

  it("fails safe to the payroll channel for an unknown classification", () => {
    const r = resolvePayChannel({ classification: "freelancer", ...base });
    expect(r.channel).toBe("payroll");
    expect(r.slipType).toBe("T4");
  });
});
