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
      "Pending Generation",
      "Draft",
      "Issued",
      "Due",
      "Partially Paid",
      "Paid",
      "Failed",
      "Overdue",
      "Disputed",
      "Voided"
    ]);
  });

  it("keeps invoice review separate from payment and settlement", () => {
    expect(invoiceBoundaries).toContain("Invoice != Payment");
    expect(invoiceBoundaries).toContain("Issued != Paid");
    expect(invoiceBoundaries).toContain("Payment Authorized != Settled");
    expect(invoiceDataTruth).toContain("No financial settlement");
  });

  it("shows line items without creating accounting or tax engines", () => {
    expect(chargeBreakdownRows.map(([label]) => label)).toContain("Platform fee");
    expect(chargeBreakdownRows.map(([label]) => label)).toContain("Taxes");
    expect(invoiceDataTruth).toContain("No accounting ledger");
    expect(invoiceDataTruth).toContain("No tax engine");
  });

  it("marks payable invoice states without posting accounting", () => {
    expect(invoiceRows[0].boundary).toBe("Draft != Issued");
    const summary = getInvoiceStateSummary("Due");
    expect(summary.canPay).toBe(true);
    expect(summary.isAccountingPosted).toBe(false);
  });
});
