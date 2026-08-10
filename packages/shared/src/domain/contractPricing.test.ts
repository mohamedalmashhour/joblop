import { describe, expect, it } from "vitest";
import {
  contractRoleHourlyRate,
  estimateRequestCost,
  formatHourlyRate,
  hoursBetween,
  resolveRoleHourlyRate,
  type EmployerContractRateCard
} from "./contractPricing";

const rateCard: EmployerContractRateCard = {
  contractVersion: "v1",
  currency: "CAD",
  roleRates: [
    contractRoleHourlyRate({
      roleDefinitionId: "role-cook",
      workGroupId: "wg-kitchen",
      hourlyRateMinor: 2200,
      currency: "CAD"
    }),
    contractRoleHourlyRate({
      roleDefinitionId: "role-aide",
      workGroupId: "wg-care",
      hourlyRateMinor: 1850,
      currency: "CAD"
    })
  ]
};

describe("contract pricing", () => {
  it("resolves the governed rate for a priced role and null for an unpriced one", () => {
    expect(resolveRoleHourlyRate(rateCard, "role-cook")).toEqual({
      amountMinor: 2200,
      currency: "CAD"
    });
    expect(resolveRoleHourlyRate(rateCard, "role-unknown")).toBeNull();
  });

  it("rejects a role rate missing its role or work group", () => {
    expect(() =>
      contractRoleHourlyRate({
        roleDefinitionId: "",
        workGroupId: "wg-kitchen",
        hourlyRateMinor: 2000,
        currency: "CAD"
      })
    ).toThrow();
  });

  it("rejects a negative or non-integer rate via the money engine", () => {
    expect(() =>
      contractRoleHourlyRate({
        roleDefinitionId: "role-cook",
        workGroupId: "wg-kitchen",
        hourlyRateMinor: -5,
        currency: "CAD"
      })
    ).toThrow();
  });

  it("estimates cost as rate x hours x workers", () => {
    const rate = resolveRoleHourlyRate(rateCard, "role-cook");
    expect(rate).not.toBeNull();
    expect(estimateRequestCost({ hourlyRate: rate!, hours: 8, workers: 2 })).toEqual({
      amountMinor: 2200 * 8 * 2,
      currency: "CAD"
    });
  });

  it("rejects invalid hours or worker counts in the estimate", () => {
    const rate = resolveRoleHourlyRate(rateCard, "role-cook")!;
    expect(() => estimateRequestCost({ hourlyRate: rate, hours: -1, workers: 1 })).toThrow();
    expect(() => estimateRequestCost({ hourlyRate: rate, hours: 8, workers: 0 })).toThrow();
  });

  it("computes scheduled hours and guards invalid windows", () => {
    expect(hoursBetween("2026-08-10T22:00:00.000Z", "2026-08-11T06:00:00.000Z")).toBe(8);
    expect(hoursBetween("2026-08-11T06:00:00.000Z", "2026-08-10T22:00:00.000Z")).toBe(0);
    expect(hoursBetween("not-a-date", "also-not")).toBe(0);
  });

  it("formats an hourly rate for display", () => {
    const rate = resolveRoleHourlyRate(rateCard, "role-cook")!;
    expect(formatHourlyRate(rate)).toContain("/hr");
    expect(formatHourlyRate(rate)).toContain("22");
  });
});
