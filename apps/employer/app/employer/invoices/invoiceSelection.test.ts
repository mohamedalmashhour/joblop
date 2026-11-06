import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { findSelectedInvoice, invoiceBreakdownHref, invoiceDetailHref, readInvoiceParam } from "./invoiceSelection";

const invoices = [{ id: "first" }, { id: "second" }];

describe("invoice selection", () => {
  it("shows the invoice the employer opened, not the first one", () => {
    expect(findSelectedInvoice(invoices, "second")).toEqual({ id: "second" });
  });

  it("shows nothing rather than guessing when the invoice is missing or unknown", () => {
    expect(findSelectedInvoice(invoices, null)).toBeNull();
    expect(findSelectedInvoice(invoices, "someone-elses")).toBeNull();
  });

  it("reads one invoice reference from the address and carries it between pages", () => {
    expect(readInvoiceParam("a")).toBe("a");
    expect(readInvoiceParam(["a", "b"])).toBeNull();
    expect(readInvoiceParam(undefined)).toBeNull();
    expect(invoiceDetailHref("a b")).toBe("/employer/invoices/detail?invoice=a%20b");
    expect(invoiceBreakdownHref("a")).toBe("/employer/invoices/breakdown?invoice=a");
  });

  it("wires each list card to its own invoice, and both pages to the address", () => {
    const read = (path: string) => readFileSync(resolve(import.meta.dirname, path), "utf8");
    const panel = read("InvoiceReviewPanel.tsx");
    expect(panel).toContain("href={invoiceDetailHref(invoice.id)}");
    expect(panel).not.toContain("invoices[0]");
    for (const page of ["detail/page.tsx", "breakdown/page.tsx"]) {
      expect(read(page)).toContain("readInvoiceParam");
      expect(read(page)).toContain("invoiceId={invoiceId}");
    }
  });
});
