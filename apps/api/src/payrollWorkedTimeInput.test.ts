import type { PrismaClient } from "@rwos/database";
import { computePayrollTotals, createSyntheticPayrollRuleProvider } from "@rwos/auth";
import { createContractMoney } from "@rwos/shared";
import { describe, expect, it } from "vitest";
import { createPrismaPayrollRepository } from "./payrollRepository";

// Payroll input for the first job: the worker checked in at 07:30 for an 08:00–14:00 shift. The
// timesheet engine counts from the scheduled start, so the approved timesheet carries 360 payable
// minutes; payroll must pay exactly those (never re-deriving the 6.5 h on site).
const timesheetRow = {
  id: "t-1",
  version: 4,
  status: "approved",
  payableMinutes: 360,
  billableMinutes: 360,
  scheduledStartAt: new Date("2026-11-12T13:00:00.000Z"),
  scheduledEndAt: new Date("2026-11-12T19:00:00.000Z"),
  assignmentId: "a-1",
  workGroupId: "wg-1",
  roleDefinitionId: "farm-worker",
  residenceId: "laval",
  jobRequestId: "jr-1"
};

const prisma = {
  timesheet: { findMany: async () => [timesheetRow] },
  requestPricingSnapshot: { findMany: async () => [] },
  jobBonus: { findMany: async () => [] }
} as unknown as PrismaClient;

describe("payroll worked-time input (hours counted from the scheduled start)", () => {
  it("reads 360 payable minutes from the approved timesheet and pays 6.0 h at the worker rate", async () => {
    const lines = await createPrismaPayrollRepository(prisma).listApprovedWorkedTime({
      organizationId: "org-1",
      workerIdentityId: "w-1",
      from: new Date("2026-11-09T05:00:00.000Z"),
      to: new Date("2026-11-16T05:00:00.000Z")
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]?.payableMinutes).toBe(360);

    const result = createSyntheticPayrollRuleProvider().evaluate({
      jurisdiction: { country: "CA", region: "QC" },
      currency: "CAD",
      segments: [
        {
          contractId: "c-1",
          contractVersion: "v1",
          hourlyRate: createContractMoney({ amountMinor: 1800, currency: "CAD" }),
          payableMinutes: lines[0]!.payableMinutes
        }
      ],
      workerClassification: "contractor"
    });
    expect(result.earnings.find((e) => e.classification === "regular")?.amount.amountMinor).toBe(10800); // $18 × 6
    expect(computePayrollTotals(result, "CAD").gross.amountMinor).toBe(10800 + 648); // + synthetic 6% vacation pay
  });
});
