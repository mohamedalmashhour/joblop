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
      expect.arrayContaining(["Payable Created", "Payment Scheduled", "Paid", "Reconciled"])
    );
    expect(workerEarningsBoundaries).toEqual(
      expect.arrayContaining([
        "Earnings estimate != final payable",
        "Payable created != payroll paid",
        "Worker payable != employer invoice"
      ])
    );
  });

  it("preserves worker financial privacy and fixture truthfulness", () => {
    expect(workerEarningsRows.some((row) => row.label === "Estimated payable")).toBe(true);
    expect(workerEarningsPrivacyRules).toContain("No full bank details are displayed");
    expect(getWorkerEarningsFixtureDisclosure()).toContain("No payout is simulated");
  });
});

