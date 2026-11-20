import { afterAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "@rwos/database";

const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

// A deployed database runs migrations but never the development seed, so the roles that creating a
// company depends on must come from migrations alone.
suite("PostgreSQL standard access roles", () => {
  const prisma = createPrismaClient(databaseUrl!);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("gives the company owner role its permissions", async () => {
    const owner = await prisma.accessRoleDefinition.findUniqueOrThrow({
      where: { key: "ORGANIZATION_OWNER" },
      include: { permissions: { include: { permission: true } } }
    });
    expect(owner.status).toBe("active");
    expect(owner.permissions.map((entry) => entry.permission.key)).toContain("organization.update");
  });
});
