// Order of the staff dispatch list: soonest shift first (what needs staffing next), dispatches whose
// request is missing at the end; ties keep the newest review first.

export type DispatchListRow = Readonly<{ shiftStartAt: string | null; createdAt: string }>;

export function sortDispatchesBySoonestShift<R extends DispatchListRow>(rows: readonly R[]): R[] {
  const start = (row: R) => (row.shiftStartAt ? Date.parse(row.shiftStartAt) : Number.POSITIVE_INFINITY);
  return [...rows].sort((a, b) => start(a) - start(b) || Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
