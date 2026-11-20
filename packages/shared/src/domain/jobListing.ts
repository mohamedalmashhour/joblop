// Long-term job LISTINGS (owner decision, Nov 2026; behind EMPLOYER_PLANS_ENABLED). A long-term job
// (contract over 4 weeks) is a paid listing, like Indeed: Joblop only puts the employer and the
// worker in touch. The employer hires the worker and pays them directly; Joblop takes NO hourly
// share and runs no timesheets, invoices or payroll for it.
//
//  - Price: C$99 per long-term job listing per month, PAID IN ADVANCE, plus GST 5% + QST 9.975%.
//  - Free trial: 2 weeks, once per organization (its first long-term listing), no card.
//  - First paid month: 50% off (C$49.50 + taxes), once per organization — whether or not it had a
//    trial. Then C$99/month.
//  - Each paid month extends the listing's listedUntil by one month (from the later of now and the
//    current listedUntil). No auto-renew. A job is shown to workers only while now < listedUntil.
//
// Pure and deterministic; integer minor units.
import { quebecSalesTax, type QuebecSalesTax } from "./quebecSalesTax";

export const JOB_LISTING_MONTHLY_PRICE_MINOR = 9_900;
export const JOB_LISTING_CURRENCY = "CAD";
export const JOB_LISTING_TRIAL_DAYS = 14;
export const JOB_LISTING_PERIOD_MONTHS = 1;

export const JOB_LISTING_DISCOUNT_KINDS = ["first_month_half", "none"] as const;
export type JobListingDiscountKind = (typeof JOB_LISTING_DISCOUNT_KINDS)[number];

export type JobListingPrice = QuebecSalesTax &
  Readonly<{
    discountKind: JobListingDiscountKind;
    /** Price before the discount and taxes (always the full monthly price). */
    listPriceMinor: number;
    currency: string;
  }>;

/** Price of one listing month. firstPaidMonth → 50% off (rounded half-up to the cent). */
export function jobListingMonthPrice(firstPaidMonth: boolean): JobListingPrice {
  const listPriceMinor = JOB_LISTING_MONTHLY_PRICE_MINOR;
  const subtotal = firstPaidMonth ? Math.floor(listPriceMinor / 2 + 0.5) : listPriceMinor;
  return {
    ...quebecSalesTax(subtotal),
    discountKind: firstPaidMonth ? "first_month_half" : "none",
    listPriceMinor,
    currency: JOB_LISTING_CURRENCY
  };
}

export type JobListingStatus = "not_listed" | "trial" | "listed" | "expired";

/**
 * Status at `now` (read time, no cron): never listed → not_listed; listedUntil in the future → trial
 * (when that end is the trial end) or listed; listedUntil passed → expired.
 */
export function jobListingStatusAt(
  listing: Readonly<{ listedUntil: Date | null; trialEndsAt: Date | null }> | null | undefined,
  now: Date
): JobListingStatus {
  if (!listing || !listing.listedUntil) return "not_listed";
  if (listing.listedUntil.getTime() <= now.getTime()) return "expired";
  if (listing.trialEndsAt && listing.trialEndsAt.getTime() === listing.listedUntil.getTime()) return "trial";
  return "listed";
}

/** True when workers may see the listing at `now`. */
export function isJobListedAt(listing: Readonly<{ listedUntil: Date | null }> | null | undefined, now: Date): boolean {
  return !!listing?.listedUntil && listing.listedUntil.getTime() > now.getTime();
}

/** Add whole calendar months (JS Date month arithmetic, like the employer plan periods). */
export function addListingMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime());
  next.setMonth(next.getMonth() + months);
  return next;
}

/** New listedUntil after a paid month: extends from the later of now and the current end. */
export function extendListedUntil(current: Date | null, now: Date, months: number = JOB_LISTING_PERIOD_MONTHS): Date {
  const from = current && current.getTime() > now.getTime() ? current : now;
  return addListingMonths(from, months);
}
