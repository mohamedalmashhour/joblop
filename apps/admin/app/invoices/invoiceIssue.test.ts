import { describe, expect, it } from "vitest";
import { invoiceIssueBody, nextInvoiceAction } from "./invoiceIssue";

describe("staff invoice actions", () => {
  it("offers only the next step in order", () => {
    expect(nextInvoiceAction("draft")).toBe("approve");
    expect(nextInvoiceAction("approved")).toBe("issue");
    for (const status of ["issued", "sent", "paid", "voided", "disputed"]) {
      expect(nextInvoiceAction(status)).toBeNull();
    }
  });

  it("issues into the current year's numbering series for that employer", () => {
    expect(invoiceIssueBody("org-1", 3, new Date("2026-11-06T12:00:00Z"))).toEqual({
      expectedVersion: 3,
      numbering: { organizationId: "org-1", scopeYear: 2026, prefix: "JL", version: "joblop-v1", effectiveFrom: "2026-01-01T00:00:00.000Z", effectiveUntil: null }
    });
  });
});
