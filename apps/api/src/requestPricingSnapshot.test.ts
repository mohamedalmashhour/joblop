import type { PrismaClient } from "@rwos/database";
import { describe, expect, it } from "vitest";
import { createPrismaRequestPricingSnapshotCapture } from "./requestPricingSnapshot";

type ContractsParam = Parameters<typeof createPrismaRequestPricingSnapshotCapture>[1];

function fakeContracts(contract: unknown): ContractsParam {
  return {
    async findContractEffectiveAt() {
      return contract;
    }
  } as unknown as ContractsParam;
}

function fakePrisma(options: {
  jobRequest: unknown;
  onUpsert?: (args: unknown) => void;
}): PrismaClient {
  return {
    jobRequest: {
      async findUnique() {
        return options.jobRequest;
      }
    },
    requestPricingSnapshot: {
      async upsert(args: unknown) {
        options.onUpsert?.(args);
        return args;
      }
    }
  } as unknown as PrismaClient;
}

const jobRequest = {
  id: "jr1",
  organizationId: "org1",
  workGroupId: "wg1",
  roleDefinitionId: "role1",
  startAt: new Date("2026-08-12T12:00:00.000Z"),
  calendarProfile: {
    transportProvision: "allowance",
    transportAmountMinor: 1000,
    mealProvision: "none",
    mealAmountMinor: null,
    lodgingProvision: "provided",
    lodgingAmountMinor: null
  }
};

const contract = {
  id: "c1",
  version: "v1",
  currency: "CAD",
  effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
  roleRates: [{ workGroupId: "wg1", roleDefinitionId: "role1", hourlyRateMinor: 3000 }]
};

describe("prisma request pricing snapshot capture (slice 4C-2)", () => {
  it("derives the worker/platform split from E, the margin, and funded allowances", async () => {
    const capture = createPrismaRequestPricingSnapshotCapture(
      fakePrisma({ jobRequest }),
      fakeContracts(contract)
    );
    const resolved = await capture.resolveAtApproval({ jobRequestId: "jr1", marginPpm: 250_000 });
    expect(resolved).toMatchObject({
      jobRequestId: "jr1",
      organizationId: "org1",
      contractId: "c1",
      contractVersion: "v1",
      currency: "CAD"
    });
    // E=3000 at 25% -> worker 2250, platform 750
    expect(resolved.snapshot.workerHourlyRateMinor).toBe(2250);
    expect(resolved.snapshot.platformHourlyMarginMinor).toBe(750);
    // transport funded 1000 -> worker 750, platform 250; lodging "provided" (no $) -> 0
    expect(resolved.snapshot.transport).toEqual({ employerMinor: 1000, workerMinor: 750, platformMarginMinor: 250 });
    expect(resolved.snapshot.lodging).toEqual({ employerMinor: 0, workerMinor: 0, platformMarginMinor: 0 });
  });

  it("persists the snapshot via upsert keyed on the job request", async () => {
    let captured: unknown = null;
    const capture = createPrismaRequestPricingSnapshotCapture(
      fakePrisma({ jobRequest, onUpsert: (args) => (captured = args) }),
      fakeContracts(contract)
    );
    const resolved = await capture.resolveAtApproval({ jobRequestId: "jr1", marginPpm: 200_000 });
    await capture.persist({ resolved, capturedByUserId: "admin-1", occurredAt: new Date("2026-10-03T12:00:00.000Z") });
    const args = captured as {
      where: { jobRequestId: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    expect(args.where).toEqual({ jobRequestId: "jr1" });
    expect(args.create).toMatchObject({
      jobRequestId: "jr1",
      workerHourlyRateMinor: 2400, // E=3000 at 20%
      employerHourlyRateMinor: 3000,
      capturedByUserId: "admin-1"
    });
    expect(args.update).toMatchObject({ workerHourlyRateMinor: 2400 });
  });

  it("refuses to resolve when there is no effective contract (blocks approval)", async () => {
    const capture = createPrismaRequestPricingSnapshotCapture(
      fakePrisma({ jobRequest }),
      fakeContracts(null)
    );
    await expect(capture.resolveAtApproval({ jobRequestId: "jr1", marginPpm: null })).rejects.toThrow(
      /NO_EFFECTIVE_CONTRACT/
    );
  });

  it("refuses when the contract has no rate for the request's role", async () => {
    const capture = createPrismaRequestPricingSnapshotCapture(
      fakePrisma({ jobRequest }),
      fakeContracts({ ...contract, roleRates: [{ workGroupId: "other", roleDefinitionId: "x", hourlyRateMinor: 1 }] })
    );
    await expect(capture.resolveAtApproval({ jobRequestId: "jr1", marginPpm: null })).rejects.toThrow(
      /NO_ROLE_RATE/
    );
  });

  it("refuses when the job request is missing", async () => {
    const capture = createPrismaRequestPricingSnapshotCapture(
      fakePrisma({ jobRequest: null }),
      fakeContracts(contract)
    );
    await expect(capture.resolveAtApproval({ jobRequestId: "missing", marginPpm: null })).rejects.toThrow(
      /JOB_REQUEST_NOT_FOUND/
    );
  });
});
