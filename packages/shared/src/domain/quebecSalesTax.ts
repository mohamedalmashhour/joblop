// Québec sales tax on Joblop's OWN fees (employer plans, long-term job listings). Reuses the platform
// invoice tax configuration (GST/TPS 5% = 50_000 ppm, QST/TVQ 9.975% = 99_750 ppm, both on the
// subtotal) so the rates live in one place. Each tax is rounded half-up to the cent on its own,
// exactly like the invoice engine. Amounts are integer minor units (cents).
import { PLATFORM_INVOICE_TAX } from "./platformInvoiceIssuer";

export type QuebecSalesTax = Readonly<{
  subtotalMinor: number;
  gstMinor: number;
  qstMinor: number;
  totalMinor: number;
}>;

export const QUEBEC_GST_PPM = PLATFORM_INVOICE_TAX.gstRatePartsPerMillion;
export const QUEBEC_QST_PPM = PLATFORM_INVOICE_TAX.qstRatePartsPerMillion;

function taxMinor(subtotalMinor: number, ratePpm: number): number {
  return Math.floor((subtotalMinor * ratePpm + 500_000) / 1_000_000);
}

/** GST + QST on a subtotal (each rounded to the cent). Junk / negative input → all zero. */
export function quebecSalesTax(subtotalMinor: number): QuebecSalesTax {
  const subtotal = Number.isFinite(subtotalMinor) && subtotalMinor > 0 ? Math.trunc(subtotalMinor) : 0;
  const gstMinor = taxMinor(subtotal, QUEBEC_GST_PPM);
  const qstMinor = taxMinor(subtotal, QUEBEC_QST_PPM);
  return { subtotalMinor: subtotal, gstMinor, qstMinor, totalMinor: subtotal + gstMinor + qstMinor };
}
