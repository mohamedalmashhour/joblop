import { describe, expect, it } from "vitest";
import { formPayOffered, isLongTermRequest, longTermRequestBody, requestPricingGate } from "./longTermRequestForm";

// Employer job request form, long-term jobs (employer plans flag): no contract rate needed, no hourly
// cost estimate, a pay offer instead. Short-term and flag-off behaviour stay exactly as today.

const PAY = { payMin: "22", payMax: "25", payUnit: "hour" };

describe("job request form: long-term jobs", () => {
  it("flag OFF: always today's short-term rules, even if Long term was somehow chosen", () => {
    expect(isLongTermRequest(false, "long_term")).toBe(false);
    expect(requestPricingGate({ plansEnabled: false, jobLength: "long_term", rateUnpriced: true })).toEqual({
      longTerm: false,
      rateUnpriced: true,
      showHourlyCost: true,
      onlyPricedRoles: true
    });
    expect(longTermRequestBody(false, "long_term", PAY)).toEqual({});
  });

  it("flag ON + short-term: unchanged (an unpriced role still blocks, the hourly estimate shows)", () => {
    expect(requestPricingGate({ plansEnabled: true, jobLength: "short_term", rateUnpriced: true })).toEqual({
      longTerm: false,
      rateUnpriced: true,
      showHourlyCost: true,
      onlyPricedRoles: true
    });
    expect(longTermRequestBody(true, "short_term", PAY)).toEqual({});
  });

  it("flag ON + long-term: no contract rate required, no hourly cost, any role", () => {
    expect(requestPricingGate({ plansEnabled: true, jobLength: "long_term", rateUnpriced: true })).toEqual({
      longTerm: true,
      rateUnpriced: false,
      showHourlyCost: false,
      onlyPricedRoles: false
    });
  });

  it("flag ON + long-term: sends the pay offer in cents, and only when it is valid", () => {
    expect(longTermRequestBody(true, "long_term", PAY)).toEqual({ payOffered: { minMinor: 2_200, maxMinor: 2_500, unit: "hour" } });
    expect(longTermRequestBody(true, "long_term", { payMin: "45000", payMax: "", payUnit: "year" })).toEqual({
      payOffered: { minMinor: 4_500_000, maxMinor: null, unit: "year" }
    });
    expect(longTermRequestBody(true, "long_term", { payMin: "", payMax: "", payUnit: "hour" })).toEqual({});
    expect(formPayOffered({ payMin: "25", payMax: "22", payUnit: "hour" })).toBeNull();
  });
});
