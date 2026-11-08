import { describe, expect, it } from "vitest";
import {
  dollarsToMinor,
  formatPayOffered,
  parsePayOffered,
  parsePayOfferedView,
  payOfferedFromColumns,
  payOfferedFromForm,
  payOfferedSentence,
  toPayOfferedView
} from "./payOffered";

// Intl uses non-breaking spaces in fr-CA; compare with plain spaces.
const plain = (s: string) => s.replace(/[\u00a0\u202f]/g, " ");

describe("pay offered on a long-term job", () => {
  it("accepts a single hourly amount or a range, per hour or per year", () => {
    expect(parsePayOffered({ minMinor: 2_200, unit: "hour" })).toEqual({ minMinor: 2_200, maxMinor: null, unit: "hour", currency: "CAD" });
    expect(parsePayOffered({ minMinor: 2_200, maxMinor: 2_500, unit: "hour" })).toEqual({ minMinor: 2_200, maxMinor: 2_500, unit: "hour", currency: "CAD" });
    expect(parsePayOffered({ minMinor: 4_500_000, maxMinor: null, unit: "year" })?.unit).toBe("year");
    // max equal to min is just one amount
    expect(parsePayOffered({ minMinor: 2_200, maxMinor: 2_200, unit: "hour" })?.maxMinor).toBeNull();
  });

  it("refuses zero, a missing unit, a max below the min, decimals of cents and out-of-bounds typos", () => {
    expect(parsePayOffered(null)).toBeNull();
    expect(parsePayOffered({ minMinor: 0, unit: "hour" })).toBeNull();
    expect(parsePayOffered({ minMinor: 2_200 })).toBeNull();
    expect(parsePayOffered({ minMinor: 2_200, unit: "week" })).toBeNull();
    expect(parsePayOffered({ minMinor: 2_500, maxMinor: 2_200, unit: "hour" })).toBeNull();
    expect(parsePayOffered({ minMinor: 22.5, unit: "hour" })).toBeNull();
    expect(parsePayOffered({ minMinor: 250_000_000, unit: "hour" })).toBeNull();
    expect(parsePayOffered({ minMinor: 2_200, unit: "year" })).toBeNull(); // 22 $ a year is a typo
  });

  it("reads dollars typed in the employer form", () => {
    expect(dollarsToMinor("22")).toBe(2_200);
    expect(dollarsToMinor("22.50")).toBe(2_250);
    expect(dollarsToMinor("22,5")).toBe(2_250);
    expect(dollarsToMinor("45 000")).toBe(4_500_000);
    expect(dollarsToMinor("$45000")).toBe(4_500_000);
    expect(dollarsToMinor("abc")).toBeNull();
    expect(dollarsToMinor("")).toBeNull();
    expect(payOfferedFromForm({ min: "22", max: "", unit: "hour" })).toEqual({ minMinor: 2_200, maxMinor: null, unit: "hour", currency: "CAD" });
    expect(payOfferedFromForm({ min: "22", max: "25", unit: "hour" })?.maxMinor).toBe(2_500);
    expect(payOfferedFromForm({ min: "22", max: "x", unit: "hour" })).toBeNull();
    expect(payOfferedFromForm({ min: "", max: "", unit: "hour" })).toBeNull();
  });

  it("rebuilds from stored columns and marks the employer as the payer", () => {
    expect(payOfferedFromColumns({ payOfferedMinMinor: null, payOfferedMaxMinor: null, payOfferedUnit: null })).toBeNull();
    const pay = payOfferedFromColumns({ payOfferedMinMinor: 2_200, payOfferedMaxMinor: 2_500, payOfferedUnit: "hour" });
    expect(pay).not.toBeNull();
    const view = toPayOfferedView(pay!);
    expect(view).toEqual({ minMinor: 2_200, maxMinor: 2_500, unit: "hour", currency: "CAD", paidBy: "employer" });
    expect(parsePayOfferedView(view)).toEqual(view);
    expect(parsePayOfferedView({ minMinor: 0, unit: "hour" })).toBeNull();
    // only the pay fields survive: no other money can ride along
    expect(Object.keys(view).sort()).toEqual(["currency", "maxMinor", "minMinor", "paidBy", "unit"]);
  });

  it("formats in English and French, never as $0", () => {
    expect(formatPayOffered({ minMinor: 2_200, maxMinor: 2_500, unit: "hour", currency: "CAD" }, "en-CA")).toBe("$22–$25/h");
    expect(formatPayOffered({ minMinor: 2_250, maxMinor: null, unit: "hour", currency: "CAD" }, "en-CA")).toBe("$22.50/h");
    expect(formatPayOffered({ minMinor: 4_500_000, maxMinor: null, unit: "year", currency: "CAD" }, "en-CA")).toBe("$45,000/year");
    expect(plain(formatPayOffered({ minMinor: 2_200, maxMinor: 2_500, unit: "hour", currency: "CAD" }, "fr-CA"))).toBe("22 $–25 $/h");
    expect(plain(formatPayOffered({ minMinor: 4_500_000, maxMinor: null, unit: "year", currency: "CAD" }, "fr-CA"))).toBe("45 000 $/an");
    expect(payOfferedSentence({ minMinor: 2_200, maxMinor: null, unit: "hour", currency: "CAD" }, "en")).toBe("$22/h, paid directly by the employer");
    expect(payOfferedSentence(null, "en")).toBe("Pay agreed and paid directly by the employer");
    expect(payOfferedSentence(null, "fr")).toContain("directement par l'employeur");
  });
});
