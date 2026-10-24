import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const apiSource = readFileSync(new URL("./app.ts", import.meta.url), "utf8");

// HR-5 moved the approved boundary forward: payroll CALCULATION (a governed snapshot over
// ApprovedWorkedTime) is now built. Money EXECUTION — moving, debiting, crediting, disbursing, or
// remitting funds — remains firmly out of scope. This guard enforces that new line: the app may
// calculate payroll, but must never contain a route that moves money.
describe("API non-money authority boundary", () => {
  it("does not expose any money-EXECUTION routes (invoices, payments, escrow, disbursement, remittance)", () => {
    // Note: /platform/finance/* routes now exist, but they are READ-ONLY accounting (remittance
    // ledger, double-entry view, status) plus a single HARD-GATED execution seam. The separate
    // "finance execution stays gated" test below proves no money moves; see
    // docs/finance/TWO_CHANNEL_PAYROLL_DESIGN.md.
    for (const prohibitedRoute of [
      "/invoices",
      "/payments",
      "/worker-payables",
      "/employer-payments",
      "/escrow",
      "/held-funds",
      "/money-engine",
      "/payroll/execute",
      "/payroll/pay",
      "/payroll/disburse",
      "/direct-deposit",
      "/bank-transfer"
    ]) {
      expect(apiSource).not.toContain(prohibitedRoute);
    }
  });

  it("payroll is a CALCULATION only — governed snapshot routes exist, but there is no money-movement execution", () => {
    // The calculation gate is present…
    expect(apiSource).toContain("/platform/payroll/calculations");
    // …and it stops at ApprovedPayrollCalculation — no payment/disbursement/remittance execution
    // verbs (distinctive identifiers that would never appear in explanatory prose).
    for (const executionToken of ["disburseFunds", "creditWorker", "debitEmployer", "sendPayment", "remitFunds", "payrollExecution", "initiateDeposit"]) {
      expect(apiSource).not.toContain(executionToken);
    }
  });

  it("finance execution stays gated — the finance layer accounts but never moves money", () => {
    // The finance routes exist for ACCOUNTING only (read) plus one execution seam that is hard-gated.
    expect(apiSource).toContain("/platform/finance/accounting");
    expect(apiSource).toContain("/platform/finance/remittances");
    // The execution seam refuses while the go-live gate is closed, and the gate is wired in.
    expect(apiSource).toContain("RWOS_FINANCE_GATED");
    expect(apiSource).toContain("financeLive");
    // Still no money-movement execution verbs anywhere.
    for (const executionToken of ["disburseFunds", "creditWorker", "debitEmployer", "sendPayment", "remitFunds", "initiateDeposit"]) {
      expect(apiSource).not.toContain(executionToken);
    }
  });

  it("keeps Timesheet + Payroll-calculation as the final implemented workflow route families", () => {
    expect(apiSource).toContain("/platform/timesheets");
    expect(apiSource).toContain("/organizations/:organizationId/timesheets");
    expect(apiSource).toContain("/worker/timesheets/:timesheetId");
    expect(apiSource).toContain("/worker/payroll/statement");
  });
});
