import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createPrismaWorkerOfferRepository } from "@rwos/auth";
import { createPrismaClient } from "@rwos/database";

const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;
const runKey = randomUUID().slice(0, 8);
const displayOrder = 30_000_000 + Number.parseInt(runKey.slice(0, 6), 16);
const adminUserId = randomUUID();
const firstWorkerUserId = randomUUID();
const secondWorkerUserId = randomUUID();
const now = new Date("2026-07-27T20:00:00.000Z");
const startAt = new Date("2026-08-12T12:00:00.000Z");
const endAt = new Date("2026-08-12T20:00:00.000Z");

suite("PostgreSQL Worker Offer capacity serialization", () => {
  const prisma = createPrismaClient(databaseUrl);

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        {
          id: adminUserId,
          publicId: `USR-PG-ADMIN-${runKey}`,
          emailNormalized: `pg-admin-${runKey}@example.test`,
          status: "active"
        },
        {
          id: firstWorkerUserId,
          publicId: `USR-PG-WORKER-1-${runKey}`,
          emailNormalized: `pg-worker-1-${runKey}@example.test`,
          status: "active"
        },
        {
          id: secondWorkerUserId,
          publicId: `USR-PG-WORKER-2-${runKey}`,
          emailNormalized: `pg-worker-2-${runKey}@example.test`,
          status: "active"
        }
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("commits exactly one offer when two clients contend for the final slot", async () => {
    const organization = await prisma.employerOrganization.create({
      data: {
        publicId: `ORG-PG-CAPACITY-${runKey}`,
        legalName: "PostgreSQL Capacity Test",
        displayName: "PostgreSQL Capacity Test",
        status: "active",
        createdByUserId: adminUserId
      }
    });
    const residence = await prisma.residence.create({
      data: {
        publicId: `RES-PG-CAPACITY-${runKey}`,
        organizationId: organization.id,
        name: "Capacity Residence",
        status: "active",
        createdByUserId: adminUserId
      }
    });
    const department = await prisma.department.create({
      data: {
        publicId: `DEP-PG-CAPACITY-${runKey}`,
        organizationId: organization.id,
        residenceId: residence.id,
        name: "Capacity Department",
        status: "active",
        createdByUserId: adminUserId
      }
    });
    const workGroup = await prisma.workGroup.create({
      data: {
        key: `pg-capacity-${runKey}`,
        displayLabel: "PostgreSQL Capacity",
        status: "active",
        displayOrder
      }
    });
    const roleDefinition = await prisma.roleDefinition.create({
      data: {
        workGroupId: workGroup.id,
        key: `pg-capacity-role-${runKey}`,
        displayLabel: "PostgreSQL Capacity Role",
        status: "active",
        displayOrder
      }
    });
    const jobRequest = await prisma.jobRequest.create({
      data: {
        jobRequestNumber: `JR-PG-CAPACITY-${runKey}`,
        organizationId: organization.id,
        residenceId: residence.id,
        departmentId: department.id,
        workGroupId: workGroup.id,
        roleDefinitionId: roleDefinition.id,
        creatorUserId: adminUserId,
        title: "PostgreSQL capacity race",
        numberOfWorkers: 1,
        urgency: "normal",
        requestType: "single_day",
        timezone: "America/Toronto",
        startAt,
        endAt,
        status: "approved_for_dispatch",
        createdByUserId: adminUserId
      }
    });
    const dispatchReview = await prisma.dispatchReview.create({
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
        requiredWorkerCount: 1,
        createdByUserId: adminUserId
      }
    });
    const workers = await Promise.all([
      prisma.workerIdentity.create({
        data: {
          userId: firstWorkerUserId,
          displayName: "Worker One"
        }
      }),
      prisma.workerIdentity.create({
        data: {
          userId: secondWorkerUserId,
          displayName: "Worker Two"
        }
      })
    ]);
    const repository = createPrismaWorkerOfferRepository(prisma);
    const common = {
      dispatchReview,
      jobRequest,
      expiresAt: new Date("2026-08-12T10:00:00.000Z"),
      workerVisibleTitle: jobRequest.title,
      workerVisibleSummary: null,
      compensationSummary: null,
      policySummary: null,
      actorUserId: adminUserId,
      capacityLimit: 1,
      now
    };
    const results = await Promise.all(
      workers.map((workerIdentity) => repository.createWorkerOffer({ ...common, workerIdentity }))
    );

    expect(results.filter(Boolean)).toHaveLength(1);
    await expect(repository.countCapacityOffersForDispatch(dispatchReview.id)).resolves.toBe(1);
  });
});
