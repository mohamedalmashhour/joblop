import type { PrismaClient } from "@rwos/database";
import { describe, expect, it } from "vitest";
import { createPrismaPayrollRateResolver } from "./payrollRepository";

function fakePrisma(parts: {
  assignment: unknown;
  snapshot: unknown;
  contract: unknown;
}): PrismaClient {
  return {
    assignment: { async findUnique() { return parts.assignment; } },
    requestPricingSnapshot: { async findUnique() { return parts.snapshot; } },
    employerContract: { async findUnique() { return parts.contract; } }
  } as unknown as PrismaClient;
}

const input = {
  organizationId: "org1",
  workGroupId: "wg1",
  roleDefinitionId: "role1",
  assignmentId: "asg1",
  instant: new Date("2026-08-12T12:00:00.000Z")
};

describe("payroll rate resolver pays the worker rate W from the snapshot (slice 4D)", () => {
  it("returns W (not E) with the snapshot's governed contract provenance", async () => {
    const resolver = createPrismaPayrollRateResolver(
      fakePrisma({
        assignment: { jobRequestId: "jr1" },
        snapshot: {
          workerHourlyRateMinor: 2250, // W (E was 3000 at 25%)
          currency: "CAD",
          contractId: "c1",
          contractVersion: "v1"
        },
        contract: { effectiveFrom: new Date("2026-01-01T00:00:00.000Z") }
      })
    );
    const rate = await resolver.resolveAt(input);
    expect(rate).not.toBeNull();
    expect(rate!.hourlyRate.amountMinor).toBe(2250);
    expect(rate!.hourlyRate.currency).toBe("CAD");
    expect(rate!.contractId).toBe("c1");
    expect(rate!.contractVersion).toBe("v1");
    expect(rate!.compensationType).toBe("hourly");
  });

  it("resolves null when the assignment is missing", async () => {
    const resolver = createPrismaPayrollRateResolver(
      fakePrisma({ assignment: null, snapshot: null, contract: null })
    );
    expect(await resolver.resolveAt(input)).toBeNull();
  });

  it("resolves null when the request has no pricing snapshot (governed missing_rate)", async () => {
    const resolver = createPrismaPayrollRateResolver(
      fakePrisma({ assignment: { jobRequestId: "jr1" }, snapshot: null, contract: null })
    );
    expect(await resolver.resolveAt(input)).toBeNull();
  });

  it("resolves null when the snapshot's contract has no effective date", async () => {
    const resolver = createPrismaPayrollRateResolver(
      fakePrisma({
        assignment: { jobRequestId: "jr1" },
        snapshot: { workerHourlyRateMinor: 2250, currency: "CAD", contractId: "c1", contractVersion: "v1" },
        contract: { effectiveFrom: null }
      })
    );
    expect(await resolver.resolveAt(input)).toBeNull();
  });
});
