// The employer's price estimate for a staffing request, built from the SAME rules the invoice uses, so
// the "before taxes / GST / QST / total" box on the request form matches what will be billed.
//
// Per worker and per shift the platform issues one invoice (apps/api invoiceFromTimesheet):
//   regular labour = contract rate × billable hours
//   urgent labour  = urgent premium ($5/h for urgent or immediate) × billable hours
//   urgency fee    = 15% (urgent) or 30% (immediate) of the contract rate, per hour × billable hours
//   billable hours = at least 6 per shift (billableHours)
// Each line is rounded to the cent, then GST and QST are computed on that invoice's subtotal. The
// estimate repeats this per worker-shift and adds the results, so the tax cents match the invoices.
//
// Not included (shown as an estimate): an employer plan discount, allowances, the distance charge
// and job bonuses, which depend on facts the form does not know yet.
import { billableHours, urgencyPremiumMinor } from "./platformPricing";
import { quebecSalesTax } from "./quebecSalesTax";
import { emergencyClientSurchargeMinor } from "./variableClientPricing";

export type EmployerRequestEstimate = Readonly<{
  /** What one hour costs the employer (contract rate + urgent premium + urgency fee). */
  hourlyMinor: number;
  /** Hours billed for one shift (at least 6). */
  billableHoursPerShift: number;
  /** Invoices the request will produce (workers × shifts). */
  invoiceCount: number;
  subtotalMinor: number;
  gstMinor: number;
  qstMinor: number;
  totalMinor: number;
}>;

/** What one billed hour costs the employer for this contract rate and urgency. */
export function employerBilledHourlyMinor(contractRateMinor: number, urgency: string | null | undefined): number {
  const base = Number.isFinite(contractRateMinor) && contractRateMinor > 0 ? Math.trunc(contractRateMinor) : 0;
  return base + urgencyPremiumMinor(urgency) + emergencyClientSurchargeMinor({ labourClientMinor: base, urgency });
}

export function estimateEmployerRequest(input: {
  contractRateMinor: number;
  urgency: string | null | undefined;
  /** Scheduled hours of ONE shift. */
  shiftHours: number;
  shiftCount: number;
  workers: number;
}): EmployerRequestEstimate {
  const base = Number.isFinite(input.contractRateMinor) && input.contractRateMinor > 0 ? Math.trunc(input.contractRateMinor) : 0;
  const hours = billableHours(input.shiftHours);
  const premium = urgencyPremiumMinor(input.urgency);
  const fee = emergencyClientSurchargeMinor({ labourClientMinor: base, urgency: input.urgency });
  // One invoice: each line rounded to the cent like the invoice builder (Math.round on the line).
  const shiftSubtotal = Math.round(base * hours) + Math.round(premium * hours) + Math.round(fee * hours);
  const tax = quebecSalesTax(shiftSubtotal);
  const shifts = Number.isInteger(input.shiftCount) && input.shiftCount > 0 ? input.shiftCount : 1;
  const workers = Number.isInteger(input.workers) && input.workers > 0 ? input.workers : 1;
  const invoiceCount = shifts * workers;
  return {
    hourlyMinor: base + premium + fee,
    billableHoursPerShift: hours,
    invoiceCount,
    subtotalMinor: tax.subtotalMinor * invoiceCount,
    gstMinor: tax.gstMinor * invoiceCount,
    qstMinor: tax.qstMinor * invoiceCount,
    totalMinor: tax.totalMinor * invoiceCount
  };
}
