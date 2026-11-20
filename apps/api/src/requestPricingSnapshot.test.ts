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

  describe("employer fixed plans + job length (EMPLOYER_PLANS_ENABLED)", () => {
    const urgentJob = { ...jobRequest, urgency: "urgent" };
    const lookup = (plan: string) => async () => plan as never;
    const capture = (opts: { enabled: boolean; plan?: string; job?: unknown; onUpsert?: (args: unknown) => void }) =>
      createPrismaRequestPricingSnapshotCapture(
        fakePrisma({ jobRequest: opts.job ?? jobRequest, ...(opts.onUpsert ? { onUpsert: opts.onUpsert } : {}) }),
        fakeContracts(contract),
        {
          plansEnabled: () => opts.enabled,
          planLookup: opts.plan
            ? lookup(opts.plan)
            : async () => {
                throw new Error("plan lookup must not run");
              }
        }
      );

    it("flag off: ignores plans and job length entirely (today's maths, no new fields)", async () => {
      let captured: unknown = null;
      const c = capture({ enabled: false, job: { ...urgentJob, jobLength: "long_term" }, onUpsert: (a) => (captured = a) });
      const resolved = await c.resolveAtApproval({ jobRequestId: "jr1", marginPpm: null });
      expect(resolved.employerPlan).toBeUndefined();
      // E=3000 + $5 urgent premium both sides; margin 20%
      expect(resolved.snapshot.employerHourlyRateMinor).toBe(3500);
      expect(resolved.snapshot.workerHourlyRateMinor).toBe(2900);
      expect(resolved.variable?.emergencySurchargePerHourMinor).toBeGreaterThan(0);
      await c.persist({ resolved, capturedByUserId: "admin-1", occurredAt: new Date() });
      const create = (captured as { create: Record<string, unknown> }).create;
      expect(create).not.toHaveProperty("employerPlanCode");
      expect(create).not.toHaveProperty("jobLength");
    });

    it("flag on, short-term job on Shift Pro: 5% off for the employer, worker pay unchanged, urgent fee halved", async () => {
      const base = await capture({ enabled: false, job: urgentJob }).resolveAtApproval({ jobRequestId: "jr1", marginPpm: null });
      let captured: unknown = null;
      const c = capture({ enabled: true, plan: "shift_pro", job: urgentJob, onUpsert: (a) => (captured = a) });
      const resolved = await c.resolveAtApproval({ jobRequestId: "jr1", marginPpm: null });
      expect(resolved.snapshot.workerHourlyRateMinor).toBe(base.snapshot.workerHourlyRateMinor);
      expect(resolved.snapshot.employerHourlyRateMinor).toBe(base.snapshot.employerHourlyRateMinor - 150);
      expect(resolved.snapshot.platformHourlyMarginMinor).toBe(base.snapshot.platformHourlyMarginMinor - 150);
      expect(resolved.snapshot.transport).toEqual(base.snapshot.transport);
      expect(resolved.variable?.emergencySurchargePerHourMinor).toBe(
        Math.floor((base.variable?.emergencySurchargePerHourMinor ?? 0) / 2 + 0.5)
      );
      expect(resolved.employerPlan).toEqual({ jobLength: "short_term", planCode: "shift_pro", discountPpm: 50_000 });
      await c.persist({ resolved, capturedByUserId: "admin-1", occurredAt: new Date() });
      expect((captured as { create: Record<string, unknown> }).create).toMatchObject({
        employerPlanCode: "shift_pro",
        employerPlanDiscountPpm: 50_000,
        jobLength: "short_term"
      });
    });

    it("flag on, short-term job without a plan: same numbers as today, plan recorded as none", async () => {
      const base = await capture({ enabled: false, job: urgentJob }).resolveAtApproval({ jobRequestId: "jr1", marginPpm: null });
      const resolved = await capture({ enabled: true, plan: "pay_per_shift", job: urgentJob }).resolveAtApproval({ jobRequestId: "jr1", marginPpm: null });
      expect(resolved.snapshot).toEqual(base.snapshot);
      expect(resolved.variable).toEqual(base.variable);
      expect(resolved.employerPlan).toEqual({ jobLength: "short_term", planCode: null, discountPpm: 0 });
    });

    it("flag on, long-term job = paid listing: zero money, listing marker, no plan lookup", async () => {
      let captured: unknown = null;
      const c = capture({ enabled: true, job: { ...urgentJob, jobLength: "long_term" }, onUpsert: (a) => (captured = a) });
      const resolved = await c.resolveAtApproval({ jobRequestId: "jr1", marginPpm: 250_000 });
      expect(resolved.snapshot).toEqual({
        marginPpm: 0,
        employerHourlyRateMinor: 0,
        workerHourlyRateMinor: 0,
        platformHourlyMarginMinor: 0,
        transport: { employerMinor: 0, workerMinor: 0, platformMarginMinor: 0 },
        meal: { employerMinor: 0, workerMinor: 0, platformMarginMinor: 0 },
        lodging: { employerMinor: 0, workerMinor: 0, platformMarginMinor: 0 }
      });
      expect(resolved.variable).toEqual({ emergencySurchargePerHourMinor: 0, distanceSurchargeMinor: 0, distanceWorkerMinor: 0, distancePlatformMinor: 0 });
      expect(resolved.employerPlan).toEqual({ jobLength: "long_term", planCode: "listing", discountPpm: 0 });
      await c.persist({ resolved, capturedByUserId: "admin-1", occurredAt: new Date() });
      expect((captured as { create: Record<string, unknown> }).create).toMatchObject({
        jobLength: "long_term",
        employerPlanCode: "listing",
        employerHourlyRateMinor: 0,
        workerHourlyRateMinor: 0,
        platformHourlyMarginMinor: 0
      });
    });

    it("flag on, long-term job approves even without an employer contract (direct hire)", async () => {
      const c = createPrismaRequestPricingSnapshotCapture(
        fakePrisma({ jobRequest: { ...jobRequest, jobLength: "long_term" } }),
        fakeContracts(null),
        { plansEnabled: () => true }
      );
      const resolved = await c.resolveAtApproval({ jobRequestId: "jr1", marginPpm: null });
      expect(resolved.contractVersion).toBe("listing");
      expect(resolved.snapshot.workerHourlyRateMinor).toBe(0);
    });

    it("flag off: a long-term job is priced exactly like today (no listing)", async () => {
      const base = await capture({ enabled: false, job: jobRequest }).resolveAtApproval({ jobRequestId: "jr1", marginPpm: null });
      const resolved = await capture({ enabled: false, job: { ...jobRequest, jobLength: "long_term" } }).resolveAtApproval({ jobRequestId: "jr1", marginPpm: null });
      expect(resolved).toEqual(base);
    });
  });
});
