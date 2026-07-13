import type { ShiftDiscoveryFilters, ShiftDiscoveryRecord, TimeOfDay } from "@rwos/shared";
import { shiftDiscoveryFiltersSchema } from "@rwos/validation";

export type FilterOption = Readonly<{
  label: string;
  value: string;
}>;

export function normalizeFilters(filters: ShiftDiscoveryFilters = {}): ShiftDiscoveryFilters {
  const normalized = {
    ...(filters.keyword?.trim() ? { keyword: filters.keyword.trim() } : {}),
    ...(filters.city?.trim() ? { city: filters.city.trim() } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.date ? { date: filters.date } : {}),
    ...(filters.minimumHourlyRateMinor !== undefined
      ? { minimumHourlyRateMinor: filters.minimumHourlyRateMinor }
      : {}),
    ...(filters.timeOfDay ? { timeOfDay: filters.timeOfDay } : {}),
    ...(filters.urgency ? { urgency: filters.urgency } : {})
  };

  return shiftDiscoveryFiltersSchema.parse(normalized) as ShiftDiscoveryFilters;
}

export function countActiveFilters(filters: ShiftDiscoveryFilters): number {
  return Object.values(filters).filter((value) => value !== undefined && value !== "").length;
}

export function resetFilters(): ShiftDiscoveryFilters {
  return {};
}

export function getTimeOfDay(isoDateTime: string): TimeOfDay {
  const hour = new Date(isoDateTime).getUTCHours();

  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

export function shiftMatchesFilters(
  shift: ShiftDiscoveryRecord,
  filters: ShiftDiscoveryFilters
): boolean {
  const parsedFilters = normalizeFilters(filters);
  const keyword = parsedFilters.keyword?.toLocaleLowerCase();
  const shiftDate = shift.startAt.slice(0, 10);

  return (
    shift.status === "open" &&
    (!keyword ||
      [
        shift.title,
        shift.employerName,
        shift.description,
        shift.city,
        shift.category,
        ...shift.duties,
        ...shift.requiredCertifications
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(keyword)) &&
    (!parsedFilters.city || shift.city === parsedFilters.city) &&
    (!parsedFilters.category || shift.category === parsedFilters.category) &&
    (!parsedFilters.date || shiftDate === parsedFilters.date) &&
    (!parsedFilters.minimumHourlyRateMinor ||
      shift.hourlyRate.amountMinor >= parsedFilters.minimumHourlyRateMinor) &&
    (!parsedFilters.timeOfDay || getTimeOfDay(shift.startAt) === parsedFilters.timeOfDay) &&
    (!parsedFilters.urgency || shift.urgency === parsedFilters.urgency)
  );
}
