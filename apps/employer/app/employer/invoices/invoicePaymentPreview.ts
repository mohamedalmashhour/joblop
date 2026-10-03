import { PLATFORM_INVOICE_TAX, employerTransferSurchargeMinor } from "@rwos/shared";

// Read-only preview of what the employer would pay by card vs by Interac, derived from the invoice
// summary the employer already holds. It reproduces the server's invoice math exactly (same fee
// helper from @rwos/shared, same half-up tax rounding, same platform GST/QST rates), but computes
// nothing authoritative — the real surcharge is enforced server-side when the invoice is issued with
// the chosen method. Interac shows no surcharge because the platform absorbs that fee.

export type PaymentPreviewOption = Readonly<{
  method: "card" | "interac";
  /** Pre-tax surcharge added for this method (0 for Interac). */
  surchargeMinor: number;
  /** Extra tax caused by the surcharge (0 for Interac or a tax-disabled invoice). */
  taxDeltaMinor: number;
  /** All-in amount the employer would pay with this method. */
  totalMinor: number;
}>;

export type InvoicePaymentPreview = Readonly<{
  card: PaymentPreviewOption;
  interac: PaymentPreviewOption;
}>;

type InvoiceAmounts = Readonly<{
  subtotalMinor: number;
  taxMinor: number;
  creditMinor: number;
  totalMinor: number;
}>;

/** Server-identical half-up tax: floor((subtotal * ratePpm + 500000) / 1_000_000). */
function taxOn(subtotalMinor: number, ratePartsPerMillion: number): number {
  return Math.floor((subtotalMinor * ratePartsPerMillion + 500_000) / 1_000_000);
}

export function previewInvoicePaymentOptions(invoice: InvoiceAmounts): InvoicePaymentPreview {
  const taxed = invoice.taxMinor > 0;

  const interac: PaymentPreviewOption = {
    method: "interac",
    surchargeMinor: 0,
    taxDeltaMinor: 0,
    totalMinor: invoice.totalMinor
  };

  // The fee is estimated on the amount that would otherwise be charged (the current total), matching
  // the server, which bases the fee on the pre-surcharge invoice total.
  const surchargeMinor = employerTransferSurchargeMinor({
    amountMinor: invoice.totalMinor,
    method: "card"
  });
  const newSubtotal = invoice.subtotalMinor + surchargeMinor;
  const newTax = taxed
    ? taxOn(newSubtotal, PLATFORM_INVOICE_TAX.gstRatePartsPerMillion) +
      taxOn(newSubtotal, PLATFORM_INVOICE_TAX.qstRatePartsPerMillion)
    : 0;
  const card: PaymentPreviewOption = {
    method: "card",
    surchargeMinor,
    taxDeltaMinor: newTax - invoice.taxMinor,
    totalMinor: newSubtotal + newTax - invoice.creditMinor
  };

  return { card, interac };
}
