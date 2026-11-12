import { describe, expect, it } from "vitest";
import {
  calculateInvoiceSnapshot,
  computeRequestPricingSnapshot,
  emergencyClientSurchargeMinor,
  employerBilledHourlyMinor,
  estimateEmployerRequest,
  urgencyPremiumMinor
} from "@rwos/shared";
import { buildInvoiceCalculationInput } from "./invoiceFromTimesheet";

// The employer request form shows an estimate (before taxes, GST, QST, total). It must equal what the
// invoices for that request will add up to: one invoice per worker per shift, priced from the same
// snapshot the server stores (requestPricingSnapshot.ts) and built by buildInvoiceCalculationInput.

/** What the invoices for the request add up to, using the server's own pricing and invoice code. */
function invoicedTotals(c: { rate: number; urgency: string; hours: number; shifts: number; workers: number }) {
  const snapshot = computeRequestPricingSnapshot({
    employerHourlyRateMinor: c.rate,
    urgencyPremiumMinor: urgencyPremiumMinor(c.urgency)
  });
  const invoice = calculateInvoiceSnapshot(
    buildInvoiceCalculationInput({
      timesheetId: "00000000-0000-4000-8000-000000000001",
      timesheetVersion: 1,
      organizationId: "00000000-0000-4000-8000-0000000000aa",
      assignmentId: "00000000-0000-4000-8000-0000000000bb",
      attendanceRecordId: "00000000-0000-4000-8000-0000000000cc",
      billableMinutes: Math.round(c.hours * 60),
      employerHourlyRateMinor: snapshot.employerHourlyRateMinor,
      emergencySurchargePerHourMinor: emergencyClientSurchargeMinor({ labourClientMinor: c.rate, urgency: c.urgency }),
      distanceSurchargeMinor: 0,
      urgency: c.urgency,
      occurredAt: "2026-11-12T13:00:00.000Z"
    })
  );
  const n = c.shifts * c.workers;
  return {
    subtotal: invoice.subtotal.amountMinor * n,
    taxes: invoice.taxes.amountMinor * n,
    total: invoice.total.amountMinor * n
  };
}

const cases = [
  { name: "normal, 8 h, 1 worker", rate: 2500, urgency: "normal", hours: 8, shifts: 1, workers: 1 },
  { name: "urgent, 8 h, 2 workers (+$5/h and +15%)", rate: 2500, urgency: "urgent", hours: 8, shifts: 1, workers: 2 },
  { name: "immediate, 6 h (+$5/h and +30%)", rate: 3000, urgency: "immediate", hours: 6, shifts: 1, workers: 1 },
  { name: "odd rate where tax rounds per invoice", rate: 2333, urgency: "normal", hours: 6, shifts: 1, workers: 3 },
  { name: "odd rate, urgent, 7.5 h, 3 shifts × 2 workers", rate: 2777, urgency: "urgent", hours: 7.5, shifts: 3, workers: 2 },
  { name: "short shift is billed 6 h", rate: 2000, urgency: "normal", hours: 4, shifts: 1, workers: 1 },
  { name: "minimum wage rate, 6.25 h", rate: 1660, urgency: "normal", hours: 6.25, shifts: 2, workers: 1 }
] as const;

describe("employer request estimate = the invoices it will produce", () => {
  for (const c of cases) {
    it(c.name, () => {
      const estimate = estimateEmployerRequest({
        contractRateMinor: c.rate,
        urgency: c.urgency,
        shiftHours: c.hours,
        shiftCount: c.shifts,
        workers: c.workers
      });
      const invoiced = invoicedTotals(c);
      expect(estimate.subtotalMinor).toBe(invoiced.subtotal);
      expect(estimate.gstMinor + estimate.qstMinor).toBe(invoiced.taxes);
      expect(estimate.totalMinor).toBe(invoiced.total);
    });
  }

  it("matches the worked example from the audit (urgent, $25/h, 8 h, 2 workers)", () => {
    const estimate = estimateEmployerRequest({ contractRateMinor: 2500, urgency: "urgent", shiftHours: 8, shiftCount: 1, workers: 2 });
    expect(employerBilledHourlyMinor(2500, "urgent")).toBe(3375); // $25 + $5 + 15% of $25
    expect(estimate.subtotalMinor).toBe(54000); // $540.00 before taxes
    expect(estimate.totalMinor).toBe(62086); // $620.86
  });

  it("charges the plain contract rate when the request is not urgent", () => {
    expect(employerBilledHourlyMinor(2500, "normal")).toBe(2500);
    expect(employerBilledHourlyMinor(3000, "immediate")).toBe(3000 + 500 + 900);
  });
});
