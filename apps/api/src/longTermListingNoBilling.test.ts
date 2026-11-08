import type { PrismaClient } from "@rwos/database";
import { describe, expect, it, vi } from "vitest";
import { autoGenerateInvoiceForLockedTimesheet, isLongTermListingSnapshot } from "./invoiceFromTimesheet";
import type { InvoiceRepository } from "./invoiceRepository";
import { createPrismaPayrollRepository, longTermListingJobIds } from "./payrollRepository";

// Long-term jobs are a paid LISTING (employer plans flag): the employer pays the worker directly, so a
// job whose pricing snapshot says job_length "long_term" must never produce an invoice or payroll line.

const TS = "00000000-0000-4000-8000-000000000001";
const SHORT_JOB = "00000000-0000-4000-8000-0000000000a1";
const LONG_JOB = "00000000-0000-4000-8000-0000000000a2";

function invoicePrisma(jobLength: string | null) {
  return {
    timesheet: {
      findUnique: async () => ({
        id: TS,
        version: 1,
        status: "locked",
        organizationId: "org",
        assignmentId: "asg",
        attendanceRecordId: "att",
        jobRequestId: LONG_JOB,
        billableMinutes: 480,
        scheduledStartAt: new Date("2026-11-09T13:00:00.000Z")
      })
    },
    requestPricingSnapshot: {
      findUnique: async () => ({
        employerHourlyRateMinor: 0,
        emergencySurchargePerHourMinor: 0,
        distanceSurchargeMinor: 0,
        currency: "CAD",
        jobLength
      })
    },
    jobRequest: { findUnique: async () => ({ urgency: "normal" }) },
    jobBonus: { findMany: async () => [] }
  } as unknown as PrismaClient;
}

describe("long-term listing jobs are never billed", () => {
  it("recognises the listing snapshot marker", () => {
    expect(isLongTermListingSnapshot({ jobLength: "long_term" })).toBe(true);
    expect(isLongTermListingSnapshot({ jobLength: "short_term" })).toBe(false);
    expect(isLongTermListingSnapshot({ jobLength: null })).toBe(false);
    expect(isLongTermListingSnapshot(null)).toBe(false);
  });

  it("a locked timesheet on a long-term job creates no invoice", async () => {
    const repo = { createInvoice: vi.fn(), issueInvoice: vi.fn() } as unknown as InvoiceRepository;
    const result = await autoGenerateInvoiceForLockedTimesheet(invoicePrisma("long_term"), repo, TS, "admin");
    expect(result).toEqual({ ok: false, reason: "long_term_listing_not_billed" });
    for (const fn of Object.values(repo as unknown as Record<string, ReturnType<typeof vi.fn>>)) {
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it("payroll leaves out every timesheet of a long-term job", async () => {
    const timesheets = [
      { id: "t1", version: 1, status: "approved", payableMinutes: 480, billableMinutes: 480, scheduledStartAt: new Date("2026-11-09T13:00:00.000Z"), scheduledEndAt: new Date("2026-11-09T21:00:00.000Z"), assignmentId: "a1", workGroupId: "w", roleDefinitionId: "r", residenceId: "s", jobRequestId: SHORT_JOB },
      { id: "t2", version: 1, status: "locked", payableMinutes: 480, billableMinutes: 480, scheduledStartAt: new Date("2026-11-10T13:00:00.000Z"), scheduledEndAt: new Date("2026-11-10T21:00:00.000Z"), assignmentId: "a2", workGroupId: "w", roleDefinitionId: "r", residenceId: "s", jobRequestId: LONG_JOB }
    ];
    const snapshotQuery = vi.fn(async (args: { where: { jobRequestId: { in: string[] }; jobLength: string } }) =>
      args.where.jobLength === "long_term" && args.where.jobRequestId.in.includes(LONG_JOB) ? [{ jobRequestId: LONG_JOB }] : []
    );
    const prisma = {
      timesheet: { findMany: async () => timesheets },
      requestPricingSnapshot: { findMany: snapshotQuery },
      jobBonus: { findMany: async () => [] }
    } as unknown as PrismaClient;
    const lines = await createPrismaPayrollRepository(prisma).listApprovedWorkedTime({
      organizationId: "org",
      workerIdentityId: "worker",
      from: new Date("2026-11-01T00:00:00.000Z"),
      to: new Date("2026-12-01T00:00:00.000Z")
    } as never);
    expect(lines.map((l) => l.timesheetId)).toEqual(["t1"]);
  });

  it("a period with no long-term jobs keeps every line", async () => {
    const prisma = { requestPricingSnapshot: { findMany: async () => [] } } as unknown as PrismaClient;
    expect((await longTermListingJobIds(prisma, [SHORT_JOB])).size).toBe(0);
    expect((await longTermListingJobIds(prisma, [])).size).toBe(0);
  });
});
