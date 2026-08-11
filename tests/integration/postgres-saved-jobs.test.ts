import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  createWorkerSavedJobsService,
  createPrismaWorkerIdentityResolver,
  createPrismaSavedJobVisibilityReader,
  createPrismaSavedJobStore
} from "@rwos/auth";
import { createPrismaClient } from "@rwos/database";

const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

// Verifies the saved-jobs adapters against real Postgres: the (worker, job) unique
// constraint makes save idempotent (P2002 → alreadySaved), unsave is idempotent, list is
// worker-scoped + newest-first, and non-visible jobs cannot be saved.
suite("PostgreSQL worker saved jobs", () => {
  const prisma = createPrismaClient(databaseUrl!);
  const service = createWorkerSavedJobsService({
    identities: createPrismaWorkerIdentityResolver(prisma as never),
    visibility: createPrismaSavedJobVisibilityReader(prisma as never),
    store: createPrismaSavedJobStore(prisma as never)
  });

  async function seedWorker() {
    const userId = randomUUID();
    const tag = userId.slice(0, 12);
    await prisma.user.create({ data: { id: userId, publicId: `USR-SV-${tag}`, emailNormalized: `sv-${userId}@e2e.local`, displayName: "SV", status: "active" } });
    await prisma.workerIdentity.create({ data: { userId, displayName: "Worker SV", status: "active" } });
    return userId;
  }

  async function seedJob(status: "approved_for_dispatch" | "draft") {
    const userId = randomUUID();
    const tag = userId.slice(0, 12);
    await prisma.user.create({ data: { id: userId, publicId: `USR-SVJ-${tag}`, emailNormalized: `svj-${userId}@e2e.local`, displayName: "SVJ", status: "active" } });
    const org = await prisma.employerOrganization.create({ data: { publicId: `ORG-SV-${tag}`, legalName: `SV ${tag}`, displayName: "SV Care", status: "active", createdByUserId: userId } });
    const res = await prisma.residence.create({ data: { publicId: `RES-SV-${randomUUID().slice(0, 8)}`, organizationId: org.id, name: "R", status: "active", createdByUserId: userId, province: "QC", city: "Laval" } });
    const wg = await prisma.workGroup.findFirstOrThrow();
    const role = await prisma.roleDefinition.findFirstOrThrow({ where: { workGroupId: wg.id } });
    const dept = await prisma.department.create({ data: { publicId: `DEP-SV-${randomUUID().slice(0, 8)}`, organizationId: org.id, residenceId: res.id, name: "D", status: "active", createdByUserId: userId } });
    const job = await prisma.jobRequest.create({
      data: {
        jobRequestNumber: `JR-SV-${randomUUID().slice(0, 10)}`,
        organizationId: org.id, residenceId: res.id, departmentId: dept.id, workGroupId: wg.id, roleDefinitionId: role.id,
        creatorUserId: userId, title: "SV Job", numberOfWorkers: 2, requestType: "single_day", timezone: "America/Toronto",
        startAt: new Date(Date.now() + 20 * 3_600_000), endAt: new Date(Date.now() + 28 * 3_600_000),
        status, createdByUserId: userId
      }
    });
    return job.id;
  }

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("save is idempotent, list is worker-scoped + newest-first, unsave is idempotent", async () => {
    const workerUserId = await seedWorker();
    const jobA = await seedJob("approved_for_dispatch");
    const jobB = await seedJob("approved_for_dispatch");

    expect(await service.save({ userId: workerUserId, jobRequestId: jobA })).toEqual({ saved: true, alreadySaved: false });
    // second save of the same job → unique constraint → idempotent
    expect(await service.save({ userId: workerUserId, jobRequestId: jobA })).toEqual({ saved: true, alreadySaved: true });
    expect(await service.save({ userId: workerUserId, jobRequestId: jobB })).toEqual({ saved: true, alreadySaved: false });

    const list = await service.list({ userId: workerUserId });
    expect(list.map((r) => r.jobRequestId)).toEqual([jobB, jobA]); // newest-first

    const among = await service.savedIdsAmong({ userId: workerUserId, jobRequestIds: [jobA, jobB, randomUUID()] });
    expect([...among].sort()).toEqual([jobA, jobB].sort());

    expect(await service.unsave({ userId: workerUserId, jobRequestId: jobA })).toEqual({ removed: true });
    expect(await service.unsave({ userId: workerUserId, jobRequestId: jobA })).toEqual({ removed: false });
    expect((await service.list({ userId: workerUserId })).map((r) => r.jobRequestId)).toEqual([jobB]);

    // scoping: a second worker sees none of the first worker's saves
    const otherWorker = await seedWorker();
    expect(await service.list({ userId: otherWorker })).toHaveLength(0);
  });

  it("cannot save a non-visible (draft) job", async () => {
    const workerUserId = await seedWorker();
    const draftJob = await seedJob("draft");
    await expect(service.save({ userId: workerUserId, jobRequestId: draftJob })).rejects.toMatchObject({ code: "not_found" });
  });
});
