import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createPrismaJobRequestRepository } from "@rwos/auth";
import { createPrismaClient } from "@rwos/database";

const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

// Add Workers relies on the job-request repository's optimistic-concurrency update
// (version match). Under two concurrent capacity changes with the SAME expected
// version, exactly one must win and the other must observe a conflict (null) — never
// a lost update or a double-apply.
suite("PostgreSQL live capacity concurrency", () => {
  const prisma = createPrismaClient(databaseUrl!);

  async function seedRequest(numberOfWorkers: number) {
    const userId = randomUUID();
    const tag = userId.slice(0, 12);
    await prisma.user.create({
      data: { id: userId, publicId: `USR-PG-CAP-${tag}`, emailNormalized: `cap-${userId}@e2e.local`, displayName: "Cap Owner", status: "active" }
    });
    const org = await prisma.employerOrganization.create({
      data: { publicId: `ORG-PG-CAP-${tag}`, legalName: `Cap Org ${tag}`, displayName: "Cap Org", status: "active", createdByUserId: userId }
    });
    const residence = await prisma.residence.create({
      data: { publicId: `RES-PG-CAP-${tag}`, organizationId: org.id, name: "R", status: "active", createdByUserId: userId }
    });
    const department = await prisma.department.create({
      data: { publicId: `DEP-PG-CAP-${tag}`, organizationId: org.id, residenceId: residence.id, name: "D", status: "active", createdByUserId: userId }
    });
    const workGroup = await prisma.workGroup.findFirstOrThrow();
    const roleDefinition = await prisma.roleDefinition.findFirstOrThrow({ where: { workGroupId: workGroup.id } });
    const request = await prisma.jobRequest.create({
      data: {
        jobRequestNumber: `JR-CAP-${tag}`,
        organizationId: org.id,
        residenceId: residence.id,
        departmentId: department.id,
        workGroupId: workGroup.id,
        roleDefinitionId: roleDefinition.id,
        creatorUserId: userId,
        title: "Capacity Request",
        numberOfWorkers,
        requestType: "single_day",
        timezone: "America/Toronto",
        startAt: new Date(Date.now() + 20 * 3_600_000),
        endAt: new Date(Date.now() + 28 * 3_600_000),
        status: "approved_for_dispatch",
        createdByUserId: userId
      }
    });
    return { jobRequestId: request.id, userId, version: request.version };
  }

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("Add + Add with the same expected version → exactly one applies, one conflicts", async () => {
    const seed = await seedRequest(3);
    const expectedVersion = seed.version;
    const repos = [
      createPrismaJobRequestRepository(createPrismaClient(databaseUrl!)),
      createPrismaJobRequestRepository(createPrismaClient(databaseUrl!))
    ];
    const now = new Date();
    const results = await Promise.all([
      repos[0]!.updateDraft({ jobRequestId: seed.jobRequestId, expectedVersion, actorUserId: seed.userId, numberOfWorkers: 5, now }),
      repos[1]!.updateDraft({ jobRequestId: seed.jobRequestId, expectedVersion, actorUserId: seed.userId, numberOfWorkers: 7, now })
    ]);
    // Exactly one writer wins; the loser sees a version conflict (null).
    expect(results.filter((r) => r !== null)).toHaveLength(1);
    expect(results.filter((r) => r === null)).toHaveLength(1);

    const final = await prisma.jobRequest.findUniqueOrThrow({ where: { id: seed.jobRequestId } });
    // The version advanced exactly once, and the count is the single winner's value.
    expect(final.version).toBe(expectedVersion + 1);
    expect([5, 7]).toContain(final.numberOfWorkers);
  });

  it("a stale expected version never applies", async () => {
    const seed = await seedRequest(2);
    const repo = createPrismaJobRequestRepository(prisma);
    const now = new Date();
    const first = await repo.updateDraft({ jobRequestId: seed.jobRequestId, expectedVersion: seed.version, actorUserId: seed.userId, numberOfWorkers: 4, now });
    expect(first).not.toBeNull();
    // Reusing the old version must fail (no lost update).
    const stale = await repo.updateDraft({ jobRequestId: seed.jobRequestId, expectedVersion: seed.version, actorUserId: seed.userId, numberOfWorkers: 9, now });
    expect(stale).toBeNull();
    const final = await prisma.jobRequest.findUniqueOrThrow({ where: { id: seed.jobRequestId } });
    expect(final.numberOfWorkers).toBe(4);
  });
});
