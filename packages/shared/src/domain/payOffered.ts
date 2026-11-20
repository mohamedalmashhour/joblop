// "Pay offered" on a long-term job (behind EMPLOYER_PLANS_ENABLED). A long-term job is a paid
// listing: the employer hires the worker and pays them DIRECTLY, so Joblop holds no rate for it (its
// pricing snapshot is zero money). The employer states the pay in the ad instead, the way Québec job
// ads do: one amount or a range, per hour or per year ("22 $ – 25 $ / h", "45 000 $ / an").
//
// Workers see this amount labelled "paid directly by the employer" — never $0, never Joblop's share
// and never an employer contract rate. Pure and deterministic; integer minor units (cents).

export const PAY_OFFERED_UNITS = ["hour", "year"] as const;
export type PayOfferedUnit = (typeof PAY_OFFERED_UNITS)[number];
export const PAY_OFFERED_CURRENCY = "CAD";

/** Sanity bounds per unit, in cents (not a wage rule: they only reject typos such as 2 500 000 $/h). */
export const PAY_OFFERED_BOUNDS: Readonly<Record<PayOfferedUnit, Readonly<{ minMinor: number; maxMinor: number }>>> = {
  hour: { minMinor: 100, maxMinor: 100_000 }, // 1 $ … 1 000 $ per hour
  year: { minMinor: 100_000, maxMinor: 100_000_000 } // 1 000 $ … 1 000 000 $ per year
};

export type PayOffered = Readonly<{
  /** The amount, or the low end of the range. */
  minMinor: number;
  /** The high end of the range; null for a single amount. */
  maxMinor: number | null;
  unit: PayOfferedUnit;
  currency: string;
}>;

/** What a worker receives: the employer's pay offer, always marked as paid by the employer. */
export type PayOfferedView = PayOffered & Readonly<{ paidBy: "employer" }>;

const isWhole = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value);

/**
 * Validate an employer-entered pay offer ({ minMinor, maxMinor?, unit }). Returns null when it is
 * missing or out of bounds. A max equal to the min collapses to a single amount.
 */
export function parsePayOffered(input: unknown): PayOffered | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  const unit = record.unit;
  if (unit !== "hour" && unit !== "year") return null;
  const bounds = PAY_OFFERED_BOUNDS[unit];
  const minMinor = record.minMinor;
  if (!isWhole(minMinor) || minMinor < bounds.minMinor || minMinor > bounds.maxMinor) return null;
  const rawMax = record.maxMinor;
  let maxMinor: number | null = null;
  if (rawMax !== undefined && rawMax !== null) {
    if (!isWhole(rawMax) || rawMax < minMinor || rawMax > bounds.maxMinor) return null;
    maxMinor = rawMax === minMinor ? null : rawMax;
  }
  return { minMinor, maxMinor, unit, currency: PAY_OFFERED_CURRENCY };
}

/** Parse dollars typed in a form ("22", "22.50", "45 000", "45000,00") into cents; null when not a number. */
export function dollarsToMinor(value: string): number | null {
  const cleaned = value.replace(/[\s\u00a0\u202f$]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

/** Build a pay offer from form fields (dollars). Empty max = single amount. Null when invalid. */
export function payOfferedFromForm(input: Readonly<{ min: string; max: string; unit: string }>): PayOffered | null {
  const minMinor = dollarsToMinor(input.min);
  if (minMinor === null) return null;
  const maxText = input.max.trim();
  const maxMinor = maxText === "" ? null : dollarsToMinor(maxText);
  if (maxText !== "" && maxMinor === null) return null;
  return parsePayOffered({ minMinor, maxMinor, unit: input.unit });
}

/** Rebuild a stored pay offer from its three columns (null when not set or no longer valid). */
export function payOfferedFromColumns(
  row: Readonly<{ payOfferedMinMinor?: number | null; payOfferedMaxMinor?: number | null; payOfferedUnit?: string | null }>
): PayOffered | null {
  if (row.payOfferedMinMinor == null || row.payOfferedUnit == null) return null;
  return parsePayOffered({ minMinor: row.payOfferedMinMinor, maxMinor: row.payOfferedMaxMinor ?? null, unit: row.payOfferedUnit });
}

/** The worker-facing view of a pay offer (marks who pays). */
export function toPayOfferedView(pay: PayOffered): PayOfferedView {
  return { minMinor: pay.minMinor, maxMinor: pay.maxMinor, unit: pay.unit, currency: pay.currency, paidBy: "employer" };
}

/** Accept a pay-offered view from an API payload (used by clients); null when absent or malformed. */
export function parsePayOfferedView(input: unknown): PayOfferedView | null {
  const pay = parsePayOffered(input);
  return pay ? toPayOfferedView(pay) : null;
}

const isFrench = (locale: string) => locale.toLowerCase().startsWith("fr");
// Arabic text with Western digits and CAD formatted the Canadian way (same as the worker website).
const isArabic = (locale: string) => locale.toLowerCase().startsWith("ar");

function money(minor: number, unit: PayOfferedUnit, currency: string, locale: string): string {
  const whole = minor % 100 === 0;
  return new Intl.NumberFormat(isFrench(locale) ? "fr-CA" : "en-CA", {
    style: "currency",
    currency: currency || PAY_OFFERED_CURRENCY,
    minimumFractionDigits: unit === "year" || whole ? 0 : 2,
    maximumFractionDigits: unit === "year" ? 0 : 2
  }).format(minor / 100);
}

/** "$22–$25/h", "$45,000/year" (en) · "22 $–25 $/h", "45 000 $/an" (fr) · "$45,000/سنة" (ar). */
export function formatPayOffered(pay: PayOffered, locale: string): string {
  const low = money(pay.minMinor, pay.unit, pay.currency, locale);
  const amount = pay.maxMinor === null ? low : `${low}–${money(pay.maxMinor, pay.unit, pay.currency, locale)}`;
  const unit = pay.unit === "hour" ? "/h" : isFrench(locale) ? "/an" : isArabic(locale) ? "/سنة" : "/year";
  return `${amount}${unit}`;
}

/** One sentence for emails and offer terms. Without an amount it still says who pays. */
export function payOfferedSentence(pay: PayOffered | null, locale: string): string {
  if (isFrench(locale)) {
    return pay ? `${formatPayOffered(pay, locale)}, payé directement par l'employeur` : "Salaire convenu et payé directement par l'employeur";
  }
  if (isArabic(locale)) {
    return pay ? `${formatPayOffered(pay, locale)}، يدفعه صاحب العمل مباشرة` : "أجر متفق عليه يدفعه صاحب العمل مباشرة";
  }
  return pay ? `${formatPayOffered(pay, locale)}, paid directly by the employer` : "Pay agreed and paid directly by the employer";
}
