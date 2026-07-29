import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createPrismaAssignmentRepository } from "@rwos/auth";
import { createPrismaClient } from "@rwos/database";

const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;
const runId = randomUUID();
const runKey = runId.slice(0, 8);
const displayOrder = 10_000 + Number.parseInt(runKey.slice(0, 6), 16);
const actorUserId = randomUUID();
const workerUserIds = [randomUUID(), randomUUID()] as const;
const now = new Date("2026-07-27T20:00:00.000Z");

suite("PostgreSQL Assignment serialization", () => {
  const prisma = createPrismaClient(databaseUrl);
  let foundation: Awaited<ReturnType<typeof seedFoundation>>;

  beforeAll(async () => {
    foundation = await seedFoundation(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("repeatedly commits exactly one final-slot Assignment across independent clients", async () => {
    const clients = [createPrismaClient(databaseUrl), createPrismaClient(databaseUrl)] as const;
    const repositories = clients.map(createPrismaAssignmentRepository);
    try {
      for (let iteration = 1; iteration <= 5; iteration += 1) {
        const chain = await seedAcceptedOffers({
          prisma,
          foundation,
          key: `capacity-${iteration}`,
          workerIdentityIds: foundation.workerIdentityIds,
          numberOfWorkers: 1,
          startAt: new Date(`2026-08-${10 + iteration}T12:00:00.000Z`),
          endAt: new Date(`2026-08-${10 + iteration}T20:00:00.000Z`)
        });
        const results = await Promise.all(
          chain.offerIds.map((workerOfferId, index) =>
            repositories[index]!.createAssignmentFromAcceptedOfferAtomically({
              workerOfferId,
              expectedDispatchReviewId: chain.dispatchReviewId,
              expectedOfferVersion: 1,
              actorUserId,
              correlationId: `pg-capacity-${iteration}-${index}`,
              now
            })
          )
        );

        expect(results.filter((result) => result.ok)).toHaveLength(1);
        expect(results.filter((result) => !result.ok)).toEqual([
          expect.objectContaining({ reason: "job_capacity_reached" })
        ]);
        await expect(
          repositories[0]!.countActiveAssignmentsForJobRequest(chain.jobRequestId)
        ).resolves.toBe(1);
      }
    } finally {
      await Promise.all(clients.map((client) => client.$disconnect()));
    }
  });

  it("repeatedly prevents one worker from receiving overlapping Assignments", async () => {
    const clients = [createPrismaClient(databaseUrl), createPrismaClient(databaseUrl)] as const;
    const repositories = clients.map(createPrismaAssignmentRepository);
    const workerIdentityId = foundation.workerIdentityIds[0];

    try {
      for (let iteration = 1; iteration <= 5; iteration += 1) {
        const startAt = new Date(`2026-09-${10 + iteration}T12:00:00.000Z`);
        const endAt = new Date(`2026-09-${10 + iteration}T20:00:00.000Z`);
        const first = await seedAcceptedOffers({
          prisma,
          foundation,
          key: `overlap-a-${iteration}`,
          workerIdentityIds: [workerIdentityId],
          numberOfWorkers: 1,
          startAt,
          endAt
        });
        const second = await seedAcceptedOffers({
          prisma,
          foundation,
          key: `overlap-b-${iteration}`,
          workerIdentityIds: [workerIdentityId],
          numberOfWorkers: 1,
          startAt: new Date(startAt.getTime() + 60 * 60 * 1000),
          endAt: new Date(endAt.getTime() + 60 * 60 * 1000)
        });
        const results = await Promise.all([
          repositories[0]!.createAssignmentFromAcceptedOfferAtomically({
            workerOfferId: first.offerIds[0]!,
            expectedDispatchReviewId: first.dispatchReviewId,
            expectedOfferVersion: 1,
            actorUserId,
            correlationId: `pg-overlap-a-${iteration}`,
            now
          }),
          repositories[1]!.createAssignmentFromAcceptedOfferAtomically({
            workerOfferId: second.offerIds[0]!,
            expectedDispatchReviewId: second.dispatchReviewId,
            expectedOfferVersion: 1,
            actorUserId,
            correlationId: `pg-overlap-b-${iteration}`,
            now
          })
        ]);

        expect(results.filter((result) => result.ok)).toHaveLength(1);
        expect(results.filter((result) => !result.ok)).toEqual([
          expect.objectContaining({ reason: "worker_schedule_conflict" })
        ]);
        await expect(
          repositories[0]!.countConflictingAssignments({
            workerIdentityId,
            startAt,
            endAt: new Date(endAt.getTime() + 60 * 60 * 1000)
          })
        ).resolves.toBe(1);
      }
    } finally {
      await Promise.all(clients.map((client) => client.$disconnect()));
    }
  });
});

async function seedFoundation(prisma: ReturnType<typeof createPrismaClient>) {
  await prisma.user.createMany({
    data: [
      {
        id: actorUserId,
        publicId: `USR-PG-ASSIGNMENT-ADMIN-${runKey}`,
        emailNormalized: `pg-assignment-admin-${runKey}@example.test`,
        status: "active"
      },
      ...workerUserIds.map((id, index) => ({
        id,
        publicId: `USR-PG-ASSIGNMENT-WORKER-${index + 1}-${runKey}`,
        emailNormalized: `pg-assignment-worker-${index + 1}-${runKey}@example.test`,
        status: "active" as const
      }))
    ]
  });
  const organization = await prisma.employerOrganization.create({
    data: {
      publicId: `ORG-PG-ASSIGNMENT-${runKey}`,
      legalName: "PostgreSQL Assignment Test",
      displayName: "PostgreSQL Assignment Test",
      status: "active",
      createdByUserId: actorUserId
    }
  });
  const residence = await prisma.residence.create({
    data: {
      publicId: `RES-PG-ASSIGNMENT-${runKey}`,
      organizationId: organization.id,
      name: "Assignment Residence",
      status: "active",
      createdByUserId: actorUserId
    }
  });
  const department = await prisma.department.create({
    data: {
      publicId: `DEP-PG-ASSIGNMENT-${runKey}`,
      organizationId: organization.id,
      residenceId: residence.id,
      name: "Assignment Department",
      status: "active",
      createdByUserId: actorUserId
    }
  });
  const workGroup = await prisma.workGroup.create({
    data: {
      key: `pg-assignment-${runKey}`,
      displayLabel: "PostgreSQL Assignment",
      status: "active",
      displayOrder
    }
  });
  const roleDefinition = await prisma.roleDefinition.create({
    data: {
      workGroupId: workGroup.id,
      key: `pg-assignment-role-${runKey}`,
      displayLabel: "PostgreSQL Assignment Role",
      status: "active",
      displayOrder
    }
  });
  const workers = await Promise.all(
    workerUserIds.map((userId, index) =>
      prisma.workerIdentity.create({
        data: { userId, displayName: `Assignment Worker ${index + 1}` }
      })
    )
  );
  return {
    organizationId: organization.id,
    residenceId: residence.id,
    departmentId: department.id,
    workGroupId: workGroup.id,
    roleDefinitionId: roleDefinition.id,
    workerIdentityIds: workers.map((worker) => worker.id)
  };
}

async function seedAcceptedOffers(input: {
  prisma: ReturnType<typeof createPrismaClient>;
  foundation: Awaited<ReturnType<typeof seedFoundation>>;
  key: string;
  workerIdentityIds: readonly string[];
  numberOfWorkers: number;
  startAt: Date;
  endAt: Date;
}) {
  const jobRequest = await input.prisma.jobRequest.create({
    data: {
      jobRequestNumber: `JR-PG-${runKey}-${input.key.toUpperCase()}`,
      organizationId: input.foundation.organizationId,
      residenceId: input.foundation.residenceId,
      departmentId: input.foundation.departmentId,
      workGroupId: input.foundation.workGroupId,
      roleDefinitionId: input.foundation.roleDefinitionId,
      creatorUserId: actorUserId,
      title: `PostgreSQL ${input.key}`,
      numberOfWorkers: input.numberOfWorkers,
      urgency: "normal",
      requestType: "single_day",
      timezone: "America/Toronto",
      startAt: input.startAt,
      endAt: input.endAt,
      status: "approved_for_dispatch",
      createdByUserId: actorUserId
    }
  });
  const dispatch = await input.prisma.dispatchReview.create({
    data: {
      jobRequestId: jobRequest.id,
      organizationId: input.foundation.organizationId,
      residenceId: input.foundation.residenceId,
      departmentId: input.foundation.departmentId,
      workGroupId: input.foundation.workGroupId,
      roleDefinitionId: input.foundation.roleDefinitionId,
      state: "offer_preparation",
      priority: "normal",
      urgency: "normal",
      requiredWorkerCount: input.numberOfWorkers,
      createdByUserId: actorUserId
    }
  });
  const offerIds: string[] = [];
  for (const workerIdentityId of input.workerIdentityIds) {
    const offer = await input.prisma.workerOffer.create({
      data: {
        dispatchReviewId: dispatch.id,
        jobRequestId: jobRequest.id,
        organizationId: input.foundation.organizationId,
        residenceId: input.foundation.residenceId,
        departmentId: input.foundation.departmentId,
        workerIdentityId,
        status: "accepted",
        expiresAt: new Date(input.startAt.getTime() - 60 * 60 * 1000),
        approvedAt: now,
        sentAt: now,
        respondedAt: now,
        createdByUserId: actorUserId
      }
    });
    const terms = await input.prisma.workerOfferTermsVersion.create({
      data: {
        workerOfferId: offer.id,
        versionNumber: 1,
        workerVisibleTitle: jobRequest.title,
        timezone: "America/Toronto",
        startAt: input.startAt,
        endAt: input.endAt,
        workGroupId: input.foundation.workGroupId,
        roleDefinitionId: input.foundation.roleDefinitionId,
        createdByUserId: actorUserId
      }
    });
    await input.prisma.workerOffer.update({
      where: { id: offer.id },
      data: { currentTermsVersionId: terms.id }
    });
    await input.prisma.workerOfferResponse.create({
      data: {
        workerOfferId: offer.id,
        workerIdentityId,
        termsVersionId: terms.id,
        responseType: "accepted"
      }
    });
    offerIds.push(offer.id);
  }
  return { jobRequestId: jobRequest.id, dispatchReviewId: dispatch.id, offerIds };
}
