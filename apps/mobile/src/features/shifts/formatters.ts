import {
  formatRwosDateTime,
  formatRwosCurrency,
  formatRwosNumber,
  type MoneyAmount,
  type ShiftDiscoveryRecord,
  type ShiftOfferSnapshot
} from "@rwos/shared";

type ShiftTimeRangeRecord = Pick<ShiftDiscoveryRecord | ShiftOfferSnapshot, "startAt" | "endAt">;

export function formatMoney(amount: MoneyAmount): string {
  return formatRwosCurrency(amount.amountMinor / 100, amount.currency);
}

export function formatShiftDate(isoDateTime: string): string {
  return formatRwosDateTime(isoDateTime, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    weekday: "short"
  });
}

export function formatShiftTimeRange(shift: ShiftTimeRangeRecord): string {
  const options = {
    hour: "numeric",
    minute: "2-digit" as const,
    timeZone: "UTC"
  } as const;
  const start = formatRwosDateTime(shift.startAt, options);
  const end = formatRwosDateTime(shift.endAt, options);
  return start === "Unavailable" || end === "Unavailable" ? "Unavailable" : `${start} - ${end}`;
}

export function formatDurationHours(shift: ShiftTimeRangeRecord): string {
  const hours = (Date.parse(shift.endAt) - Date.parse(shift.startAt)) / 3_600_000;
  const formatted = formatRwosNumber(hours, {
    maximumFractionDigits: hours % 1 === 0 ? 0 : 1
  });
  return formatted === "Unavailable" ? formatted : `${formatted} hours`;
}
