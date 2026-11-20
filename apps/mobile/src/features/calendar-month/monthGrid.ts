// Pure month-grid helpers for the worker's monthly calendar. UI-free and unit-tested. Localized
// month/weekday names come from Intl (so Arabic/French names are free and correct).

export type MonthCell = Readonly<{ date: Date; inMonth: boolean; iso: string }>;

/** Local YYYY-MM-DD for a date (used as the per-day key to bucket shifts). */
export function isoDay(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Six Sunday-started weeks covering `month` (0-11) of `year`; days outside the month are inMonth:false. */
export function buildMonthWeeks(year: number, month: number): MonthCell[][] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay()); // back up to the Sunday on/before the 1st
  const weeks: MonthCell[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < 6; w++) {
    const week: MonthCell[] = [];
    for (let d = 0; d < 7; d++) {
      week.push({ date: new Date(cursor), inMonth: cursor.getMonth() === month, iso: isoDay(cursor) });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

/** Move (year, month) by `delta` months, normalising the year. */
export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

/** Localized "Month Year" title, e.g. "July 2026" / "juillet 2026" / "يوليو 2026". */
export function monthTitle(year: number, month: number, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(year, month, 1));
  } catch {
    return `${year}-${month + 1}`;
  }
}

/** Seven localized short weekday names, Sunday-first (to match buildMonthWeeks). */
export function weekdayNames(locale: string): string[] {
  try {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
    // 2023-01-01 is a Sunday.
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2023, 0, 1 + i)));
  } catch {
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  }
}

/** Localized day-of-month number (Arabic locale yields Arabic-Indic digits). */
export function dayNumber(date: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { day: "numeric" }).format(date);
  } catch {
    return String(date.getDate());
  }
}
