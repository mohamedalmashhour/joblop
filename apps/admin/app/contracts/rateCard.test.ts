import { describe, expect, it } from "vitest";
import { dollarsToMinor, minorToDollars, toRoleRates } from "./rateCard";

const roles = [
  { id: "a", workGroupId: "g", displayLabel: "Farm worker" },
  { id: "b", workGroupId: "g", displayLabel: "Nurse" },
  { id: "c", workGroupId: "g", displayLabel: "Chef" }
];

describe("rate card", () => {
  it("reads dollar amounts exactly", () => {
    expect(dollarsToMinor("2")).toBe(200);
    expect(dollarsToMinor(" 2.5 ")).toBe(250);
    expect(dollarsToMinor("19.99")).toBe(1999);
    expect(dollarsToMinor("0.29")).toBe(29);
  });

  it("refuses amounts that are not clean", () => {
    for (const value of ["", "0", "0.00", "-2", "abc", "2.555", "1,50", "$2"]) {
      expect(dollarsToMinor(value)).toBeNull();
    }
  });

  it("shows stored rates back as dollars", () => {
    expect(minorToDollars(250)).toBe("2.50");
  });

  it("leaves blank roles out and reports bad ones", () => {
    expect(toRoleRates(roles, { a: "2", b: "", c: "oops" })).toEqual({
      rates: [{ workGroupId: "g", roleDefinitionId: "a", hourlyRateMinor: 200 }],
      invalid: ["Chef"]
    });
  });
});
