// Required certificates on real PostgreSQL: a worker can claim an open-claim job only while holding
// every certificate the employer requires (a staff-accepted HR document, not expired at the start).
// The seeded job meets openJobWhere: approved_for_dispatch, openClaim, priced, upcoming, active site.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createPrismaAssignmentRepository, createPrismaWorkerOfferRepository } from "@rwos/auth";
import { createPrismaClient } from "@rwos/database";
import { claimOpenJob } from "../../apps/api/src/openClaim";
import { openJobWhere } from "../../apps/api/src/openJobs";

const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;
const runKey = randomUUID().slice(0, 8);
const displayOrder = 32_000_000 + Number.parseInt(runKey.slice(0, 6), 16);
const adminUserId = randomUUID();
const holderUserId = randomUUID();
const unverifiedUserId = randomUUID();
const expiredUserId = randomUUID();
// Upcoming (openJobWhere only lists jobs that have not started).
const startAt = new Date(Date.now() + 10 * 86_400_000);
const endAt = new Date(startAt.getTime() + 8 * 3_600_000);

suite("PostgreSQL open-claim required certificates", () => {
  const prisma = createPrismaClient(databaseUrl);

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        { id: adminUserId, publicId: `USR-RC-ADMIN-${runKey}`, emailNormalized: `rc-admin-${runKey}@example.test`, status: "active" },
        { id: holderUserId, publicId: `USR-RC-W1-${runKey}`, emailNormalized: `rc-w1-${runKey}@example.test`, status: "active" },
        { id: unverifiedUserId, publicId: `USR-RC-W2-${runKey}`, emailNormalized: `rc-w2-${runKey}@example.test`, status: "active" },
        { id: expiredUserId, publicId: `USR-RC-W3-${runKey}`, emailNormalized: `rc-w3-${runKey}@example.test`, status: "active" }
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function seedJob(suffix: string, numberOfWorkers: number, requiredCertificates: string[], requiredCertificateOther: string | null = null) {
    const organization = await prisma.employerOrganization.create({
      data: { publicId: `ORG-RC-${suffix}-${runKey}`, legalName: "Open Claim Test", displayName: "Open Claim Test", status: "active", createdByUserId: adminUserId }
    });
    const residence = await prisma.residence.create({
      data: { publicId: `RES-RC-${suffix}-${runKey}`, organizationId: organization.id, name: "Open Claim Residence", status: "active", createdByUserId: adminUserId }
    });
    const department = await prisma.department.create({
      data: { publicId: `DEP-RC-${suffix}-${runKey}`, organizationId: organization.id, residenceId: residence.id, name: "Open Claim Department", status: "active", createdByUserId: adminUserId }
    });
    const workGroup = await prisma.workGroup.create({
      data: { key: `rc-${suffix}-${runKey}`, displayLabel: "Open Claim", status: "active", displayOrder: displayOrder + suffix.length }
    });
    const roleDefinition = await prisma.roleDefinition.create({
      data: { workGroupId: workGroup.id, key: `rc-role-${suffix}-${runKey}`, displayLabel: "Open Claim Role", status: "active", displayOrder: displayOrder + suffix.length }
    });
    const jobRequest = await prisma.jobRequest.create({
      data: {
        jobRequestNumber: `JR-RC-${suffix}-${runKey}`,
        organizationId: organization.id,
        residenceId: residence.id,
        departmentId: department.id,
        workGroupId: workGroup.id,
        roleDefinitionId: roleDefinition.id,
        creatorUserId: adminUserId,
        title: "Certificate job",
        numberOfWorkers,
        openClaim: true,
        requiredCertificates,
        requiredCertificateOther,
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
    return jobRequest;
  }


  async function seedWorkers() {
    const [holder, unverified, expired] = await Promise.all([
      prisma.workerIdentity.create({ data: { userId: holderUserId, displayName: "Holder" } }),
      prisma.workerIdentity.create({ data: { userId: unverifiedUserId, displayName: "Unverified" } }),
      prisma.workerIdentity.create({ data: { userId: expiredUserId, displayName: "Expired" } })
    ]);
    await prisma.hrDocument.createMany({
      data: [
        { workerIdentityId: holder.id, documentType: "cert_pab", status: "accepted", expiresAt: new Date(startAt.getTime() + 365 * 86_400_000) },
        { workerIdentityId: unverified.id, documentType: "cert_pab", status: "submitted" },
        { workerIdentityId: expired.id, documentType: "cert_pab", status: "accepted", expiresAt: new Date(startAt.getTime() - 86_400_000) }
      ]
    });
  }

  const deps = () => ({
    prisma,
    assignmentRepository: createPrismaAssignmentRepository(prisma),
    workerOfferRepository: createPrismaWorkerOfferRepository(prisma)
  });

  it("assigns only the worker holding a verified, unexpired certificate", async () => {
    await seedWorkers();
    const job = await seedJob("pab", 3, ["pab"]);
    expect(await prisma.jobRequest.count({ where: openJobWhere({ now: new Date(), extra: { id: job.id } }, false) })).toBe(1);

    const unverified = await claimOpenJob(deps(), { userId: unverifiedUserId, jobRequestId: job.id });
    const expired = await claimOpenJob(deps(), { userId: expiredUserId, jobRequestId: job.id });
    const holder = await claimOpenJob(deps(), { userId: holderUserId, jobRequestId: job.id });

    expect(unverified).toEqual({ status: "ineligible", reasons: ["missing_certificate:pab"] });
    expect(expired).toEqual({ status: "ineligible", reasons: ["missing_certificate:pab"] });
    expect(holder.status).toBe("assigned");
    // No offer was minted for the refused workers.
    expect(await prisma.workerOffer.count({ where: { jobRequestId: job.id } })).toBe(1);
  });

  it("never lets anyone claim a job asking for an Other certificate (a person checks it)", async () => {
    const job = await seedJob("other", 2, ["other"], "Carte de serveur");
    // A worker with no shift at that time (the holder now holds the first job's shift, same hours).
    const result = await claimOpenJob(deps(), { userId: unverifiedUserId, jobRequestId: job.id });
    expect(result).toEqual({ status: "ineligible", reasons: ["missing_certificate:other"] });
  });
});
