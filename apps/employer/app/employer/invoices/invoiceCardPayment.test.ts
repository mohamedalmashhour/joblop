import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { confirmCardPayment, isInvoicePayable, startCardPayment } from "./invoiceCardPayment";

const reply = (ok: boolean, body: unknown = {}) => vi.fn(async () => ({ ok, json: async () => body }));

describe("invoice card payment", () => {
  it("offers payment only on invoices the API can collect", () => {
    for (const status of ["issued", "sent", "viewed", "overdue"]) expect(isInvoicePayable(status)).toBe(true);
    for (const status of ["draft", "approved", "paid", "voided", "disputed"]) expect(isInvoicePayable(status)).toBe(false);
  });

  it("returns the hosted payment page", async () => {
    const fetcher = reply(true, { checkoutUrl: "https://checkout.stripe.com/c/pay/test" });
    await expect(startCardPayment("a/b", fetcher)).resolves.toBe("https://checkout.stripe.com/c/pay/test");
    expect(fetcher).toHaveBeenCalledWith("/api/invoices/a%2Fb/checkout", expect.objectContaining({ method: "POST" }));
  });

  it("gives no page when payment is off, fails, or the address is not secure", async () => {
    await expect(startCardPayment("a", reply(false))).resolves.toBeNull();
    await expect(startCardPayment("a", reply(true, { checkoutUrl: "http://evil.test" }))).resolves.toBeNull();
    await expect(startCardPayment("a", vi.fn(async () => { throw new Error("offline"); }))).resolves.toBeNull();
  });

  it("treats a payment as done only when the server confirms it", async () => {
    await expect(confirmCardPayment("a", reply(true))).resolves.toBe(true);
    await expect(confirmCardPayment("a", reply(false))).resolves.toBe(false);
  });

  it("never handles card details on this screen", () => {
    const panel = readFileSync(resolve(import.meta.dirname, "InvoiceReviewPanel.tsx"), "utf8");
    expect(panel).not.toMatch(/cardNumber|type="tel"|cvc/iu);
  });
});
