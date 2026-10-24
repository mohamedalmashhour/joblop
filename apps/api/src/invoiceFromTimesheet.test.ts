import { describe, expect, it } from "vitest";
import { calculateInvoiceSnapshot } from "@rwos/shared";
import { buildInvoiceCalculationInput } from "./invoiceFromTimesheet";

describe("buildInvoiceCalculationInput (Gap B — variable extras billed with GST/QST)", () => {
  // Nurse urgent, 55 km out, 6h billable. Snapshot: employer $50/h (incl. $5 urgency), emergency
  // $6.75/h (platform keeps), distance $40 (gas+travel). Expect:
  //   regular $270 + urgent $30 + distance $40 + emergency $40.50 = $380.50 subtotal
  //   GST+QST 14.975% = $56.98 ; total $437.48
  const input = buildInvoiceCalculationInput({
    timesheetId: "00000000-0000-4000-8000-000000000001",
    timesheetVersion: 2,
    organizationId: "00000000-0000-4000-8000-0000000000aa",
    assignmentId: "00000000-0000-4000-8000-0000000000bb",
    attendanceRecordId: "00000000-0000-4000-8000-0000000000cc",
    billableMinutes: 360,
    employerHourlyRateMinor: 5000,
    emergencySurchargePerHourMinor: 675,
    distanceSurchargeMinor: 4000,
    urgency: "urgent",
    occurredAt: "2026-10-24T12:00:00.000Z"
  });

  it("splits the employer rate into regular + urgent and bills the variable extras", () => {
    expect(input.regularLabour.amountMinor).toBe(27000); // $45 × 6
    expect(input.urgentLabour.amountMinor).toBe(3000); // $5 × 6
    expect(input.mileage.amountMinor).toBe(4000); // $40 distance (client pays full)
    expect(input.marketplaceFees.amountMinor).toBe(4050); // $6.75 × 6 emergency (platform keeps)
  });

  it("the invoice engine totals it with GST+QST", () => {
    const snapshot = calculateInvoiceSnapshot(input);
    expect(snapshot.subtotal.amountMinor).toBe(38050); // $380.50
    expect(snapshot.taxes.amountMinor).toBe(5698); // $56.98 (14.975%)
    expect(snapshot.total.amountMinor).toBe(43748); // $437.48
  });

  it("a normal (non-urgent) job has no urgent/emergency and bills just labour + tax", () => {
    const normal = buildInvoiceCalculationInput({
      timesheetId: "00000000-0000-4000-8000-000000000002",
      timesheetVersion: 1,
      organizationId: "00000000-0000-4000-8000-0000000000aa",
      assignmentId: "00000000-0000-4000-8000-0000000000bb",
      attendanceRecordId: "00000000-0000-4000-8000-0000000000cc",
      billableMinutes: 360,
      employerHourlyRateMinor: 3000,
      emergencySurchargePerHourMinor: 0,
      distanceSurchargeMinor: 0,
      urgency: "normal",
      occurredAt: "2026-10-24T12:00:00.000Z"
    });
    expect(normal.urgentLabour.amountMinor).toBe(0);
    expect(normal.marketplaceFees.amountMinor).toBe(0);
    const s = calculateInvoiceSnapshot(normal);
    expect(s.subtotal.amountMinor).toBe(18000); // $30 × 6
    expect(s.total.amountMinor).toBe(Math.round(18000 * 1.14975)); // $206.96
  });
});
