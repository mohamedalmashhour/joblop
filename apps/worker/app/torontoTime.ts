// Québec time helpers for worker listings. All shifts are in Québec, so days and "from" dates follow
// America/Toronto, whatever time zone the visitor's device is in.
import { calendarDayKey } from "@rwos/shared";

export const SHIFT_TIME_ZONE = "America/Toronto";

/**
 * The instant a "YYYY-MM-DD" day starts in Toronto, as ISO. A date picker gives "2026-11-12"; reading
 * it with `new Date(...)` means UTC midnight, which is 7 p.m. the day before in Toronto, so a "from"
 * filter used to include the previous evening's jobs. Toronto midnight is 04:00Z (summer) or 05:00Z.
 */
export function torontoStartOfDayIso(ymd: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const hourIn = new Intl.DateTimeFormat("en-CA", { timeZone: SHIFT_TIME_ZONE, hour: "2-digit", hourCycle: "h23" });
  for (const utcHour of [4, 5]) {
    const instant = new Date(Date.UTC(y, m - 1, d, utcHour));
    if (calendarDayKey(instant) === ymd && hourIn.format(instant) === "00") return instant.toISOString();
  }
  return new Date(Date.UTC(y, m - 1, d, 5)).toISOString();
}

/** Group items by their Québec day, days in date order; items keep their order inside a day. */
export function groupByTorontoDay<T>(items: readonly T[], startAt: (item: T) => string): { key: string; items: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = calendarDayKey(startAt(item));
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, list]) => ({ key, items: list }));
}
