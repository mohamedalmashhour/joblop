import { getRuntimeConfig } from "@rwos/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

export { PrismaClient };
export type { Prisma } from "@prisma/client";

const localValidationDatabaseUrl = "postgresql://localhost:5432/resident_job_prisma_phase01_validation";

export function getDatabaseConnectionString(env: NodeJS.ProcessEnv = process.env) {
  return env.DATABASE_URL ?? localValidationDatabaseUrl;
}

export function createPrismaClient(connectionString = getDatabaseConnectionString()) {
  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({ adapter });
}

export function getDatabaseFoundationStatus() {
  const config = getRuntimeConfig();

  return {
    configured: config.hasDatabaseUrl,
    provider: "postgresql",
    orm: "prisma",
    migrations: "prisma-migrate",
    client: "prisma-client",
    phase01BusinessSchemaAuthorized: true,
    deferredWorkflowEntitiesImplemented: false
  } as const;
}
