import { describe, expect, it } from "vitest";
import { buildTaxSlips } from "./taxSlip";

describe("year-end tax slips", () => {
  it("builds a T4 for employee pay", () => {
    const slip = buildTaxSlips(2026, "CAD", [
      {
        classification: "employee",
        grossPayMinor: 15264,
        deductionsByCode: { federal_tax: 2289, provincial_tax: 2136, social_insurance: 915 },
        employerCostMinor: 2136,
        gstQstCollectedMinor: 0
      }
    ])[0]!;
    expect(slip.slipType).toBe("T4");
    expect(slip.boxes.box14_employmentIncome).toBe(15264);
    expect(slip.boxes.box22_incomeTaxDeducted).toBe(2289 + 2136);
    expect(slip.boxes.qpp_qpip_withheld).toBe(915);
    expect(slip.boxes.employer_contributions).toBe(2136);
  });

  it("builds a T4A for contractor fees with collected GST/QST", () => {
    const slip = buildTaxSlips(2026, "CAD", [
      { classification: "contractor", grossPayMinor: 15264, deductionsByCode: {}, employerCostMinor: 0, gstQstCollectedMinor: 2285 }
    ])[0]!;
    expect(slip.slipType).toBe("T4A");
    expect(slip.boxes.box048_feesForServices).toBe(15264);
    expect(slip.boxes.gst_qst_collected).toBe(2285);
  });

  it("produces both slips for a worker reclassified mid-year", () => {
    const slips = buildTaxSlips(2026, "CAD", [
      { classification: "employee", grossPayMinor: 10000, deductionsByCode: { federal_tax: 1000 }, employerCostMinor: 500, gstQstCollectedMinor: 0 },
      { classification: "contractor", grossPayMinor: 20000, deductionsByCode: {}, employerCostMinor: 0, gstQstCollectedMinor: 0 }
    ]);
    expect(slips.map((s) => s.slipType).sort()).toEqual(["T4", "T4A"]);
    expect(slips.find((s) => s.slipType === "T4")!.boxes.box14_employmentIncome).toBe(10000);
    expect(slips.find((s) => s.slipType === "T4A")!.boxes.box048_feesForServices).toBe(20000);
  });
});
