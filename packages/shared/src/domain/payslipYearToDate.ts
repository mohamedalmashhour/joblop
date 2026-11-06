// Year-to-date totals for a pay slip. The year always runs January 1 to December 31, in the pay
// period's own timezone, and counts every pay period up to and including the slip being shown. When a
// pay period was corrected, only its newest approved revision counts, so nothing is counted twice.

export type PayslipRow = Readonly<{
  periodId: string;
  revision: number;
  periodEnd: string;
  timezone: string;
  grossPayMinor: number;
  totalDeductionsMinor: number;
  netPayMinor: number;
}>;

export type PayslipYearToDate = Readonly<{
  year: number;
  grossPayMinor: number;
  totalDeductionsMinor: number;
  netPayMinor: number;
}>;

export function payslipYear(periodEnd: string, timezone: string): number {
  return Number(new Intl.DateTimeFormat("en-CA", { year: "numeric", timeZone: timezone }).format(new Date(periodEnd)));
}

export function payslipYearToDate(rows: readonly PayslipRow[], slip: Pick<PayslipRow, "periodEnd" | "timezone">): PayslipYearToDate {
  const year = payslipYear(slip.periodEnd, slip.timezone);
  const cutoff = new Date(slip.periodEnd).getTime();
  const newestByPeriod = new Map<string, PayslipRow>();
  for (const row of rows) {
    const held = newestByPeriod.get(row.periodId);
    if (!held || row.revision > held.revision) newestByPeriod.set(row.periodId, row);
  }
  let grossPayMinor = 0;
  let totalDeductionsMinor = 0;
  let netPayMinor = 0;
  for (const row of newestByPeriod.values()) {
    if (payslipYear(row.periodEnd, row.timezone) !== year) continue;
    if (new Date(row.periodEnd).getTime() > cutoff) continue;
    grossPayMinor += row.grossPayMinor;
    totalDeductionsMinor += row.totalDeductionsMinor;
    netPayMinor += row.netPayMinor;
  }
  return { year, grossPayMinor, totalDeductionsMinor, netPayMinor };
}
