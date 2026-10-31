// Hybrid auto-offer direct-claim contention on real PostgreSQL.
//
// Two eligible workers claim the SAME single-slot open-claim job concurrently. The first-come
// assignment arbiter must commit EXACTLY ONE assignment; the loser must get job_capacity_reached
// ("full"). This mirrors postgres-worker-offer-capacity.test.ts for the CLAIM orchestration.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createPrismaAssignmentRepository, createPrismaWorkerOfferRepository } from "@rwos/auth";
import { createPrismaClient } from "@rwos/database";
import { claimOpenJob } from "../../apps/api/src/openClaim";

const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;
const runKey = randomUUID().slice(0, 8);
const displayOrder = 31_000_000 + Number.parseInt(runKey.slice(0, 6), 16);
const adminUserId = randomUUID();
const firstWorkerUserId = randomUUID();
const secondWorkerUserId = randomUUID();
const startAt = new Date("2026-08-12T12:00:00.000Z");
const endAt = new Date("2026-08-12T20:00:00.000Z");

suite("PostgreSQL open-claim direct-claim contention", () => {
  const prisma = createPrismaClient(databaseUrl);

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        { id: adminUserId, publicId: `USR-OC-ADMIN-${runKey}`, emailNormalized: `oc-admin-${runKey}@example.test`, status: "active" },
        { id: firstWorkerUserId, publicId: `USR-OC-W1-${runKey}`, emailNormalized: `oc-w1-${runKey}@example.test`, status: "active" },
        { id: secondWorkerUserId, publicId: `USR-OC-W2-${runKey}`, emailNormalized: `oc-w2-${runKey}@example.test`, status: "active" }
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function seedOpenClaimJob(numberOfWorkers: number) {
    const organization = await prisma.employerOrganization.create({
      data: { publicId: `ORG-OC-${runKey}`, legalName: "Open Claim Test", displayName: "Open Claim Test", status: "active", createdByUserId: adminUserId }
    });
    const residence = await prisma.residence.create({
      data: { publicId: `RES-OC-${runKey}`, organizationId: organization.id, name: "Open Claim Residence", status: "active", createdByUserId: adminUserId }
    });
    const department = await prisma.department.create({
      data: { publicId: `DEP-OC-${runKey}`, organizationId: organization.id, residenceId: residence.id, name: "Open Claim Department", status: "active", createdByUserId: adminUserId }
    });
    const workGroup = await prisma.workGroup.create({
      data: { key: `oc-${runKey}`, displayLabel: "Open Claim", status: "active", displayOrder }
    });
    const roleDefinition = await prisma.roleDefinition.create({
      data: { workGroupId: workGroup.id, key: `oc-role-${runKey}`, displayLabel: "Open Claim Role", status: "active", displayOrder }
    });
    const jobRequest = await prisma.jobRequest.create({
      data: {
        jobRequestNumber: `JR-OC-${runKey}`,
        organizationId: organization.id,
        residenceId: residence.id,
        departmentId: department.id,
        workGroupId: workGroup.id,
        roleDefinitionId: roleDefinition.id,
        creatorUserId: adminUserId,
        title: "Open claim race",
        numberOfWorkers,
        openClaim: true,
        urgency: "normal",
        requestType: "single_day",
        timezone: "America/Toronto",
        startAt,
        endAt,
        status: "approved_for_dispatch",
        createdByUserId: adminUserId
      }
    });
    await prisma.requestPricingSnapshot.create({
      data: {
        jobRequestId: jobRequest.id,
        organizationId: organization.id,
        contractId: randomUUID(),
        contractVersion: "v1",
        currency: "CAD",
        marginPpm: 200_000,
        employerHourlyRateMinor: 3000,
        workerHourlyRateMinor: 2500,
        platformHourlyMarginMinor: 500,
        capturedByUserId: adminUserId
      }
    });
    await prisma.dispatchReview.create({
      data: {
        jobRequestId: jobRequest.id,
        organizationId: organization.id,
        residenceId: residence.id,
        departmentId: department.id,
        workGroupId: workGroup.id,
        roleDefinitionId: roleDefinition.id,
        state: "offer_preparation",
        priority: "normal",
        urgency: "normal",
        requiredWorkerCount: numberOfWorkers,
        preparedOfferCount: numberOfWorkers,
        createdByUserId: adminUserId
      }
    });
    await Promise.all([
      prisma.workerIdentity.create({ data: { userId: firstWorkerUserId, displayName: "Worker One" } }),
      prisma.workerIdentity.create({ data: { userId: secondWorkerUserId, displayName: "Worker Two" } })
    ]);
    return jobRequest;
  }

  it("commits exactly one assignment when two workers claim the final slot", async () => {
    const jobRequest = await seedOpenClaimJob(1);
    const deps = {
      prisma,
      assignmentRepository: createPrismaAssignmentRepository(prisma),
      workerOfferRepository: createPrismaWorkerOfferRepository(prisma)
    };

    const results = await Promise.all([
      claimOpenJob(deps, { userId: firstWorkerUserId, jobRequestId: jobRequest.id }),
      claimOpenJob(deps, { userId: secondWorkerUserId, jobRequestId: jobRequest.id })
    ]);

    const assigned = results.filter((r) => r.status === "assigned");
    const full = results.filter((r) => r.status === "full");
    expect(assigned).toHaveLength(1);
    expect(full).toHaveLength(1);

    // Authoritative: exactly one active assignment exists for the job.
    const activeAssignments = await prisma.assignment.count({
      where: { jobRequestId: jobRequest.id, status: { in: ["pending_validation", "confirmed"] } }
    });
    expect(activeAssignments).toBe(1);

    // The loser's minted offer was retired (no lingering active offer).
    const activeOffers = await prisma.workerOffer.count({
      where: { jobRequestId: jobRequest.id, status: { in: ["draft", "approved", "sent", "delivered", "viewed", "accepted"] } }
    });
    expect(activeOffers).toBe(1);
  });
});
