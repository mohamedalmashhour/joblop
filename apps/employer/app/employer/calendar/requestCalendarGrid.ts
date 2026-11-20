// Pure date math for the Request calendar month grid. Weeks start on Monday (Québec convention),
// like the worker, staff and "My calendar" views.
import { calendarDayKey } from "@rwos/shared";

/**
 * Grid key (year-monthIndex-day) of the day a request starts, in the request's own time zone
 * (America/Toronto when missing), so a late shift never moves to the next day on a device elsewhere.
 */
export function requestDayKey(startAt: string, timeZone: string | null | undefined): string | null {
  const key = calendarDayKey(startAt, timeZone || "America/Toronto");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [y, mo, d] = key.split("-").map(Number);
  return `${y}-${(mo ?? 1) - 1}-${d}`;
}

/**
 * List order for the request calendar: requests still to come first, soonest shift first; finished
 * ones after, most recent first. The server sends them newest-created first.
 */
export function sortRequestsForList<R extends { startAt: string; endAt: string }>(requests: readonly R[], now: number): R[] {
  const time = (iso: string) => new Date(iso).getTime();
  const ahead = requests.filter((r) => time(r.endAt) >= now).sort((a, b) => time(a.startAt) - time(b.startAt));
  const done = requests.filter((r) => !(time(r.endAt) >= now)).sort((a, b) => time(b.startAt) - time(a.startAt));
  return [...ahead, ...done];
}

/** Blank cells before day 1 when Monday is the first column (Monday = 0 … Sunday = 6). */
export function mondayOffset(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** Day numbers for a Monday-first month grid, padded with nulls to whole weeks. */
export function mondayFirstCells(month: Date): (number | null)[] {
  const year = month.getFullYear();
  const m = month.getMonth();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(mondayOffset(new Date(year, m, 1))).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Short weekday headers, Monday first, in the given locale. 2024-01-01 was a Monday. */
export function mondayFirstWeekdays(locale: string | undefined): string[] {
  return Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: "short" }));
}
