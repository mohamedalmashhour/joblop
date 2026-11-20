import { describe, expect, it } from "vitest";

import {
  isActiveJobBonusStatus,
  isWithinPlatformShare,
  jobBonusInvoiceMinor,
  jobBonusPlatformCap,
  jobBonusWorkerPayMinor,
  suggestJobBonus,
  validateJobBonusAmount
} from "./jobBonus";

const now = new Date("2026-11-07T12:00:00.000Z");
const at = (hoursFromNow: number) => new Date(now.getTime() + hoursFromNow * 3_600_000);

describe("suggestJobBonus", () => {
  it("suggests about 10% of the worker wage, rounded up to 25 cents, for a shift days away", () => {
    // 10% of $21.60 = $2.16 -> rounded up to $2.25; 8-hour shift -> one-time $18.00.
    const s = suggestJobBonus({ workerHourlyRateMinor: 2_160, platformHourlyMarginMinor: 540, startAt: at(48), endAt: at(56), now });
    expect(s.kind).toBe("hourly");
    expect(s.amountMinor).toBe(225);
    expect(s.oneTimeEquivalentMinor).toBe(1_800);
    expect(s.platformCapHourlyMinor).toBe(540);
    expect(s.platformCapShiftMinor).toBe(4_320);
    expect(s.reason).toContain("10%");
  });

  it("uses 15% when the shift starts within 12 hours", () => {
    // 15% of $21.60 = $3.24 -> $3.25.
    const s = suggestJobBonus({ workerHourlyRateMinor: 2_160, platformHourlyMarginMinor: 540, startAt: at(6), endAt: at(14), now });
    expect(s.amountMinor).toBe(325);
    expect(s.oneTimeEquivalentMinor).toBe(2_600);
    expect(s.reason).toContain("15%");
  });

  it("never suggests less than $1/h and keeps exact multiples of 25 cents", () => {
    expect(suggestJobBonus({ workerHourlyRateMinor: 500, platformHourlyMarginMinor: 100, startAt: at(48), endAt: at(56), now }).amountMinor).toBe(100);
    // 10% of $25.00 = $2.50 exactly -> stays $2.50.
    expect(suggestJobBonus({ workerHourlyRateMinor: 2_500, platformHourlyMarginMinor: 625, startAt: at(48), endAt: at(56), now }).amountMinor).toBe(250);
  });

  it("is deterministic", () => {
    const args = { workerHourlyRateMinor: 1_999, platformHourlyMarginMinor: 500, startAt: at(20), endAt: at(26), now };
    expect(suggestJobBonus(args)).toEqual(suggestJobBonus(args));
  });
});

describe("bonus amounts and money", () => {
  it("validates integer cents per kind", () => {
    expect(validateJobBonusAmount("hourly", 25)).toBe("ok");
    expect(validateJobBonusAmount("hourly", 24)).toBe("invalid_amount");
    expect(validateJobBonusAmount("hourly", 50_001)).toBe("invalid_amount");
    expect(validateJobBonusAmount("hourly", 2.5)).toBe("invalid_amount");
    expect(validateJobBonusAmount("transport", 99)).toBe("invalid_amount");
    expect(validateJobBonusAmount("one_time", 200_000)).toBe("ok");
    expect(validateJobBonusAmount("one_time", "100")).toBe("invalid_amount");
  });

  it("caps platform-funded bonuses at the platform share", () => {
    const cap = jobBonusPlatformCap({ platformHourlyMarginMinor: 540, startAt: at(1), endAt: at(9) });
    expect(cap).toEqual({ hourlyMinor: 540, shiftMinor: 4_320 });
    expect(isWithinPlatformShare("hourly", 540, cap)).toBe(true);
    expect(isWithinPlatformShare("hourly", 541, cap)).toBe(false);
    expect(isWithinPlatformShare("transport", 4_320, cap)).toBe(true);
    expect(isWithinPlatformShare("one_time", 4_321, cap)).toBe(false);
  });

  it("pays the worker actual hours, bills the employer the 6-hour minimum", () => {
    const hourly = { kind: "hourly" as const, amountMinor: 200 };
    // 4h worked: worker gets 4 x $2, employer billed 6 x $2.
    expect(jobBonusWorkerPayMinor(hourly, 240)).toBe(800);
    expect(jobBonusInvoiceMinor(hourly, 240)).toBe(1_200);
    // 7.5h worked: both use 7.5h.
    expect(jobBonusWorkerPayMinor(hourly, 450)).toBe(1_500);
    expect(jobBonusInvoiceMinor(hourly, 450)).toBe(1_500);
    const fixed = { kind: "transport" as const, amountMinor: 1_500 };
    expect(jobBonusWorkerPayMinor(fixed, 240)).toBe(1_500);
    expect(jobBonusInvoiceMinor(fixed, 240)).toBe(1_500);
  });

  it("treats only accepted/approved bonuses as active", () => {
    expect(isActiveJobBonusStatus("employer_accepted")).toBe(true);
    expect(isActiveJobBonusStatus("approved")).toBe(true);
    expect(isActiveJobBonusStatus("offered_to_employer")).toBe(false);
    expect(isActiveJobBonusStatus("cancelled")).toBe(false);
  });
});
