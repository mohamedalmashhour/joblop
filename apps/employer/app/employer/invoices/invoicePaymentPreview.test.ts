import { describe, expect, it } from "vitest";
import { previewInvoicePaymentOptions } from "./invoicePaymentPreview";

describe("employer invoice payment preview", () => {
  it("reproduces the server card vs Interac totals for a taxed invoice", () => {
    // $240 labour, QC GST+QST -> tax $35.94 -> total $275.94 (matches the billing simulation)
    const preview = previewInvoicePaymentOptions({
      subtotalMinor: 24_000,
      taxMinor: 3_594,
      creditMinor: 0,
      totalMinor: 27_594
    });
    expect(preview.interac).toEqual({
      method: "interac",
      surchargeMinor: 0,
      taxDeltaMinor: 0,
      totalMinor: 27_594
    });
    // fee on $275.94 = $8.30 -> employer half $4.15 surcharge, +$0.62 tax -> card total $280.71
    expect(preview.card).toEqual({
      method: "card",
      surchargeMinor: 415,
      taxDeltaMinor: 62,
      totalMinor: 28_071
    });
  });

  it("adds no tax delta when the invoice is not taxed", () => {
    const preview = previewInvoicePaymentOptions({
      subtotalMinor: 10_000,
      taxMinor: 0,
      creditMinor: 0,
      totalMinor: 10_000
    });
    expect(preview.card.surchargeMinor).toBe(160); // fee $3.20 -> half $1.60
    expect(preview.card.taxDeltaMinor).toBe(0);
    expect(preview.card.totalMinor).toBe(10_160);
    expect(preview.interac.totalMinor).toBe(10_000);
  });
});
