// Pure date math for the Request calendar month grid. Weeks start on Monday (Québec convention),
// like the worker, staff and "My calendar" views.

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
