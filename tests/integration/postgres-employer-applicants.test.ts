import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "@rwos/database";
import { listEmployerApplicants, setEmployerFavorite } from "../../apps/api/src/employerApplicants";

const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

// Runs the applicant queries against the real schema, including the new favourite columns.
suite("PostgreSQL employer applicants", () => {
  const prisma = createPrismaClient(databaseUrl!);

  async function seedJob() {
    const userId = randomUUID();
    const tag = userId.slice(0, 12);
    await prisma.user.create({ data: { id: userId, publicId: `USR-AP-${tag}`, emailNormalized: `ap-${userId}@e2e.local`, status: "active" } as never });
    const org = await prisma.employerOrganization.create({ data: { publicId: `ORG-AP-${tag}`, legalName: `AP ${tag}`, displayName: `AP ${tag}`, status: "active", createdByUserId: userId } });
    const res = await prisma.residence.create({ data: { publicId: `RES-AP-${tag}`, organizationId: org.id, name: "AP", status: "active", createdByUserId: userId } as never });
    const wg = await prisma.workGroup.findFirstOrThrow();
    const role = await prisma.roleDefinition.findFirstOrThrow({ where: { workGroupId: wg.id } });
    const dept = await prisma.department.create({ data: { publicId: `DEP-AP-${tag}`, organizationId: org.id, residenceId: res.id, name: "AP", status: "active", createdByUserId: userId } as never });
    const job = await prisma.jobRequest.create({
      data: {
        jobRequestNumber: `JR-AP-${randomUUID().slice(0, 10)}`,
        organizationId: org.id, residenceId: res.id, departmentId: dept.id, workGroupId: wg.id, roleDefinitionId: role.id,
        creatorUserId: userId, title: "AP Job", numberOfWorkers: 1, requestType: "single_day", timezone: "America/Toronto",
        startAt: new Date(Date.now() + 20 * 3_600_000), endAt: new Date(Date.now() + 28 * 3_600_000),
        status: "approved_for_dispatch", createdByUserId: userId
      } as never
    });
    return { userId, organizationId: org.id, jobRequestId: job.id };
  }

  async function seedInterest(job: Awaited<ReturnType<typeof seedJob>>, status: "submitted" | "withdrawn") {
    const userId = randomUUID();
    await prisma.user.create({ data: { id: userId, publicId: `USR-APW-${userId.slice(0, 12)}`, emailNormalized: `apw-${userId}@e2e.local`, status: "active" } as never });
    const worker = await prisma.workerIdentity.create({ data: { userId, displayName: "Sara Haddad", status: "active" } });
    return prisma.workerJobInterest.create({
      data: { workerIdentityId: worker.id, jobRequestId: job.jobRequestId, organizationId: job.organizationId, status }
    });
  }

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("lists limited details, saves a favourite, and keeps the interest status", async () => {
    const job = await seedJob();
    const interest = await seedInterest(job, "submitted");
    await seedInterest(job, "withdrawn");

    const ids = { organizationId: job.organizationId, jobRequestId: job.jobRequestId };
    expect(await listEmployerApplicants(prisma as never, ids)).toEqual([
      { interestId: interest.id, firstName: "Sara", verified: false, completedShifts: 0, status: "interested", favorite: false }
    ]);

    const favorite = { ...ids, interestId: interest.id, actorUserId: job.userId };
    expect(await setEmployerFavorite(prisma as never, { ...favorite, favorite: true })).toBe(true);
    expect((await listEmployerApplicants(prisma as never, ids))[0]?.favorite).toBe(true);
    const row = await prisma.workerJobInterest.findUniqueOrThrow({ where: { id: interest.id } });
    expect(row.status).toBe("submitted");
    expect(row.employerFavoritedByUserId).toBe(job.userId);

    expect(await setEmployerFavorite(prisma as never, { ...favorite, favorite: false })).toBe(true);
    expect((await listEmployerApplicants(prisma as never, ids))[0]?.favorite).toBe(false);
  });

  it("does not let another employer touch the favourite", async () => {
    const job = await seedJob();
    const other = await seedJob();
    const interest = await seedInterest(job, "submitted");
    expect(
      await setEmployerFavorite(prisma as never, {
        organizationId: other.organizationId,
        jobRequestId: job.jobRequestId,
        interestId: interest.id,
        favorite: true,
        actorUserId: other.userId
      })
    ).toBe(false);
  });
});
