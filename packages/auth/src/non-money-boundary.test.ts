import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const authSource = readFileSync(new URL("./index.ts", import.meta.url), "utf8");

describe("non-money authority boundary", () => {
  it("does not define Payroll, Finance, Invoice, Payment, escrow, or money-engine permissions", () => {
    for (const prohibitedPermissionPrefix of [
      "payroll",
      "finance",
      "invoice",
      "payment",
      "worker_payable",
      "employer_payment",
      "escrow",
      "held_funds",
      "money_engine"
    ]) {
      expect(authSource).not.toMatch(new RegExp(`"${prohibitedPermissionPrefix}\\.`));
    }
  });

  it("keeps Timesheet as the last implemented authoritative service boundary", () => {
    for (const implementedService of [
      "createJobRequestService",
      "createDispatchService",
      "createWorkerOfferService",
      "createAssignmentService",
      "createAttendanceService",
      "createTimesheetService"
    ]) {
      expect(authSource).toContain(`export function ${implementedService}`);
    }

    for (const prohibitedService of [
      "createPayrollService",
      "createFinanceService",
      "createInvoiceService",
      "createPaymentService",
      "createWorkerPayableService",
      "createEmployerPaymentService",
      "createEscrowService",
      "createMoneyEngineService"
    ]) {
      expect(authSource).not.toContain(`export function ${prohibitedService}`);
    }
  });
});
