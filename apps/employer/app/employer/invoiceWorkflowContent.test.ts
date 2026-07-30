import { describe, expect, it } from "vitest";
import {
  chargeBreakdownRows,
  getInvoiceStateSummary,
  invoiceBoundaries,
  invoiceDataTruth,
  invoiceRows,
  invoiceStates,
  invoiceWorkflow
} from "./invoiceWorkflowContent";

describe("Employer invoice review workflow content", () => {
  it("connects approved timesheet to payment handoff", () => {
    expect(invoiceWorkflow.map((step) => step.route)).toEqual([
      "/employer/invoices",
      "/employer/invoices/detail",
      "/employer/invoices/breakdown",
      "/employer/payments"
    ]);
  });

  it("includes required invoice states", () => {
    expect(invoiceStates).toEqual([
      "Draft",
      "Approved",
      "Issued",
      "Sent",
      "Viewed",
      "Partially Paid",
      "Paid",
      "Overdue",
      "Disputed",
      "Voided",
      "Refunded"
    ]);
  });

  it("keeps invoice review separate from payment and settlement", () => {
    expect(invoiceBoundaries).toContain("Invoice != Payment");
    expect(invoiceBoundaries).toContain("Issued != Paid");
    expect(invoiceBoundaries).toContain("Payment Authorized != Settled");
    expect(invoiceDataTruth).toContain("No financial settlement");
  });

  it("shows line items without creating an accounting ledger or approved production tax policy", () => {
    expect(chargeBreakdownRows.map(([label]) => label)).toContain("Platform fee");
    expect(chargeBreakdownRows.map(([label]) => label)).toContain("Taxes");
    expect(invoiceDataTruth).toContain("No accounting ledger");
    expect(invoiceDataTruth).toContain("Versioned synthetic tax policy only");
  });

  it("marks payable invoice states without posting accounting", () => {
    expect(invoiceRows[0].boundary).toBe("Draft != Issued");
    const summary = getInvoiceStateSummary("Sent");
    expect(summary.canPay).toBe(true);
    expect(summary.isAccountingPosted).toBe(false);
  });
});
