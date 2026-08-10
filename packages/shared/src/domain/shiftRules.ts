// Employer-facing mirror of the authoritative 6-hour minimum shift rule.
// The AUTHORITATIVE enforcement lives in the API/service layer
// (@rwos/auth: MINIMUM_STAFFING_SHIFT_MINUTES + meetsMinimumShiftDuration).
// These are for UI copy + optimistic input guarding only; the server decides.

export const MINIMUM_SHIFT_HOURS = 6;
export const MINIMUM_SHIFT_MINUTES = MINIMUM_SHIFT_HOURS * 60;
export const MINIMUM_SHIFT_MESSAGE = "JobLop shifts have a minimum duration of 6 hours.";

// Whole/fractional shift duration in minutes between two ISO timestamps.
// Returns 0 when the range is invalid or non-positive.
export function shiftDurationMinutes(startIso: string, endIso: string): number {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return (end - start) / 60000;
}

// True when the shift meets the 6-hour minimum. A zero/invalid range is not a
// valid shift, so it does not "meet" the minimum.
export function meetsMinimumShiftDuration(startIso: string, endIso: string): boolean {
  return shiftDurationMinutes(startIso, endIso) >= MINIMUM_SHIFT_MINUTES;
}
