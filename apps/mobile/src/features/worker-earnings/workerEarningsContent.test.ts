import { describe, expect, it } from "vitest";
import {
  getWorkerEarningsFixtureDisclosure,
  workerEarningsBoundaries,
  workerEarningsPrivacyRules,
  workerEarningsRows,
  workerEarningsStatusModel
} from "./workerEarningsContent";

describe("worker earnings content", () => {
  it("keeps earnings, payable, payroll and payment states independent", () => {
    expect(workerEarningsStatusModel).toEqual(
      expect.arrayContaining([
        "Payroll status unavailable",
        "Payment provider unavailable",
        "Verified settlement unavailable"
      ])
    );
    expect(workerEarningsBoundaries).toEqual(
      expect.arrayContaining([
        "Earnings estimate != final payable",
        "Approved-hours handoff != payroll calculation",
        "Worker payable != employer invoice"
      ])
    );
  });

  it("preserves worker financial privacy and fixture truthfulness", () => {
    expect(workerEarningsRows.some((row) => row.label === "Estimated worker-facing amount")).toBe(
      true
    );
    expect(workerEarningsPrivacyRules).toEqual(
      expect.arrayContaining([
        "No bank account or payment destination values are displayed",
        "No SIN or tax identifier values are displayed",
        "No deductions or net pay are calculated or displayed"
      ])
    );
    expect(getWorkerEarningsFixtureDisclosure()).toEqual(
      expect.arrayContaining([
        "No payroll engine is connected",
        "No payment provider is connected",
        "No payout is simulated or guaranteed",
        "No verified settlement evidence is available"
      ])
    );
  });

  it("never presents a fixture row as deductions, net pay, guaranteed payout, or settlement", () => {
    const rowText = JSON.stringify(workerEarningsRows).toLowerCase();
    const labels: readonly string[] = workerEarningsRows.map((row) => row.label);
    expect(labels).not.toContain("Deductions");
    expect(labels).not.toContain("Net pay");
    expect(rowText).toContain("not net pay");
    expect(rowText).toContain("not");
    expect(rowText).not.toContain("settlement verified");
  });
});
