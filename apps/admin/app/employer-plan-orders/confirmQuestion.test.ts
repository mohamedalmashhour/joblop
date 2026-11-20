import { describe, expect, it } from "vitest";
import { confirmPaymentQuestion, statusLabel } from "./EmployerPlanOrdersPanel";
import { planOrdersText } from "./text";

describe("employer plan order confirm dialog", () => {
  it("asks staff to confirm the Interac amount and company", () => {
    expect(
      confirmPaymentQuestion({ organizationName: "Acme Care", method: "e_transfer", totalMinor: 5634, currency: "CAD" })
    ).toBe("Confirm you received $56.34 by Interac for Acme Care?");
  });
  it("falls back to the subtotal when no total is stored", () => {
    expect(
      confirmPaymentQuestion({ organizationName: "Acme Care", method: "e_transfer", priceMinor: 4900, currency: "CAD" })
    ).toContain("$49.00");
  });
  it("asks in French and Arabic too", () => {
    expect(confirmPaymentQuestion({ organizationName: "Acme", method: "e_transfer", totalMinor: 5692, currency: "CAD" }, planOrdersText.fr)).toContain("Interac");
    expect(confirmPaymentQuestion({ organizationName: "Acme", method: "e_transfer", totalMinor: 5692, currency: "CAD" }, planOrdersText.ar)).toContain("Interac");
  });
});

describe("employer plan order status", () => {
  it("shows when the employer canceled, and when staff must check a refund", () => {
    expect(statusLabel({ status: "refund_check", cancelReason: "employer_canceled" }, planOrdersText.en)).toBe("Canceled by employer — check refund");
    expect(statusLabel({ status: "canceled", cancelReason: "employer_canceled" }, planOrdersText.en)).toBe("Canceled by employer");
    expect(statusLabel({ status: "canceled", cancelReason: "staff_rejected" }, planOrdersText.en)).toBe("Rejected by staff");
    expect(statusLabel({ status: "payment_claimed" }, planOrdersText.fr)).toBe("L’employeur dit l’avoir envoyé");
  });

  it("has every label in English, French and Arabic", () => {
    const keys = Object.keys(planOrdersText.en) as (keyof typeof planOrdersText.en)[];
    for (const locale of ["fr", "ar"] as const) {
      for (const key of keys) expect(planOrdersText[locale][key], `${locale}.${key}`).toBeTruthy();
      expect(Object.keys(planOrdersText[locale].status).sort()).toEqual(Object.keys(planOrdersText.en.status).sort());
      expect(Object.keys(planOrdersText[locale].errors).sort()).toEqual(Object.keys(planOrdersText.en.errors).sort());
    }
  });
});
