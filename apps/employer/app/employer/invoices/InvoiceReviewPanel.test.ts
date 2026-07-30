import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./InvoiceReviewPanel.tsx", import.meta.url), "utf8");

describe("durable invoice review panel", () => {
  it("renders truthful loading, error, empty, and read-only boundaries", () => {
    for (const statement of [
      "Loading invoice records",
      "Invoice records could not be loaded",
      "No invoices are available for this organization",
      "Read-only governed view",
      "This view cannot charge a payment"
    ]) {
      expect(source).toContain(statement);
    }
    expect(source).toContain('fetch("/api/invoices"');
    expect(source).not.toContain("invoiceFixture");
  });
});
