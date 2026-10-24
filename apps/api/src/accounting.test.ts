import { describe, expect, it } from "vitest";
import { buildAccounting } from "./accounting";

describe("accountant's view", () => {
  it("balances the double-entry identity and shows the true employee margin", () => {
    // One employee shift from the simulation: billed $180, gross $152.64, deductions $53.40,
    // employer cost $21.36, net $99.24. True platform net = 180 - 152.64 - 21.36 = $6.00 (not $36).
    const s = buildAccounting(
      [{ channel: "employee", employerBilledMinor: 18000, workerGrossMinor: 15264, deductionsMinor: 5340, employerCostMinor: 2136, workerNetMinor: 9924 }],
      "CAD"
    );
    const g = s.groups[0]!;
    expect(g.channel).toBe("payroll");
    expect(g.platformNetMinor).toBe(600); // $6.00, the real margin after employer burden
    expect(g.taxesOwedMinor).toBe(5340 + 2136);
    expect(g.balances).toBe(true);
    // employer billed == worker net + deductions + employer cost + platform net
    expect(18000).toBe(9924 + 5340 + 2136 + 600);
  });

  it("splits payroll and contractor channels and totals them", () => {
    const s = buildAccounting(
      [
        { channel: "employee", employerBilledMinor: 18000, workerGrossMinor: 15264, deductionsMinor: 5340, employerCostMinor: 2136, workerNetMinor: 9924 },
        { channel: "contractor", employerBilledMinor: 18000, workerGrossMinor: 14400, deductionsMinor: 0, employerCostMinor: 0, workerNetMinor: 14400 }
      ],
      "CAD"
    );
    expect(s.groups.map((g) => g.channel).sort()).toEqual(["contractor", "payroll"]);
    const contractor = s.groups.find((g) => g.channel === "contractor")!;
    expect(contractor.platformNetMinor).toBe(3600); // $36 — no employer burden on a contractor (no vacation here)
    expect(s.total.employerBilledMinor).toBe(36000);
    expect(s.total.balances).toBe(true);
  });
});
