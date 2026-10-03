// Market-wage comparison (pure). Given what an employer pays for a role and the admin-maintained
// market median for that role/province, say whether the employer is below, at, or above market.
// Reference/advisory only — this never affects pricing, payroll or invoices.

export type MarketComparison = "below" | "at" | "above" | "unknown";

/** A rate within ±5% of the market median counts as "at market". */
export const MARKET_TOLERANCE_PPM = 50_000;

export function compareToMarket(
  employerHourlyRateMinor: number,
  marketMedianMinor: number | null | undefined
): MarketComparison {
  if (!marketMedianMinor || marketMedianMinor <= 0 || !Number.isFinite(employerHourlyRateMinor)) {
    return "unknown";
  }
  const band = Math.round((marketMedianMinor * MARKET_TOLERANCE_PPM) / 1_000_000);
  if (employerHourlyRateMinor < marketMedianMinor - band) return "below";
  if (employerHourlyRateMinor > marketMedianMinor + band) return "above";
  return "at";
}
