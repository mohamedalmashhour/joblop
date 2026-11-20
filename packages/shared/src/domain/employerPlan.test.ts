import { describe, expect, it } from "vitest";
import {
  EMPLOYER_PLAN_CATALOG,
  JOB_LENGTHS,
  employerPlanMonthlyPriceWithTax,
  employerPlanTrack,
  isJobLength,
  jobLengthToEngagementType,
  plansForTrack,
  resolveJobLength,
  EMPLOYER_PLAN_CODES,
  EMPLOYER_PLAN_MIN_PLATFORM_KEEP_PPM,
  EMPLOYER_PLAN_TRIAL_DAYS,
  applyEmployerPlan,
  applyPlanToUrgentSurchargeMinor,
  employerPlanMonthlySavingMinor,
  isEmployerPlanCode,
  isPaidEmployerPlanCode,
  planBreakEvenHours,
  planUrgentSurchargeFactorPpm,
  resolveEmployerPlanDiscountPpm
} from "./employerPlan";
import { billableHours, computeShiftPricing, workerAmountMinor } from "./platformPricing";

describe("employer plan catalog", () => {
  it("has the three short-term plans with the decided prices and discounts (long-term plans retired)", () => {
    expect(EMPLOYER_PLAN_CODES).toEqual(["pay_per_shift", "shift_pro", "shift_business"]);
    expect(EMPLOYER_PLAN_CATALOG.pay_per_shift).toMatchObject({ track: "short_term", monthlyPriceMinor: 0, employerDiscountPpm: 0, urgentSurchargeFactorPpm: 1_000_000 });
    expect(EMPLOYER_PLAN_CATALOG.shift_pro).toMatchObject({ track: "short_term", monthlyPriceMinor: 4_900, employerDiscountPpm: 50_000, urgentSurchargeFactorPpm: 500_000 });
    expect(EMPLOYER_PLAN_CATALOG.shift_business).toMatchObject({ track: "short_term", monthlyPriceMinor: 14_900, employerDiscountPpm: 80_000, urgentSurchargeFactorPpm: 500_000 });
    expect(EMPLOYER_PLAN_TRIAL_DAYS).toBe(14);
    expect(EMPLOYER_PLAN_MIN_PLATFORM_KEEP_PPM).toBe(50_000);
  });

  it("offers plans for short-term jobs only", () => {
    expect(plansForTrack("short_term").map((p) => p.code)).toEqual(["pay_per_shift", "shift_pro", "shift_business"]);
    expect(plansForTrack("long_term")).toEqual([]);
    expect(employerPlanTrack("shift_pro")).toBe("short_term");
  });

  it("recognises plan codes; the retired long-term codes are unknown", () => {
    expect(isEmployerPlanCode("shift_pro")).toBe(true);
    expect(isEmployerPlanCode("free")).toBe(false);
    expect(isEmployerPlanCode(undefined)).toBe(false);
    expect(isEmployerPlanCode("contract_plus")).toBe(false);
    expect(isPaidEmployerPlanCode("contract_plus")).toBe(false);
    expect(isPaidEmployerPlanCode("pay_per_contract")).toBe(false);
  });

  it("adds GST 5% + QST 9.975% to the plan prices, each rounded to the cent", () => {
    expect(employerPlanMonthlyPriceWithTax("shift_pro")).toEqual({ subtotalMinor: 4_900, gstMinor: 245, qstMinor: 489, totalMinor: 5_634 });
    expect(employerPlanMonthlyPriceWithTax("shift_business")).toEqual({ subtotalMinor: 14_900, gstMinor: 745, qstMinor: 1_486, totalMinor: 17_131 });
  });
});

describe("job length", () => {
  it("defaults to short_term and maps to the engagement naming", () => {
    expect(JOB_LENGTHS).toEqual(["short_term", "long_term"]);
    expect(resolveJobLength(undefined)).toBe("short_term");
    expect(resolveJobLength("weird")).toBe("short_term");
    expect(resolveJobLength("long_term")).toBe("long_term");
    expect(isJobLength("long_term")).toBe(true);
    expect(jobLengthToEngagementType("short_term")).toBe("shift");
    expect(jobLengthToEngagementType("long_term")).toBe("contract");
  });
});

describe("resolveEmployerPlanDiscountPpm — clamp so the platform keeps at least 5%", () => {
  it("gives the full discount at the default 20% margin", () => {
    expect(resolveEmployerPlanDiscountPpm("shift_pro", 200_000)).toBe(50_000);
    expect(resolveEmployerPlanDiscountPpm("shift_business", 200_000)).toBe(80_000);
    expect(resolveEmployerPlanDiscountPpm("shift_business", null)).toBe(80_000); // null → default 20%
  });

  it("clamps the discount to margin − 5%", () => {
    expect(resolveEmployerPlanDiscountPpm("shift_business", 100_000)).toBe(50_000);
    expect(resolveEmployerPlanDiscountPpm("shift_pro", 80_000)).toBe(30_000);
    expect(resolveEmployerPlanDiscountPpm("shift_business", 130_000)).toBe(80_000);
  });

  it("is 0 when the margin is 5% or less", () => {
    expect(resolveEmployerPlanDiscountPpm("shift_business", 50_000)).toBe(0);
    expect(resolveEmployerPlanDiscountPpm("shift_pro", 30_000)).toBe(0);
    expect(resolveEmployerPlanDiscountPpm("shift_pro", 0)).toBe(0);
  });

  it("is 0 for pay_per_shift and unknown plans", () => {
    expect(resolveEmployerPlanDiscountPpm("pay_per_shift", 200_000)).toBe(0);
    expect(resolveEmployerPlanDiscountPpm("platinum", 200_000)).toBe(0);
    expect(resolveEmployerPlanDiscountPpm(null, 200_000)).toBe(0);
  });
});

describe("applyEmployerPlan — the worker's pay never changes", () => {
  const rates = [0, 1, 99, 1_999, 2_500, 3_000, 3_001, 3_010, 3_333, 4_567, 12_345, 99_999];
  const margins = [0, 10_000, 50_000, 60_000, 100_000, 150_000, 200_000, 250_000, 333_333, 900_000];

  it("keeps the worker rate identical to the no-plan rate for every plan, rate and margin", () => {
    for (const plan of EMPLOYER_PLAN_CODES) {
      for (const rate of rates) {
        for (const margin of margins) {
          const result = applyEmployerPlan({ employerHourlyRateMinor: rate, marginPpm: margin, plan });
          expect(result.workerHourlyRateMinor, `${plan} ${rate} ${margin}`).toBe(workerAmountMinor(rate, margin));
        }
      }
    }
  });

  it("reconciles exactly and only ever uses whole cents", () => {
    for (const plan of EMPLOYER_PLAN_CODES) {
      for (const rate of rates) {
        for (const margin of margins) {
          const r = applyEmployerPlan({ employerHourlyRateMinor: rate, marginPpm: margin, plan });
          expect(r.employerHourlyRateMinor).toBe(r.workerHourlyRateMinor + r.platformHourlyMarginMinor);
          expect(r.employerHourlyRateMinor + r.discountMinor).toBe(rate);
          for (const n of [r.employerHourlyRateMinor, r.workerHourlyRateMinor, r.platformHourlyMarginMinor, r.discountMinor]) {
            expect(Number.isInteger(n)).toBe(true);
            expect(n).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });

  it("never lets the platform share fall below 5% of the contract rate when a discount applies", () => {
    for (const plan of ["shift_pro", "shift_business"] as const) {
      for (const rate of rates) {
        for (const margin of margins) {
          const r = applyEmployerPlan({ employerHourlyRateMinor: rate, marginPpm: margin, plan });
          if (r.discountMinor > 0) {
            expect(r.platformHourlyMarginMinor, `${plan} ${rate} ${margin}`).toBeGreaterThanOrEqual(
              Math.floor((rate * 50_000) / 1_000_000 + 0.5)
            );
          }
        }
      }
    }
  });

  it("is the identity for pay_per_shift", () => {
    for (const rate of rates) {
      for (const margin of margins) {
        const r = applyEmployerPlan({ employerHourlyRateMinor: rate, marginPpm: margin, plan: "pay_per_shift" });
        const today = computeShiftPricing({ employerHourlyRateMinor: rate, marginPpm: margin, actualHours: 8 });
        expect(r.discountMinor).toBe(0);
        expect(r.discountPpm).toBe(0);
        expect(r.employerHourlyRateMinor).toBe(today.employerHourlyRateMinor);
        expect(r.workerHourlyRateMinor).toBe(today.workerHourlyRateMinor);
        expect(r.platformHourlyMarginMinor).toBe(today.platformHourlyMarginMinor);
      }
    }
  });

  it("Shift Pro at $30/h and 20%: employer pays $28.50, worker still $24, Joblop $4.50", () => {
    const r = applyEmployerPlan({ employerHourlyRateMinor: 3_000, marginPpm: 200_000, plan: "shift_pro" });
    expect(r).toEqual({
      plan: "shift_pro",
      marginPpm: 200_000,
      discountPpm: 50_000,
      discountMinor: 150,
      employerHourlyRateMinor: 2_850,
      workerHourlyRateMinor: 2_400,
      platformHourlyMarginMinor: 450
    });
  });

  it("Shift Business at $30/h and 20%: employer pays $27.60, worker still $24", () => {
    const r = applyEmployerPlan({ employerHourlyRateMinor: 3_000, marginPpm: 200_000, plan: "shift_business" });
    expect(r.discountMinor).toBe(240);
    expect(r.employerHourlyRateMinor).toBe(2_760);
    expect(r.workerHourlyRateMinor).toBe(2_400);
    expect(r.platformHourlyMarginMinor).toBe(360);
  });

  it("rounds the discount half-up to whole cents", () => {
    // 5% of 3333 = 166.65 → 167
    expect(applyEmployerPlan({ employerHourlyRateMinor: 3_333, marginPpm: 200_000, plan: "shift_pro" }).discountMinor).toBe(167);
    // 8% of 3001 = 240.08 → 240
    expect(applyEmployerPlan({ employerHourlyRateMinor: 3_001, marginPpm: 200_000, plan: "shift_business" }).discountMinor).toBe(240);
  });

  it("caps the discount in cents so the 5% floor survives rounding", () => {
    // margin 10% → discount capped at 5%. E=3010: platform 301, 5% keep = round(150.5) = 151,
    // so the discount is 150 (not round(150.5) = 151) and Joblop keeps 151.
    const r = applyEmployerPlan({ employerHourlyRateMinor: 3_010, marginPpm: 100_000, plan: "shift_business" });
    expect(r.discountPpm).toBe(50_000);
    expect(r.discountMinor).toBe(150);
    expect(r.platformHourlyMarginMinor).toBe(151);
    expect(r.workerHourlyRateMinor).toBe(2_709);
  });

  it("gives no discount when the margin is 5% or less", () => {
    const r = applyEmployerPlan({ employerHourlyRateMinor: 3_000, marginPpm: 50_000, plan: "shift_business" });
    expect(r.discountMinor).toBe(0);
    expect(r.employerHourlyRateMinor).toBe(3_000);
  });

  it("the 6-hour minimum multiplies the discounted employer rate; worker total unchanged", () => {
    const r = applyEmployerPlan({ employerHourlyRateMinor: 3_000, marginPpm: 200_000, plan: "shift_pro" });
    const hours = billableHours(4); // floored to 6
    expect(hours).toBe(6);
    expect(r.employerHourlyRateMinor * hours).toBe(17_100);
    expect(r.workerHourlyRateMinor * hours).toBe(computeShiftPricing({ employerHourlyRateMinor: 3_000, marginPpm: 200_000, actualHours: 4 }).workerTotalMinor);
  });

  it("treats junk input as zero", () => {
    const r = applyEmployerPlan({ employerHourlyRateMinor: Number.NaN, marginPpm: 200_000, plan: "shift_pro" });
    expect(r).toMatchObject({ employerHourlyRateMinor: 0, workerHourlyRateMinor: 0, discountMinor: 0 });
    expect(applyEmployerPlan({ employerHourlyRateMinor: -500, plan: "shift_pro" }).employerHourlyRateMinor).toBe(0);
  });
});

describe("urgent surcharge factor", () => {
  it("halves the urgent surcharge on paid plans and leaves pay_per_shift unchanged", () => {
    expect(planUrgentSurchargeFactorPpm("pay_per_shift")).toBe(1_000_000);
    expect(planUrgentSurchargeFactorPpm("shift_pro")).toBe(500_000);
    expect(planUrgentSurchargeFactorPpm("shift_business")).toBe(500_000);
    expect(planUrgentSurchargeFactorPpm("unknown")).toBe(1_000_000);
    expect(planUrgentSurchargeFactorPpm("contract_plus")).toBe(1_000_000); // retired code → unchanged
    expect(applyPlanToUrgentSurchargeMinor(450, "pay_per_shift")).toBe(450);
    expect(applyPlanToUrgentSurchargeMinor(450, "shift_pro")).toBe(225);
    expect(applyPlanToUrgentSurchargeMinor(451, "shift_business")).toBe(226); // 225.5 → 226 half-up
    expect(applyPlanToUrgentSurchargeMinor(0, "shift_pro")).toBe(0);
  });
});

describe("savings and break-even", () => {
  it("computes the monthly saving", () => {
    expect(employerPlanMonthlySavingMinor({ plan: "shift_pro", employerHourlyRateMinor: 3_000, hoursPerMonth: 100 })).toBe(15_000);
    expect(employerPlanMonthlySavingMinor({ plan: "shift_business", employerHourlyRateMinor: 3_000, hoursPerMonth: 100 })).toBe(24_000);
    expect(employerPlanMonthlySavingMinor({ plan: "pay_per_shift", employerHourlyRateMinor: 3_000, hoursPerMonth: 100 })).toBe(0);
    expect(employerPlanMonthlySavingMinor({ plan: "shift_pro", employerHourlyRateMinor: 3_000, hoursPerMonth: -3 })).toBe(0);
  });

  it("rounds break-even hours up", () => {
    // Pro: 4900 / 150 = 32.67 → 33 hours
    expect(planBreakEvenHours("shift_pro", 3_000)).toBe(33);
    // Business: 14900 / 240 = 62.08 → 63 hours
    expect(planBreakEvenHours("shift_business", 3_000)).toBe(63);
    // Exact division: Pro at $49/h → saving 245 → 4900/245 = 20
    expect(planBreakEvenHours("shift_pro", 4_900)).toBe(20);
  });

  it("returns 0 for the free plan and null when nothing is saved", () => {
    expect(planBreakEvenHours("pay_per_shift", 3_000)).toBe(0);
    expect(planBreakEvenHours("shift_pro", 0)).toBeNull();
    expect(planBreakEvenHours("shift_pro", 3_000, 50_000)).toBeNull();
  });
});
