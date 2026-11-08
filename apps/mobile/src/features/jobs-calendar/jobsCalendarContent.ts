// Pure helpers for the Jobs calendar (real open Joblop jobs by day). UI-free and unit-tested.
import type { ClaimOpenJobResult, OpenJob } from "../../auth/secureSession";
import { buildMonthWeeks, isoDay } from "../calendar-month/monthGrid";

/** The request window covering every cell of the visible month grid (local midnight to midnight). */
export function gridWindow(year: number, month: number): { from: string; to: string } {
  const weeks = buildMonthWeeks(year, month);
  const first = weeks[0]![0]!.date;
  const lastWeek = weeks[weeks.length - 1]!;
  const last = lastWeek[lastWeek.length - 1]!.date;
  const from = new Date(first.getFullYear(), first.getMonth(), first.getDate());
  const to = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Bucket jobs by the local day they start on, each day sorted by start time. */
export function groupJobsByDay(jobs: readonly OpenJob[]): Map<string, OpenJob[]> {
  const byDay = new Map<string, OpenJob[]>();
  for (const job of jobs) {
    const key = isoDay(new Date(job.startAt));
    const list = byDay.get(key) ?? [];
    list.push(job);
    byDay.set(key, list);
  }
  for (const list of byDay.values()) list.sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  return byDay;
}

/** Local start–end time, e.g. "9:00 a.m. – 5:00 p.m." in the worker's language. */
export function formatJobTime(startAt: string, endAt: string, locale: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  try {
    const fmt = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" });
    return `${fmt.format(start)} – ${fmt.format(end)}`;
  } catch {
    const hm = (d: Date) => `${d.getHours()}:${`${d.getMinutes()}`.padStart(2, "0")}`;
    return `${hm(start)} – ${hm(end)}`;
  }
}

/** Hourly pay from cents/hour, or null when the rate is not shared. */
export function formatHourlyRate(workerRateMinor: number | null, locale: string, perHour: string): string | null {
  if (workerRateMinor === null) return null;
  const amount = workerRateMinor / 100;
  try {
    return `${new Intl.NumberFormat(locale, { style: "currency", currency: "CAD", currencyDisplay: "narrowSymbol" }).format(amount)}${perHour}`;
  } catch {
    return `$${amount.toFixed(2)}${perHour}`;
  }
}

export function isUrgent(job: OpenJob): boolean {
  return job.urgency !== "standard";
}

/** "N places left" with a singular form. Templates use {n}. */
export function placesLeftLabel(count: number, one: string, many: string): string {
  return count === 1 ? one : many.replace("{n}", String(count));
}

export type ClaimMessage = Readonly<{ tone: "success" | "warning" | "danger"; key: string; reasons: readonly string[] }>;

/** The message (translation key) shown after an Accept attempt. */
export function claimMessage(result: ClaimOpenJobResult): ClaimMessage {
  switch (result.status) {
    case "assigned":
      return { tone: "success", key: "jobs.msg.assigned", reasons: [] };
    case "full":
      return { tone: "warning", key: "jobs.msg.full", reasons: [] };
    case "not_open":
      return { tone: "warning", key: "jobs.msg.notOpen", reasons: [] };
    case "ineligible":
      return { tone: "warning", key: "jobs.msg.ineligible", reasons: result.reasons.map(humanizeReason) };
    case "denied":
      return { tone: "danger", key: "jobs.msg.denied", reasons: [] };
    case "offline":
      return { tone: "danger", key: "jobs.msg.offline", reasons: [] };
    default:
      return { tone: "danger", key: "jobs.msg.error", reasons: [] };
  }
}

/** "pay_channel_election_required" → "Pay channel election required". */
export function humanizeReason(reason: string): string {
  const text = reason.replace(/[_-]+/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : reason;
}
