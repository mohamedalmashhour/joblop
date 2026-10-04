import { createPrismaClient } from "@rwos/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createFirstAdminBootstrapService,
  createPrismaFirstAdminBootstrapRepository
} from "./firstAdminBootstrap";

// Integration suite: runs only when a test database is provided. Without RWOS_TEST_DATABASE_URL it
// skips (rather than throwing) so the default `pnpm -r test` is green; set the env to run it in full.
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const prisma = createPrismaClient(databaseUrl ?? "postgresql://unused:unused@127.0.0.1:5432/unused");
const secret = "synthetic-concurrent-bootstrap-secret-000001";
const releaseSha = "b".repeat(40);
const expiresAt = new Date(Date.now() + 60_000);

const suite = databaseUrl ? describe : describe.skip;

suite("first Platform Administrator PostgreSQL serialization", () => {
  beforeAll(async () => {
    await prisma.accessRoleDefinition.upsert({
      where: { key: "PLATFORM_ADMINISTRATOR" },
      create: {
        key: "PLATFORM_ADMINISTRATOR",
        scope: "platform",
        status: "active",
        description: "Synthetic bootstrap integration role"
      },
      update: { scope: "platform", status: "active" }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("commits exactly one initial administrator under concurrent attempts", async () => {
    const repository = createPrismaFirstAdminBootstrapRepository(prisma);
    const service = createFirstAdminBootstrapService(repository, {
      enabled: true,
      environment: "staging",
      releaseSha,
      configuredSecret: secret,
      expiresAt
    });
    const input = {
      presentedSecret: secret,
      email: "synthetic.bootstrap@example.invalid",
      displayName: "Synthetic Bootstrap Administrator",
      password: "SyntheticBootstrap123",
      correlationId: "bootstrap-concurrency-a"
    };
    const results = await Promise.all([
      service.bootstrap(input),
      service.bootstrap({ ...input, correlationId: "bootstrap-concurrency-b" })
    ]);

    expect(results.filter(({ outcome }) => outcome === "created")).toHaveLength(1);
    expect(
      results.filter(({ outcome }) => outcome === "admin_exists" || outcome === "already_completed")
    ).toHaveLength(1);
    await expect(
      prisma.platformAccessGrant.count({
        where: { accessRole: { key: "PLATFORM_ADMINISTRATOR" } }
      })
    ).resolves.toBe(1);
    await expect(
      prisma.auditEvent.count({
        where: { action: "platform_admin.bootstrap", newState: "created" }
      })
    ).resolves.toBe(1);
  });
});
