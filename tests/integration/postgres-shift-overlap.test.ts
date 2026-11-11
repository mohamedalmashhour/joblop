// A worker can never hold two shifts at the same time — on real PostgreSQL.
//
// Owner rule: "they can take other jobs but not 2 jobs at the same time". The same worker claims
// open jobs whose shifts overlap; the server must give them at most one. Concurrent claims are the
// important case: both pass the cheap pre-check, and the per-worker lock inside the assignment
// arbiter must still let exactly one through. Touching shifts (one ends when the next starts) are
// fine, cancelled shifts no longer count, and long-term listings (no shifts) never count.
//
// Every seeded job meets the open-jobs rule (openJobWhere): approved_for_dispatch, open on the
// calendar, priced, upcoming, active site.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  createPrismaAssignmentRepository,
  createPrismaHeldShiftOverlapFinder,
  createPrismaWorkerOfferRepository
} from "@rwos/auth";
import { createPrismaClient } from "@rwos/database";
import { claimOpenJob } from "../../apps/api/src/openClaim";
import { openJobWhere } from "../../apps/api/src/openJobs";

const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;
const runKey = randomUUID().slice(0, 8);
const displayOrder = 32_000_000 + Number.parseInt(runKey.slice(0, 6), 16);
const adminUserId = randomUUID();
const HOUR = 60 * 60 * 1000;
// Far enough ahead to stay upcoming whenever CI runs.
const baseDay = Date.UTC(2031, 2, 3, 14, 0, 0);
const ACTIVE = ["pending_validation", "confirmed", "worker_acknowledged", "ready_for_attendance", "in_attendance_window", "attendance_handoff"] as const;

suite("PostgreSQL a worker can never hold two shifts at the same time", () => {
  const prisma = createPrismaClient(databaseUrl);
  let scope: { organizationId: string; residenceId: string; departmentId: string; workGroupId: string; roleDefinitionId: string };
  let jobCounter = 0;

  beforeAll(async () => {
    await prisma.user.create({
      data: { id: adminUserId, publicId: `USR-SO-ADMIN-${runKey}`, emailNormalized: `so-admin-${runKey}@example.test`, status: "active" }
    });
    const organization = await prisma.employerOrganization.create({
      data: { publicId: `ORG-SO-${runKey}`, legalName: "Shift Overlap Test", displayName: "Shift Overlap Test", status: "active", createdByUserId: adminUserId }
    });
    const residence = await prisma.residence.create({
      data: { publicId: `RES-SO-${runKey}`, organizationId: organization.id, name: "Shift Overlap Residence", status: "active", createdByUserId: adminUserId }
    });
    const department = await prisma.department.create({
      data: { publicId: `DEP-SO-${runKey}`, organizationId: organization.id, residenceId: residence.id, name: "Shift Overlap Department", status: "active", createdByUserId: adminUserId }
    });
    const workGroup = await prisma.workGroup.create({
      data: { key: `so-${runKey}`, displayLabel: "Shift Overlap", status: "active", displayOrder }
    });
    const roleDefinition = await prisma.roleDefinition.create({
      data: { workGroupId: workGroup.id, key: `so-role-${runKey}`, displayLabel: "Shift Overlap Role", status: "active", displayOrder }
    });
    scope = {
      organizationId: organization.id,
      residenceId: residence.id,
      departmentId: department.id,
      workGroupId: workGroup.id,
      roleDefinitionId: roleDefinition.id
    };
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function seedWorker(label: string) {
    const userId = randomUUID();
    await prisma.user.create({
      data: { id: userId, publicId: `USR-SO-${label}-${runKey}`, emailNormalized: `so-${label.toLowerCase()}-${runKey}@example.test`, status: "active" }
    });
    const identity = await prisma.workerIdentity.create({ data: { userId, displayName: `Worker ${label}` } });
    return { userId, workerIdentityId: identity.id };
  }

  async function seedOpenJob(input: { startAt: Date; endAt: Date; jobLength?: "short_term" | "long_term" }) {
    jobCounter += 1;
    const jobRequest = await prisma.jobRequest.create({
      data: {
        jobRequestNumber: `JR-SO-${runKey}-${jobCounter}`,
        ...scope,
        creatorUserId: adminUserId,
        title: `Shift overlap ${jobCounter}`,
        numberOfWorkers: 3,
        openClaim: true,
        urgency: "normal",
        requestType: "single_day",
        timezone: "America/Toronto",
        startAt: input.startAt,
        endAt: input.endAt,
        jobLength: input.jobLength ?? "short_term",
        status: "approved_for_dispatch",
        createdByUserId: adminUserId
      }
    });
    await prisma.requestPricingSnapshot.create({
      data: {
        jobRequestId: jobRequest.id,
        organizationId: scope.organizationId,
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
        organizationId: scope.organizationId,
        residenceId: scope.residenceId,
        departmentId: scope.departmentId,
        workGroupId: scope.workGroupId,
        roleDefinitionId: scope.roleDefinitionId,
        state: "offer_preparation",
        priority: "normal",
        urgency: "normal",
        requiredWorkerCount: 3,
        preparedOfferCount: 3,
        createdByUserId: adminUserId
      }
    });
    if ((input.jobLength ?? "short_term") === "short_term") {
      // The seed must be an open Joblop job a worker can see and take.
      await expect(
        prisma.jobRequest.count({ where: openJobWhere({ now: new Date(), extra: { id: jobRequest.id } }) })
      ).resolves.toBe(1);
    }
    return jobRequest;
  }

  function depsFor(client: ReturnType<typeof createPrismaClient>) {
    return {
      prisma: client,
      assignmentRepository: createPrismaAssignmentRepository(client),
      workerOfferRepository: createPrismaWorkerOfferRepository(client)
    };
  }

  const shift = (dayOffset: number, startHour: number, hours: number) => {
    const startAt = new Date(baseDay + dayOffset * 24 * HOUR + startHour * HOUR);
    return { startAt, endAt: new Date(startAt.getTime() + hours * HOUR) };
  };

  it("lets exactly one of two concurrent overlapping claims by the same worker win", async () => {
    const clients = [createPrismaClient(databaseUrl), createPrismaClient(databaseUrl)] as const;
    try {
      for (let iteration = 0; iteration < 3; iteration += 1) {
        const worker = await seedWorker(`RACE${iteration}`);
        const first = await seedOpenJob(shift(iteration, 0, 8)); // 9:00–17:00 Montréal
        const second = await seedOpenJob(shift(iteration, 4, 8)); // 13:00–21:00 Montréal

        const results = await Promise.all([
          claimOpenJob(depsFor(clients[0]), { userId: worker.userId, jobRequestId: first.id }),
          claimOpenJob(depsFor(clients[1]), { userId: worker.userId, jobRequestId: second.id })
        ]);

        expect(results.filter((r) => r.status === "assigned")).toHaveLength(1);
        const refused = results.filter((r) => r.status === "shift_overlap");
        expect(refused).toHaveLength(1);
        // The refusal names the shift the worker now holds (the winner's).
        const winnerJob = results[0]!.status === "assigned" ? first : second;
        expect(refused[0]).toMatchObject({
          heldShift: { startAt: winnerJob.startAt, endAt: winnerJob.endAt, timezone: "America/Toronto" }
        });

        await expect(
          prisma.assignment.count({ where: { workerIdentityId: worker.workerIdentityId, status: { in: [...ACTIVE] } } })
        ).resolves.toBe(1);
        // The loser's minted offer was retired, so it is not a lingering active offer.
        await expect(
          prisma.workerOffer.count({
            where: { workerIdentityId: worker.workerIdentityId, status: { in: ["draft", "approved", "sent", "delivered", "viewed", "accepted"] } }
          })
        ).resolves.toBe(1);
      }
    } finally {
      await Promise.all(clients.map((client) => client.$disconnect()));
    }
  });

  it("refuses a later overlapping claim before minting any offer", async () => {
    const worker = await seedWorker("SEQ");
    const held = await seedOpenJob(shift(10, 0, 8));
    const overlapping = await seedOpenJob(shift(10, 7, 4));

    await expect(claimOpenJob(depsFor(prisma), { userId: worker.userId, jobRequestId: held.id })).resolves.toMatchObject({ status: "assigned" });
    await expect(claimOpenJob(depsFor(prisma), { userId: worker.userId, jobRequestId: overlapping.id })).resolves.toEqual({
      status: "shift_overlap",
      heldShift: { startAt: held.startAt, endAt: held.endAt, timezone: "America/Toronto" }
    });
    await expect(prisma.workerOffer.count({ where: { jobRequestId: overlapping.id } })).resolves.toBe(0);
  });

  it("allows shifts that only touch end-to-start (9–17 then 17–21)", async () => {
    const worker = await seedWorker("TOUCH");
    const day = await seedOpenJob(shift(20, 0, 8));
    const evening = await seedOpenJob(shift(20, 8, 4));

    await expect(claimOpenJob(depsFor(prisma), { userId: worker.userId, jobRequestId: day.id })).resolves.toMatchObject({ status: "assigned" });
    await expect(claimOpenJob(depsFor(prisma), { userId: worker.userId, jobRequestId: evening.id })).resolves.toMatchObject({ status: "assigned" });
  });

  it("stops counting a shift once it is cancelled", async () => {
    const worker = await seedWorker("CANCEL");
    const held = await seedOpenJob(shift(30, 0, 8));
    const overlapping = await seedOpenJob(shift(30, 2, 8));

    const claimed = await claimOpenJob(depsFor(prisma), { userId: worker.userId, jobRequestId: held.id });
    expect(claimed.status).toBe("assigned");
    if (claimed.status !== "assigned") return;
    await prisma.assignment.update({ where: { id: claimed.assignmentId }, data: { status: "worker_withdrawn" } });

    await expect(claimOpenJob(depsFor(prisma), { userId: worker.userId, jobRequestId: overlapping.id })).resolves.toMatchObject({ status: "assigned" });
  });

  it("stops counting a shift once its job is cancelled, even after attendance handoff", async () => {
    const worker = await seedWorker("JOBCANCEL");
    const held = await seedOpenJob(shift(35, 0, 8));
    const replacement = await seedOpenJob(shift(35, 0, 8));

    const claimed = await claimOpenJob(depsFor(prisma), { userId: worker.userId, jobRequestId: held.id });
    expect(claimed.status).toBe("assigned");
    if (claimed.status !== "assigned") return;
    // The assignment stays in attendance_handoff; only the job itself is cancelled.
    await prisma.jobRequest.update({ where: { id: held.id }, data: { status: "cancelled" } });

    await expect(claimOpenJob(depsFor(prisma), { userId: worker.userId, jobRequestId: replacement.id })).resolves.toMatchObject({ status: "assigned" });
  });

  it("never counts long-term listings, which have no shifts", async () => {
    const worker = await seedWorker("LONG");
    const longTerm = await seedOpenJob({ ...shift(40, 0, 8), jobLength: "long_term" });
    const shortTerm = await seedOpenJob(shift(40, 1, 6));
    const finder = createPrismaHeldShiftOverlapFinder(prisma);

    // Long-term listings are never claimed (workers Apply and the employer hires directly).
    await expect(claimOpenJob(depsFor(prisma), { userId: worker.userId, jobRequestId: longTerm.id })).resolves.toMatchObject({ status: "not_open" });
    // A long-term listing does not block a short-term shift at the same time…
    await expect(
      finder({ workerIdentityId: worker.workerIdentityId, jobRequestId: shortTerm.id, startAt: shortTerm.startAt, endAt: shortTerm.endAt })
    ).resolves.toBeNull();
    await expect(claimOpenJob(depsFor(prisma), { userId: worker.userId, jobRequestId: shortTerm.id })).resolves.toMatchObject({ status: "assigned" });
    // …and a long-term job is never refused for a short-term shift already held.
    await expect(
      finder({ workerIdentityId: worker.workerIdentityId, jobRequestId: longTerm.id, startAt: longTerm.startAt, endAt: longTerm.endAt })
    ).resolves.toBeNull();
  });
});
