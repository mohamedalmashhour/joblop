import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { calculateInvoiceSnapshot } from "@rwos/shared";
import { buildLateCancellationInvoiceInput } from "./invoiceFromTimesheet";
import { employerSafePreview } from "./app";

describe("late employer cancellation invoice", () => {
  const input = buildLateCancellationInvoiceInput({
    timesheetId: "00000000-0000-4000-8000-000000000001",
    timesheetVersion: 1,
    organizationId: "00000000-0000-4000-8000-0000000000aa",
    assignmentId: "00000000-0000-4000-8000-0000000000bb",
    attendanceRecordId: "00000000-0000-4000-8000-0000000000cc",
    employerHourlyRateMinor: 5000,
    occurredAt: "2026-11-10T12:00:00.000Z"
  });

  it("bills exactly 6 hours at the employer rate, with nothing else", () => {
    expect(input.regularLabour.amountMinor).toBe(30000); // 6 h × $50
    expect(input.urgentLabour.amountMinor).toBe(0);
    expect(input.mileage.amountMinor).toBe(0);
    expect(input.marketplaceFees.amountMinor).toBe(0);
    expect(input.bonus).toBeUndefined();
    expect(input.regularLabourDescription).toContain("Late cancellation");
  });

  it("adds GST and QST like every other employer invoice", () => {
    const snapshot = calculateInvoiceSnapshot(input);
    expect(snapshot.subtotal.amountMinor).toBe(30000);
    expect(snapshot.taxes.amountMinor).toBe(4493); // 14.975% of $300, rounded half-up per tax
    expect(snapshot.total.amountMinor).toBe(34493);
    const labour = snapshot.lines.find((line) => line.kind === "regular_labour");
    expect(labour?.description).toContain("Late cancellation");
  });
});

describe("late cancellation never pays or promises pay to workers", () => {
  const src = (file: string) => readFileSync(join(__dirname, file), "utf8");

  it("keeps late-cancellation timesheets out of payroll and the worker's timesheet list", () => {
    const payroll = src("payrollRepository.ts");
    expect(payroll).toContain("exceptionSummary: { not: LATE_CANCELLATION_TIMESHEET_MARKER }");
    expect(payroll).toContain("exception_summary IS DISTINCT FROM");
    expect(src("lateCancellationCharges.ts")).toContain("payableMinutes: 0");
    expect(src("app.ts")).toContain("exceptionSummary: { not: LATE_CANCELLATION_TIMESHEET_MARKER } }]");
  });

  it("strips worker-side fields from what the employer sees", () => {
    const safe = employerSafePreview({ obligationAmountMinor: 36000, workerCompensationHours: 0, workerCompensationMinor: 0 });
    expect(safe).toEqual({ obligationAmountMinor: 36000 });
  });
});
