import { describe, expect, it } from "vitest";
import { confirmPaymentQuestion } from "./EmployerPlanOrdersPanel";

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
});
