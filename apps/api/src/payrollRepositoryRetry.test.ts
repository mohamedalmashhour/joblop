import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@rwos/database";
import type { CreatePayrollCalculationInput } from "@rwos/auth";
import { CALCULATION_WRITE_ATTEMPTS, createPrismaPayrollRepository } from "./payrollRepository";

// No database: a fake Prisma client that fails the SERIALIZABLE revision write the way PostgreSQL
// does under bulk concurrency (P2034 = 40001), to prove the write is re-run instead of the worker
// being silently reported as a lost race.

const input = {
  id: "11111111-1111-4111-8111-111111111111", payrollPeriodId: "p", organizationId: "o", workerIdentityId: "w", revision: 1,
  familyRootId: "11111111-1111-4111-8111-111111111111", previousCalculationId: null, previousFingerprint: null,
  correctionType: null, correctionReason: null, correlationKey: null, adjustsCalculationId: null, adjustmentDelta: null,
  jurisdictionCountry: "CA", jurisdictionRegion: "QC", ruleProviderKey: "k", ruleProviderVersion: "v", calculationPolicyVersion: "pv",
  workerClassification: "employee", currency: "CAD", grossPayMinor: 100, totalDeductionsMinor: 10, netPayMinor: 90, totalEmployerCostMinor: 5,
  calculationFingerprint: "fp", calculatedAt: new Date("2026-08-15T00:00:00Z"), createdByUserId: "u",
  workedTimeRefs: [], earnings: [], deductions: [], employerCosts: [], supersedePriorId: null, expectedPriorVersion: null
} as unknown as CreatePayrollCalculationInput;

const row = {
  ...input, status: "calculated", synthetic: true, supersededById: null, version: 1,
  adjustmentNetDirection: null, adjustmentNetDeltaMinor: null
};

const serializationFailure = () => Object.assign(new Error("Transaction failed due to a write conflict or a deadlock. Please retry your transaction"), { code: "P2034" });
const uniqueViolation = () => Object.assign(new Error("Unique constraint failed"), { code: "P2002" });

function fakePrisma(opts: { failures: Array<() => Error>; existingById?: boolean }) {
  let transactions = 0;
  let commits = 0;
  const client = {
    async $transaction(fn: (tx: unknown) => Promise<unknown>, options: { isolationLevel?: string }) {
      expect(options.isolationLevel).toBe("Serializable");
      transactions += 1;
      const tx = { payrollCalculation: { create: async () => row, updateMany: async () => ({ count: 1 }), update: async () => row } };
      const result = await fn(tx);
      const failure = opts.failures.shift();
      if (failure) throw failure(); // rolled back at COMMIT
      commits += 1;
      return result;
    },
    payrollCalculation: { findUnique: async () => (opts.existingById ? row : null) }
  };
  return { prisma: client as unknown as PrismaClient, stats: () => ({ transactions, commits }) };
}

describe("createCalculationAtomically retries serialization failures", () => {
  it("re-runs the whole SERIALIZABLE transaction after 40001 and returns the committed revision", async () => {
    const fake = fakePrisma({ failures: [serializationFailure, serializationFailure] });
    const created = await createPrismaPayrollRepository(fake.prisma).createCalculationAtomically(input);
    expect(created?.id).toBe(input.id);
    expect(fake.stats()).toEqual({ transactions: 3, commits: 1 });
  });

  it("reports a lost race (null) only after every bounded attempt failed", async () => {
    const fake = fakePrisma({ failures: Array.from({ length: CALCULATION_WRITE_ATTEMPTS + 2 }, () => serializationFailure) });
    const created = await createPrismaPayrollRepository(fake.prisma).createCalculationAtomically(input);
    expect(created).toBeNull();
    expect(fake.stats()).toEqual({ transactions: CALCULATION_WRITE_ATTEMPTS, commits: 0 });
  });

  it("does not retry a rival's duplicate revision", async () => {
    const fake = fakePrisma({ failures: [uniqueViolation] });
    const created = await createPrismaPayrollRepository(fake.prisma).createCalculationAtomically(input);
    expect(created).toBeNull();
    expect(fake.stats().transactions).toBe(1);
  });

  it("returns its own row when a duplicate key is on its own id (an earlier attempt committed)", async () => {
    const fake = fakePrisma({ failures: [uniqueViolation], existingById: true });
    const created = await createPrismaPayrollRepository(fake.prisma).createCalculationAtomically(input);
    expect(created?.id).toBe(input.id);
  });

  it("rethrows an unexpected error", async () => {
    const fake = fakePrisma({ failures: [() => new Error("boom")] });
    await expect(createPrismaPayrollRepository(fake.prisma).createCalculationAtomically(input)).rejects.toThrow("boom");
  });
});
