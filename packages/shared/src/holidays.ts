// Country-neutral holiday engine (shared core, per MULTI_COUNTRY_PLATFORM_POLICY).
//
// The greetings feature lets an admin send holiday cards, but WHICH holidays exist is country-specific.
// This module holds only the country-neutral machinery: the Holiday shape and the pure date math that
// resolves a holiday's calendar date for a given year (fixed dates, nth-weekday rules, the weekday on
// or before a date, and Easter-relative days). The actual per-country holiday LIST lives in each
// CountryProfile (see country.ts) — never hardcoded here. Pure + deterministic, so it is unit-tested.

export type HolidayRule =
  // A fixed calendar date, e.g. Canada Day = Jul 1.
  | Readonly<{ kind: "fixed"; month: number; day: number }>
  // The nth occurrence of a weekday in a month, e.g. Labour Day = 1st Monday of September.
  | Readonly<{ kind: "nthWeekday"; month: number; weekday: number; nth: number }>
  // The last occurrence of a weekday in a month, e.g. a "last Friday of…" rule.
  | Readonly<{ kind: "lastWeekday"; month: number; weekday: number }>
  // The given weekday on or before a calendar date, e.g. Victoria Day = Monday on or before May 24.
  | Readonly<{ kind: "weekdayOnOrBefore"; month: number; day: number; weekday: number }>
  // A day offset from Easter Sunday, e.g. Good Friday = Easter − 2, Easter Monday = Easter + 1.
  | Readonly<{ kind: "easterOffset"; offsetDays: number }>;

export type Holiday = Readonly<{
  /** Stable machine key, e.g. "canada_day". */
  key: string;
  /** Trilingual display names. */
  en: string;
  fr: string;
  ar: string;
  /** How to compute the date for any given year. */
  rule: HolidayRule;
  /** Optional: only observed in these region codes (e.g. ["QC"] for St-Jean-Baptiste). Empty/absent = nationwide. */
  regions?: readonly string[];
}>;

// weekday: 0 = Sunday … 6 = Saturday (matches Date.getUTCDay()).

/** Anonymous Gregorian algorithm — Easter Sunday for a year, as a UTC date. */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

/** Day (1-based) of the nth `weekday` in month (0-based month index). */
function nthWeekdayOfMonth(year: number, month0: number, weekday: number, nth: number): number {
  const firstDow = new Date(Date.UTC(year, month0, 1)).getUTCDay();
  const offset = (weekday - firstDow + 7) % 7;
  return 1 + offset + (nth - 1) * 7;
}

/** Resolve a holiday rule to a UTC Date in the given year. */
export function resolveHolidayDate(rule: HolidayRule, year: number): Date {
  switch (rule.kind) {
    case "fixed":
      return new Date(Date.UTC(year, rule.month - 1, rule.day));
    case "nthWeekday":
      return new Date(Date.UTC(year, rule.month - 1, nthWeekdayOfMonth(year, rule.month - 1, rule.weekday, rule.nth)));
    case "lastWeekday": {
      const lastDay = new Date(Date.UTC(year, rule.month, 0)).getUTCDate();
      const lastDow = new Date(Date.UTC(year, rule.month - 1, lastDay)).getUTCDay();
      return new Date(Date.UTC(year, rule.month - 1, lastDay - ((lastDow - rule.weekday + 7) % 7)));
    }
    case "weekdayOnOrBefore": {
      const anchor = new Date(Date.UTC(year, rule.month - 1, rule.day));
      const back = (anchor.getUTCDay() - rule.weekday + 7) % 7;
      return new Date(Date.UTC(year, rule.month - 1, rule.day - back));
    }
    case "easterOffset": {
      const e = easterSunday(year);
      return new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate() + rule.offsetDays));
    }
  }
}

export type ResolvedHoliday = Holiday & Readonly<{ date: string; daysUntil: number }>; // date = YYYY-MM-DD

function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Upcoming holidays from `from` (inclusive), soonest first. Looks across the current and next year so a
 * late-December `from` still surfaces January holidays. `limit` caps the count (default all within range).
 */
export function upcomingHolidays(holidays: readonly Holiday[], from: Date, limit?: number): ResolvedHoliday[] {
  const startUtc = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const year = from.getUTCFullYear();
  const resolved: ResolvedHoliday[] = [];
  for (const h of holidays) {
    for (const y of [year, year + 1]) {
      const d = resolveHolidayDate(h.rule, y);
      const dUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      if (dUtc >= startUtc) {
        resolved.push({ ...h, date: ymd(d), daysUntil: Math.round((dUtc - startUtc) / 86_400_000) });
        break; // the soonest future occurrence of this holiday
      }
    }
  }
  resolved.sort((a, b) => a.daysUntil - b.daysUntil);
  return typeof limit === "number" ? resolved.slice(0, limit) : resolved;
}
