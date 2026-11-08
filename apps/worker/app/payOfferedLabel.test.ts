import { describe, expect, it } from "vitest";
import { payOfferedLabel } from "./payOfferedLabel";

// Worker web: a long-term listing (employer plans flag) shows the employer's pay offer, paid directly.
const copy = { paidByEmployer: "paid directly by the employer", employerPaysDirectly: "Pay set and paid directly by the employer" };

describe("worker pay label for long-term jobs", () => {
  it("no payOffered key (short-term, or flag off): nothing extra is shown", () => {
    expect(payOfferedLabel(undefined, "en-CA", copy)).toBeNull();
  });

  it("long-term with an offer: amount + who pays; never $0", () => {
    expect(payOfferedLabel({ minMinor: 2_200, maxMinor: 2_500, unit: "hour", currency: "CAD", paidBy: "employer" }, "en-CA", copy)).toBe(
      "$22–$25/h · paid directly by the employer"
    );
    expect(payOfferedLabel({ minMinor: 4_500_000, maxMinor: null, unit: "year", currency: "CAD", paidBy: "employer" }, "en-CA", copy)).toBe(
      "$45,000/year · paid directly by the employer"
    );
  });

  it("long-term without a usable offer: says the employer sets and pays it", () => {
    expect(payOfferedLabel(null, "en-CA", copy)).toBe(copy.employerPaysDirectly);
    expect(payOfferedLabel({ minMinor: 0, unit: "hour" }, "en-CA", copy)).toBe(copy.employerPaysDirectly);
  });
});
