import { describe, expect, it } from "vitest";
import {
  CARD_TRANSFER_FEE_FIXED_MINOR,
  CARD_TRANSFER_FEE_PERCENT_PPM,
  DEFAULT_PLATFORM_MARGIN_PPM,
  MAX_PLATFORM_MARGIN_PPM,
  MINIMUM_BILLABLE_SHIFT_HOURS,
  billableHours,
  computeCardTransferFeeMinor,
  computeRequestPricingSnapshot,
  URGENT_HOURLY_PREMIUM_MINOR,
  urgencyPremiumMinor,
  computeShiftPricing,
  employerTransferSurchargeMinor,
  splitAllowanceMinor,
  platformMarginMinor,
  resolveMarginPpm,
  splitTransferFeeMinor,
  workerAmountMinor
} from "./platformPricing";

describe("platform pricing — margin", () => {
  it("defaults to a 20% margin", () => {
    expect(DEFAULT_PLATFORM_MARGIN_PPM).toBe(200_000);
    expect(resolveMarginPpm(null)).toBe(200_000);
    expect(resolveMarginPpm(undefined)).toBe(200_000);
    expect(resolveMarginPpm(NaN)).toBe(200_000);
  });

  it("clamps an override to the allowed range", () => {
    expect(resolveMarginPpm(300_000)).toBe(300_000);
    expect(resolveMarginPpm(-5)).toBe(0);
    expect(resolveMarginPpm(10_000_000)).toBe(MAX_PLATFORM_MARGIN_PPM);
  });

  it("derives the worker amount as employer amount minus margin (half-up)", () => {
    // $30.00/h at 20% → margin $6.00, worker $24.00
    expect(platformMarginMinor(3000)).toBe(600);
    expect(workerAmountMinor(3000)).toBe(2400);
    // reconciles exactly
    expect(workerAmountMinor(3000) + platformMarginMinor(3000)).toBe(3000);
  });

  it("never pays the worker more than the employer or below zero", () => {
    expect(workerAmountMinor(0)).toBe(0);
    expect(workerAmountMinor(-100)).toBe(0);
    expect(workerAmountMinor(1000, MAX_PLATFORM_MARGIN_PPM)).toBeGreaterThanOrEqual(0);
    expect(workerAmountMinor(1000, 0)).toBe(1000); // zero margin → pass-through
  });

  it("applies the same margin to allowances (transport / meal / lodging)", () => {
    // a $20.00 transport allowance at default margin → worker sees $16.00
    expect(workerAmountMinor(2000)).toBe(1600);
  });
});

describe("platform pricing — 6-hour floor", () => {
  it("floors billable hours to the 6-hour minimum", () => {
    expect(billableHours(3)).toBe(MINIMUM_BILLABLE_SHIFT_HOURS);
    expect(billableHours(0)).toBe(MINIMUM_BILLABLE_SHIFT_HOURS);
    expect(billableHours(8)).toBe(8);
  });
});

describe("platform pricing — shift breakdown", () => {
  it("reconciles employer total = worker total + platform margin", () => {
    const p = computeShiftPricing({ employerHourlyRateMinor: 3000, actualHours: 6, marginPpm: 200_000 });
    expect(p.employerHourlyRateMinor).toBe(3000);
    expect(p.workerHourlyRateMinor).toBe(2400);
    expect(p.platformHourlyMarginMinor).toBe(600);
    expect(p.billableHours).toBe(6);
    expect(p.employerTotalMinor).toBe(18000); // 6 × $30
    expect(p.workerTotalMinor).toBe(14400); // 6 × $24
    expect(p.platformMarginTotalMinor).toBe(3600); // 6 × $6
    expect(p.employerTotalMinor).toBe(p.workerTotalMinor + p.platformMarginTotalMinor);
  });

  it("bills a sub-6-hour shift as 6 hours", () => {
    const p = computeShiftPricing({ employerHourlyRateMinor: 3000, actualHours: 2 });
    expect(p.billableHours).toBe(6);
    expect(p.employerTotalMinor).toBe(18000);
  });
});

describe("platform pricing — transfer fee split", () => {
  it("splits the transfer fee 50/50 with the odd minor unit to the employer", () => {
    expect(splitTransferFeeMinor(100)).toEqual({ employerMinor: 50, platformMinor: 50 });
    expect(splitTransferFeeMinor(101)).toEqual({ employerMinor: 51, platformMinor: 50 });
    expect(splitTransferFeeMinor(0)).toEqual({ employerMinor: 0, platformMinor: 0 });
  });
});


describe("platform pricing — card transfer-fee surcharge (upfront set-rate)", () => {
  it("estimates the card fee at 2.9% + $0.30", () => {
    // $100.00 charged -> 290c (2.9%) + 30c fixed = 320c
    expect(computeCardTransferFeeMinor(10_000)).toBe(320);
  });

  it("uses the published rate constants", () => {
    expect(CARD_TRANSFER_FEE_PERCENT_PPM).toBe(29_000);
    expect(CARD_TRANSFER_FEE_FIXED_MINOR).toBe(30);
  });

  it("returns 0 for a non-positive amount", () => {
    expect(computeCardTransferFeeMinor(0)).toBe(0);
    expect(computeCardTransferFeeMinor(-500)).toBe(0);
  });

  it("charges the employer half of the card fee, odd cent to the employer", () => {
    // fee 320 -> employer 160, platform 160
    expect(employerTransferSurchargeMinor({ amountMinor: 10_000, method: "card" })).toBe(160);
    // $100.50 -> 291c + 30c = 321c -> employer 161, platform 160
    expect(employerTransferSurchargeMinor({ amountMinor: 10_050, method: "card" })).toBe(161);
  });

  it("charges the employer nothing for Interac (platform absorbs the full fee)", () => {
    expect(employerTransferSurchargeMinor({ amountMinor: 10_000, method: "interac" })).toBe(0);
    expect(employerTransferSurchargeMinor({ amountMinor: 999_999, method: "interac" })).toBe(0);
  });
});


describe("platform pricing — request pricing snapshot (hidden markup)", () => {
  it("derives worker hourly rate and allowance splits at the default 20% margin", () => {
    const snap = computeRequestPricingSnapshot({
      employerHourlyRateMinor: 3000,
      transportAllowanceMinor: 1000,
      mealAllowanceMinor: 0,
      lodgingAllowanceMinor: 5000
    });
    expect(snap.marginPpm).toBe(200_000);
    expect(snap.employerHourlyRateMinor).toBe(3000);
    expect(snap.workerHourlyRateMinor).toBe(2400);
    expect(snap.platformHourlyMarginMinor).toBe(600);
    expect(snap.transport).toEqual({ employerMinor: 1000, workerMinor: 800, platformMarginMinor: 200 });
    expect(snap.meal).toEqual({ employerMinor: 0, workerMinor: 0, platformMarginMinor: 0 });
    expect(snap.lodging).toEqual({ employerMinor: 5000, workerMinor: 4000, platformMarginMinor: 1000 });
  });

  it("applies an admin margin override to the rate and allowances", () => {
    const snap = computeRequestPricingSnapshot({
      employerHourlyRateMinor: 3000,
      marginPpm: 300_000,
      transportAllowanceMinor: 1000
    });
    expect(snap.marginPpm).toBe(300_000);
    expect(snap.workerHourlyRateMinor).toBe(2100);
    expect(snap.transport).toEqual({ employerMinor: 1000, workerMinor: 700, platformMarginMinor: 300 });
  });

  it("reconciles exactly: employer = worker + platform margin for rate and every allowance", () => {
    const snap = computeRequestPricingSnapshot({
      employerHourlyRateMinor: 4237,
      marginPpm: 175_000,
      transportAllowanceMinor: 1733,
      mealAllowanceMinor: 999,
      lodgingAllowanceMinor: 2501
    });
    expect(snap.workerHourlyRateMinor + snap.platformHourlyMarginMinor).toBe(snap.employerHourlyRateMinor);
    for (const part of [snap.transport, snap.meal, snap.lodging]) {
      expect(part.workerMinor + part.platformMarginMinor).toBe(part.employerMinor);
    }
  });

  it("clamps an out-of-range margin and never pays the worker more than the employer", () => {
    const snap = computeRequestPricingSnapshot({ employerHourlyRateMinor: 3000, marginPpm: 5_000_000 });
    expect(snap.marginPpm).toBe(900_000); // clamped to MAX
    expect(snap.workerHourlyRateMinor).toBeLessThanOrEqual(snap.employerHourlyRateMinor);
    expect(snap.workerHourlyRateMinor).toBeGreaterThanOrEqual(0);
  });

  it("treats missing or negative allowances as zero", () => {
    expect(splitAllowanceMinor(undefined, 200_000)).toEqual({ employerMinor: 0, workerMinor: 0, platformMarginMinor: 0 });
    expect(splitAllowanceMinor(-50, 200_000)).toEqual({ employerMinor: 0, workerMinor: 0, platformMarginMinor: 0 });
  });
});


describe("urgent/emergency hourly premium", () => {
  it("resolves the premium only for urgent or immediate", () => {
    expect(urgencyPremiumMinor("normal")).toBe(0);
    expect(urgencyPremiumMinor("urgent")).toBe(URGENT_HOURLY_PREMIUM_MINOR);
    expect(urgencyPremiumMinor("immediate")).toBe(URGENT_HOURLY_PREMIUM_MINOR);
    expect(urgencyPremiumMinor(null)).toBe(0);
    expect(urgencyPremiumMinor(undefined)).toBe(0);
  });

  it("adds the premium to BOTH E and W and leaves the platform margin unchanged", () => {
    const base = computeRequestPricingSnapshot({ employerHourlyRateMinor: 3000, marginPpm: 200_000 });
    const urgent = computeRequestPricingSnapshot({ employerHourlyRateMinor: 3000, marginPpm: 200_000, urgencyPremiumMinor: URGENT_HOURLY_PREMIUM_MINOR });
    expect(urgent.employerHourlyRateMinor).toBe(base.employerHourlyRateMinor + 500);
    expect(urgent.workerHourlyRateMinor).toBe(base.workerHourlyRateMinor + 500);
    // The whole point: the hidden margin (E − W) is identical urgent vs normal.
    expect(urgent.platformHourlyMarginMinor).toBe(base.platformHourlyMarginMinor);
    expect(urgent.employerHourlyRateMinor - urgent.workerHourlyRateMinor).toBe(urgent.platformHourlyMarginMinor);
  });

  it("does not apply the premium to allowances", () => {
    const urgent = computeRequestPricingSnapshot({ employerHourlyRateMinor: 3000, marginPpm: 200_000, urgencyPremiumMinor: 500, transportAllowanceMinor: 1000 });
    const plain = computeRequestPricingSnapshot({ employerHourlyRateMinor: 3000, marginPpm: 200_000, transportAllowanceMinor: 1000 });
    expect(urgent.transport).toEqual(plain.transport);
  });

  it("treats a zero or missing premium as a normal snapshot", () => {
    const plain = computeRequestPricingSnapshot({ employerHourlyRateMinor: 3000, marginPpm: 200_000 });
    const zero = computeRequestPricingSnapshot({ employerHourlyRateMinor: 3000, marginPpm: 200_000, urgencyPremiumMinor: 0 });
    expect(zero).toEqual(plain);
  });
});
