// Pay shown on OUTSIDE job-board listings (Find work list, public board). Outside boards send pay in
// cents with a period ("hour" / "year") that is sometimes missing; a value under $200 is an hourly
// rate, a larger one is a yearly salary (the same rule the listings used before). Money is formatted
// in the reader's language: "$16.60/h", "16,60 $/h", Arabic with Western digits like the rest of the
// app. Yearly salaries are shown compact: "$45K/yr", "45 k $/an".
import { fmtLocale, type WorkerLocale } from "./i18n/config";

export type LeadPay = Readonly<{
  salaryMinMinor?: number | null;
  salaryMaxMinor?: number | null;
  salaryPeriod?: string | null;
}>;

const HOURLY_BELOW_MINOR = 20000;

const SUFFIX: Readonly<Record<"en" | "fr" | "ar", { hour: string; year: string }>> = {
  en: { hour: "/h", year: "/yr" },
  fr: { hour: "/h", year: "/an" },
  ar: { hour: " / ساعة", year: " / سنة" }
};

function positive(minor: number | null | undefined): number | null {
  return typeof minor === "number" && Number.isFinite(minor) && minor > 0 ? minor : null;
}

/** True when the listing's pay is an hourly rate (by period, or by size when the period is missing). */
export function isHourlyLeadPay(minor: number, period: string | null | undefined): boolean {
  if (period === "hour") return true;
  if (period === "year") return false;
  return minor < HOURLY_BELOW_MINOR;
}

export function leadPayLabel(lead: LeadPay, locale: WorkerLocale): string | null {
  const hi = positive(lead.salaryMaxMinor);
  const lo = positive(lead.salaryMinMinor);
  const top = hi ?? lo;
  if (top === null) return null;
  const lang = locale === "ar" ? "ar" : locale === "fr-CA" ? "fr" : "en";
  const intl = fmtLocale(locale);
  if (isHourlyLeadPay(top, lead.salaryPeriod)) {
    const amount = new Intl.NumberFormat(intl, { style: "currency", currency: "CAD" }).format(top / 100);
    return `${amount}${SUFFIX[lang].hour}`;
  }
  const compact = new Intl.NumberFormat(intl, { style: "currency", currency: "CAD", notation: "compact", maximumFractionDigits: 0 });
  const range = lo !== null && hi !== null && Math.round(lo / 100000) !== Math.round(hi / 100000)
    ? `${compact.format(lo / 100)}–${compact.format(hi / 100)}`
    : compact.format(top / 100);
  return `${range}${SUFFIX[lang].year}`;
}
