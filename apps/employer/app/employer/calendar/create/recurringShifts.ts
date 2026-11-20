export const MAX_RECURRING_SHIFTS = 31;

export type ShiftTimes = Readonly<{ startAt: string; endAt: string }>;

const DAY_MS = 86_400_000;
const LOCAL_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})$/;

// Dates are handled as plain calendar days so a shift keeps the same clock time across a daylight
// saving change, and a shift that ends the next morning still does.
function dayNumber(value: string): number | null {
  const match = LOCAL_TIME.exec(value.length === 10 ? `${value}T00:00` : value);
  return match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / DAY_MS : null;
}

function atDay(day: number, time: string): string {
  return `${new Date(day * DAY_MS).toISOString().slice(0, 10)}T${time}`;
}

// Every shift in a repeat: the chosen weekdays (0 = Sunday), from the first shift's date through the
// "repeat until" date. Each one becomes its own job.
export function recurringShifts(input: {
  startAt: string;
  endAt: string;
  weekdays: readonly number[];
  until: string;
}): ShiftTimes[] {
  const firstDay = dayNumber(input.startAt);
  const endDay = dayNumber(input.endAt);
  const lastDay = dayNumber(input.until);
  if (firstDay === null || endDay === null || lastDay === null || endDay < firstDay) return [];
  const startTime = input.startAt.slice(11);
  const endTime = input.endAt.slice(11);
  const shifts: ShiftTimes[] = [];
  for (let day = firstDay; day <= lastDay && shifts.length <= MAX_RECURRING_SHIFTS; day += 1) {
    if (!input.weekdays.includes(new Date(day * DAY_MS).getUTCDay())) continue;
    shifts.push({ startAt: atDay(day, startTime), endAt: atDay(day + endDay - firstDay, endTime) });
  }
  return shifts;
}
