import type { createPrismaClient } from "@rwos/database";

type PrismaClient = ReturnType<typeof createPrismaClient>;

export type FixtureContract = Readonly<{ id: string; version: string; effectiveFrom: Date; rateMinor: number }>;

// Payroll pays the worker rate frozen on each job at approval, so a job needs a pricing snapshot, tied
// to a real contract, before it can be calculated. This gives a seeded job that snapshot. The margin
// is arbitrary: payroll reads only the worker rate and the contract reference.
export async function priceJob(
  prisma: PrismaClient,
  input: { jobRequestId: string; organizationId: string; contract: FixtureContract; capturedByUserId: string }
): Promise<void> {
  await prisma.requestPricingSnapshot.create({
    data: {
      jobRequestId: input.jobRequestId,
      organizationId: input.organizationId,
      contractId: input.contract.id,
      contractVersion: input.contract.version,
      currency: "CAD",
      marginPpm: 200_000,
      employerHourlyRateMinor: input.contract.rateMinor + 500,
      workerHourlyRateMinor: input.contract.rateMinor,
      platformHourlyMarginMinor: 500,
      capturedByUserId: input.capturedByUserId
    }
  });
}

// A job is priced by the contract in force when it starts. Null when none is, which leaves the job
// unpriced so it fails with the governed missing_rate reason.
export function contractInForce(contracts: readonly FixtureContract[], at: Date): FixtureContract | null {
  return (
    contracts
      .filter((contract) => contract.effectiveFrom.getTime() <= at.getTime())
      .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())[0] ?? null
  );
}

// Snapshots do not change in production. Tests that need a correction to produce a different result
// overwrite them here, standing in for a change to the governed inputs.
export async function repriceOrganizationJobs(prisma: PrismaClient, organizationId: string, contract: FixtureContract): Promise<void> {
  await prisma.requestPricingSnapshot.updateMany({
    where: { organizationId },
    data: { contractId: contract.id, contractVersion: contract.version, workerHourlyRateMinor: contract.rateMinor }
  });
}
