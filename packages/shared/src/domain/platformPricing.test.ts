import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLATFORM_MARGIN_PPM,
  MAX_PLATFORM_MARGIN_PPM,
  MINIMUM_BILLABLE_SHIFT_HOURS,
  billableHours,
  computeShiftPricing,
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
