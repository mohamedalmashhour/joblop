// Rows of the staff dispatch list: soonest shift first, each with its shift's date and time.

export type DispatchRow = {
  id: string;
  jobRequestId: string;
  state: string;
  priority: string;
  requiredWorkerCount: number;
  createdAt: string;
  jobRequestNumber?: string | null;
  shiftStartAt?: string | null;
  shiftEndAt?: string | null;
  shiftTimezone?: string | null;
};

/** Soonest shift first; dispatches without a known shift at the end (the API sorts the same way). */
export function sortRowsBySoonestShift(rows: readonly DispatchRow[]): DispatchRow[] {
  const start = (r: DispatchRow) => (r.shiftStartAt ? Date.parse(r.shiftStartAt) : Number.POSITIVE_INFINITY);
  return [...rows].sort((a, b) => start(a) - start(b));
}

/** "Thu, Nov 12, 8:00 a.m. – 2:00 p.m." in the shift's own time zone (Toronto when missing). */
export function shiftWhen(row: Pick<DispatchRow, "shiftStartAt" | "shiftEndAt" | "shiftTimezone">): string | null {
  if (!row.shiftStartAt) return null;
  const timeZone = row.shiftTimezone || "America/Toronto";
  try {
    const start = new Date(row.shiftStartAt).toLocaleString("en-CA", { timeZone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    const end = row.shiftEndAt ? new Date(row.shiftEndAt).toLocaleTimeString("en-CA", { timeZone, hour: "numeric", minute: "2-digit" }) : null;
    return end ? `${start} – ${end}` : start;
  } catch {
    return null;
  }
}
