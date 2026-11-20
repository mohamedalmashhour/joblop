// Calendar days in a time zone. A search for "2027-01-22" means that day where the jobs are
// (America/Toronto for Canada), not midnight UTC: midnight UTC is 19:00 the evening before in
// Toronto, so "until 2027-01-22" used to drop every job ON the 22nd.

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Minutes the zone is ahead of UTC at an instant (Toronto in January: -300). */
function zoneOffsetMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60_000);
}

/** The instant a local calendar day ("YYYY-MM-DD") starts in the zone, or null for anything else. */
export function localDayStart(day: string, timeZone: string): Date | null {
  const match = DAY.exec(day.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const wallMidnight = Date.UTC(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(wallMidnight) || new Date(wallMidnight).toISOString().slice(0, 10) !== day.trim()) return null;
  // Two passes settle the offset across a daylight-saving change.
  let guess = wallMidnight - zoneOffsetMinutes(new Date(wallMidnight), timeZone) * 60_000;
  guess = wallMidnight - zoneOffsetMinutes(new Date(guess), timeZone) * 60_000;
  return new Date(guess);
}

/** The last millisecond of a local calendar day in the zone (an inclusive end), or null. */
export function localDayEnd(day: string, timeZone: string): Date | null {
  const match = DAY.exec(day.trim());
  if (!match || !localDayStart(day, timeZone)) return null;
  const next = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1)).toISOString().slice(0, 10);
  const nextStart = localDayStart(next, timeZone);
  return nextStart ? new Date(nextStart.getTime() - 1) : null;
}

/**
 * A search date filter: a plain day is read in the zone (from = start of the day, to = end of the day,
 * inclusive); a full date-time is taken as given; anything else is ignored.
 */
export function searchDateBound(value: string | null | undefined, edge: "from" | "to", timeZone: string): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (DAY.test(trimmed)) return edge === "from" ? localDayStart(trimmed, timeZone) : localDayEnd(trimmed, timeZone);
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}
