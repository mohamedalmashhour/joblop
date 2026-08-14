/**
 * Phase 2b.2a — neutral payroll-period timezone resolution. Replaces the former inline
 * `?? "America/Toronto"` implicit-Canada default. Precedence: the request's explicit `timezone`,
 * then the injected country-profile timezone (from the selected country; never an implicit Canada
 * default), else `null`. A `null` result is fail-closed by the caller (the request is rejected) —
 * no country's timezone is ever silently assumed.
 *
 * The returned value is the SAME IANA timezone string the platform used before (e.g. when the
 * countries/canada reference timezone "America/Toronto" is injected), so all downstream date /
 * DST / payroll-period math is byte-identical. This function selects the string; it does not change
 * how the string is used.
 */
export function resolvePayrollPeriodTimezone(
  requestTimezone: string | null | undefined,
  countryTimezone: string | null | undefined
): string | null {
  return requestTimezone ?? countryTimezone ?? null;
}
