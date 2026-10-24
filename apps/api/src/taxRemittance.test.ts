import { describe, expect, it } from "vitest";
import { authorityFor, buildRemittanceSummary } from "./taxRemittance";

describe("tax remittance ledger", () => {
  it("routes each payroll line code to the correct authority", () => {
    expect(authorityFor("federal_tax")).toBe("CRA");
    expect(authorityFor("provincial_tax")).toBe("REVENU_QUEBEC");
    expect(authorityFor("social_insurance")).toBe("REVENU_QUEBEC");
    expect(authorityFor("employer_contribution")).toBe("REVENU_QUEBEC");
    expect(authorityFor("something_new")).toBe("CRA"); // unknown defaults to federal, surfaced by code
  });

  it("aggregates locked-payroll lines into accrued liabilities per authority", () => {
    const s = buildRemittanceSummary(
      [
        { code: "federal_tax", amountMinor: 2289 },
        { code: "provincial_tax", amountMinor: 2136 },
        { code: "social_insurance", amountMinor: 915 },
        { code: "employer_contribution", amountMinor: 2136 },
        // a second worker in the same batch
        { code: "federal_tax", amountMinor: 1000 }
      ],
      "CAD"
    );
    const cra = s.groups.find((g) => g.authority === "CRA")!;
    const rq = s.groups.find((g) => g.authority === "REVENU_QUEBEC")!;
    expect(cra.items).toEqual([{ code: "federal_tax", amountMinor: 3289 }]); // summed
    expect(cra.totalMinor).toBe(3289);
    expect(rq.totalMinor).toBe(2136 + 915 + 2136);
    expect(s.grandTotalMinor).toBe(3289 + 2136 + 915 + 2136);
    expect(s.gated).toBe(true);
    for (const g of s.groups) expect(g.status).toBe("accrued");
  });
});
