import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  createPrismaCancellationStore,
  type CancellationStore
} from "@rwos/auth";
import { createPrismaClient } from "@rwos/database";

const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

// Governed-cancellation store concurrency: the DB-level idempotency guarantees
// (unique job_request_id + unique idempotency_key) must hold under parallel writers
// so a request produces exactly ONE cancellation and at most one obligation.
suite("PostgreSQL employer cancellation concurrency", () => {
  const prisma = createPrismaClient(databaseUrl!);

  async function seedRequest(): Promise<{ organizationId: string; jobRequestId: string; userId: string }> {
    const userId = randomUUID();
    const tag = userId.slice(0, 12);
    await prisma.user.create({
      data: {
        id: userId,
        publicId: `USR-PG-CX-${tag}`,
        emailNormalized: `cx-${userId}@e2e.local`,
        displayName: "Concurrency Owner",
        status: "active"
      }
    });
    const org = await prisma.employerOrganization.create({
      data: {
        publicId: `ORG-PG-CX-${tag}`,
        legalName: `Concurrency Org ${tag}`,
        displayName: "Concurrency Org",
        status: "active",
        createdByUserId: userId
      }
    });
    const residence = await prisma.residence.create({
      data: { publicId: `RES-PG-CX-${tag}`, organizationId: org.id, name: "R", status: "active", createdByUserId: userId }
    });
    const department = await prisma.department.create({
      data: {
        publicId: `DEP-PG-CX-${tag}`,
        organizationId: org.id,
        residenceId: residence.id,
        name: "D",
        status: "active",
        createdByUserId: userId
      }
    });
    const workGroup = await prisma.workGroup.findFirstOrThrow();
    const roleDefinition = await prisma.roleDefinition.findFirstOrThrow({ where: { workGroupId: workGroup.id } });
    const request = await prisma.jobRequest.create({
      data: {
        jobRequestNumber: `JR-CX-${userId.slice(0, 12)}`,
        organizationId: org.id,
        residenceId: residence.id,
        departmentId: department.id,
        workGroupId: workGroup.id,
        roleDefinitionId: roleDefinition.id,
        creatorUserId: userId,
        title: "Concurrency Request",
        numberOfWorkers: 2,
        requestType: "single_day",
        timezone: "America/Toronto",
        startAt: new Date(Date.now() + 20 * 3_600_000),
        endAt: new Date(Date.now() + 28 * 3_600_000),
        status: "approved_for_dispatch",
        createdByUserId: userId
      }
    });
    return { organizationId: org.id, jobRequestId: request.id, userId };
  }

  function createInput(seed: { organizationId: string; jobRequestId: string; userId: string }, key: string) {
    return {
      organizationId: seed.organizationId,
      jobRequestId: seed.jobRequestId,
      cause: "EMPLOYER_CANCELLED" as const,
      initialStatus: "requested" as const,
      affectedConfirmedWorkers: 0,
      idempotencyKey: key,
      initiatedByUserId: seed.userId,
      obligation: null,
      now: new Date()
    };
  }

  async function countRows(jobRequestId: string) {
    const [cancellations, obligations] = await Promise.all([
      prisma.employerRequestCancellation.count({ where: { jobRequestId } }),
      prisma.employerCancellationObligation.count({ where: { jobRequestId } })
    ]);
    return { cancellations, obligations };
  }

  // Relies on the work-group/role catalogue already present in the migrated+seeded
  // test database (seedDevelopmentCatalogue).
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("A/F: two concurrent confirms (different keys) → exactly one cancellation", async () => {
    const seed = await seedRequest();
    const stores: CancellationStore[] = [
      createPrismaCancellationStore(createPrismaClient(databaseUrl!)),
      createPrismaCancellationStore(createPrismaClient(databaseUrl!))
    ];
    const results = await Promise.all([
      stores[0]!.createCancellation(createInput(seed, `key-a-${seed.jobRequestId}`)),
      stores[1]!.createCancellation(createInput(seed, `key-b-${seed.jobRequestId}`))
    ]);
    // Exactly one writer created the record; both observe the same cancellation id.
    expect(results.filter((r) => r.created)).toHaveLength(1);
    expect(new Set(results.map((r) => r.cancellation.id)).size).toBe(1);
    expect(await countRows(seed.jobRequestId)).toEqual({ cancellations: 1, obligations: 0 });
  });

  it("B: same idempotency key racing → exactly one cancellation", async () => {
    const seed = await seedRequest();
    const key = `same-key-${seed.jobRequestId}`;
    const stores = [
      createPrismaCancellationStore(createPrismaClient(databaseUrl!)),
      createPrismaCancellationStore(createPrismaClient(databaseUrl!)),
      createPrismaCancellationStore(createPrismaClient(databaseUrl!))
    ];
    const results = await Promise.all(stores.map((s) => s.createCancellation(createInput(seed, key))));
    expect(results.filter((r) => r.created)).toHaveLength(1);
    expect(new Set(results.map((r) => r.cancellation.id)).size).toBe(1);
    expect((await countRows(seed.jobRequestId)).cancellations).toBe(1);
  });

  it("G: a repeated confirm after the record exists is idempotent (no new row)", async () => {
    const seed = await seedRequest();
    const store = createPrismaCancellationStore(prisma);
    const first = await store.createCancellation(createInput(seed, `once-${seed.jobRequestId}`));
    expect(first.created).toBe(true);
    const again = await store.createCancellation(createInput(seed, `different-${seed.jobRequestId}`));
    expect(again.created).toBe(false);
    expect(again.cancellation.id).toBe(first.cancellation.id);
    expect((await countRows(seed.jobRequestId)).cancellations).toBe(1);
  });
});
