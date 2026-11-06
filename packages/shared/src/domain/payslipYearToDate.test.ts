import { describe, expect, it } from "vitest";
import { payslipYearToDate, type PayslipRow } from "./payslipYearToDate";

const row = (periodId: string, periodEnd: string, netPayMinor: number, revision = 1, timezone = "UTC"): PayslipRow => ({
  periodId, revision, periodEnd, timezone, grossPayMinor: netPayMinor * 2, totalDeductionsMinor: netPayMinor, netPayMinor
});

describe("payslipYearToDate", () => {
  it("adds this year's periods up to the slip and leaves out later ones", () => {
    const rows = [row("a", "2026-01-15T00:00:00Z", 100), row("b", "2026-02-15T00:00:00Z", 200), row("c", "2026-03-15T00:00:00Z", 400)];
    expect(payslipYearToDate(rows, rows[1]!)).toEqual({ year: 2026, grossPayMinor: 600, totalDeductionsMinor: 300, netPayMinor: 300 });
  });

  it("starts again on January 1", () => {
    const rows = [row("old", "2025-12-31T12:00:00Z", 900), row("new", "2026-01-01T12:00:00Z", 100)];
    expect(payslipYearToDate(rows, rows[1]!).netPayMinor).toBe(100);
    expect(payslipYearToDate(rows, rows[0]!)).toMatchObject({ year: 2025, netPayMinor: 900 });
  });

  it("uses the pay period's own timezone at the year boundary", () => {
    // 03:00 UTC on Jan 1 is still Dec 31 in Toronto.
    const slip = row("late", "2026-01-01T03:00:00Z", 100, 1, "America/Toronto");
    expect(payslipYearToDate([slip], slip).year).toBe(2025);
  });

  it("counts a corrected period once, using the newest revision", () => {
    const rows = [row("a", "2026-01-15T00:00:00Z", 100, 1), row("a", "2026-01-15T00:00:00Z", 150, 2)];
    expect(payslipYearToDate(rows, rows[1]!).netPayMinor).toBe(150);
  });
});
