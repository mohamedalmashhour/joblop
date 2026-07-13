import type { MoneyAmount, ShiftDiscoveryRecord } from "@rwos/shared";

export function formatMoney(amount: MoneyAmount): string {
  const dollars = amount.amountMinor / 100;
  return new Intl.NumberFormat("en-CA", {
    currency: amount.currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency"
  }).format(dollars);
}

export function formatShiftDate(isoDateTime: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    weekday: "short"
  }).format(new Date(isoDateTime));
}

export function formatShiftTimeRange(shift: ShiftDiscoveryRecord): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC"
  });

  return `${formatter.format(new Date(shift.startAt))} - ${formatter.format(new Date(shift.endAt))}`;
}

export function formatDurationHours(shift: ShiftDiscoveryRecord): string {
  const hours = (Date.parse(shift.endAt) - Date.parse(shift.startAt)) / 3_600_000;
  return `${hours.toFixed(hours % 1 === 0 ? 0 : 1)} hours`;
}
