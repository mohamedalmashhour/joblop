import { describe, expect, it } from "vitest";
import {
  JOB_LISTING_MONTHLY_PRICE_MINOR,
  JOB_LISTING_TRIAL_DAYS,
  extendListedUntil,
  isJobListedAt,
  jobListingMonthPrice,
  jobListingStatusAt
} from "./jobListing";
import { quebecSalesTax } from "./quebecSalesTax";

const NOW = new Date("2026-11-08T12:00:00.000Z");
const day = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

describe("Québec sales tax on Joblop fees", () => {
  it("adds GST 5% and QST 9.975%, each rounded half-up to the cent", () => {
    expect(quebecSalesTax(9_900)).toEqual({ subtotalMinor: 9_900, gstMinor: 495, qstMinor: 988, totalMinor: 11_383 });
    expect(quebecSalesTax(4_950)).toEqual({ subtotalMinor: 4_950, gstMinor: 248, qstMinor: 494, totalMinor: 5_692 });
    expect(quebecSalesTax(0)).toEqual({ subtotalMinor: 0, gstMinor: 0, qstMinor: 0, totalMinor: 0 });
    expect(quebecSalesTax(-5)).toEqual({ subtotalMinor: 0, gstMinor: 0, qstMinor: 0, totalMinor: 0 });
    expect(quebecSalesTax(Number.NaN).totalMinor).toBe(0);
  });
});

describe("long-term job listing price", () => {
  it("is C$99/month with a 2-week trial", () => {
    expect(JOB_LISTING_MONTHLY_PRICE_MINOR).toBe(9_900);
    expect(JOB_LISTING_TRIAL_DAYS).toBe(14);
  });

  it("first paid month is half price (C$49.50 + taxes), then full price", () => {
    expect(jobListingMonthPrice(true)).toEqual({
      subtotalMinor: 4_950,
      gstMinor: 248,
      qstMinor: 494,
      totalMinor: 5_692,
      discountKind: "first_month_half",
      listPriceMinor: 9_900,
      currency: "CAD"
    });
    expect(jobListingMonthPrice(false)).toMatchObject({ subtotalMinor: 9_900, totalMinor: 11_383, discountKind: "none" });
  });
});

describe("listing status (read time, no cron)", () => {
  it("not listed, trial, listed and expired", () => {
    expect(jobListingStatusAt(null, NOW)).toBe("not_listed");
    expect(jobListingStatusAt({ listedUntil: null, trialEndsAt: null }, NOW)).toBe("not_listed");
    expect(jobListingStatusAt({ listedUntil: day(14), trialEndsAt: day(14) }, NOW)).toBe("trial");
    expect(jobListingStatusAt({ listedUntil: day(44), trialEndsAt: day(14) }, NOW)).toBe("listed");
    expect(jobListingStatusAt({ listedUntil: day(30), trialEndsAt: null }, NOW)).toBe("listed");
    expect(jobListingStatusAt({ listedUntil: day(-1), trialEndsAt: day(-1) }, NOW)).toBe("expired");
    expect(jobListingStatusAt({ listedUntil: NOW, trialEndsAt: null }, NOW)).toBe("expired");
  });

  it("is visible to workers only while now < listedUntil", () => {
    expect(isJobListedAt({ listedUntil: day(1) }, NOW)).toBe(true);
    expect(isJobListedAt({ listedUntil: NOW }, NOW)).toBe(false);
    expect(isJobListedAt({ listedUntil: null }, NOW)).toBe(false);
    expect(isJobListedAt(null, NOW)).toBe(false);
  });

  it("a paid month extends from the later of now and the current end", () => {
    expect(extendListedUntil(null, NOW).toISOString()).toBe("2026-12-08T12:00:00.000Z");
    expect(extendListedUntil(day(-3), NOW).toISOString()).toBe("2026-12-08T12:00:00.000Z");
    expect(extendListedUntil(day(14), NOW).toISOString()).toBe("2026-12-22T12:00:00.000Z");
  });
});
