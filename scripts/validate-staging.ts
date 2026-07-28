import { readdir } from "node:fs/promises";

import { createPrismaClient } from "@rwos/database";

import {
  isMigrationStateComplete,
  type MigrationStateRow,
  validateStagingEnvironment
} from "./staging-validation-policy";

const timeoutMs = 5_000;
const checks = [
  ["internal_api", process.env.INTERNAL_API_ORIGIN!, undefined],
  ["candidate_source", process.env.CANDIDATE_SOURCE_ORIGIN!, process.env.CANDIDATE_SOURCE_TOKEN],
  ["offer_delivery", process.env.OFFER_DELIVERY_ORIGIN!, process.env.OFFER_DELIVERY_TOKEN],
  [
    "distributed_limiter",
    process.env.AUTH_RATE_LIMITER_ORIGIN!,
    process.env.AUTH_RATE_LIMITER_TOKEN
  ],
  ["monitoring", process.env.MONITORING_HEALTHCHECK_URL!, undefined, true],
  ["paging", process.env.PAGING_HEALTHCHECK_URL!, undefined, true]
] as const;

void main();

async function main() {
  const issues = validateStagingEnvironment(process.env);
  if (issues.length > 0) {
    for (const issue of issues) process.stderr.write(`STAGING_VALIDATION_ERROR: ${issue}\n`);
    process.exit(1);
  }

  for (const [name, originOrUrl, token, exactUrl] of checks) {
    const url = exactUrl ? originOrUrl : new URL("/health", originOrUrl).toString();
    const response = await fetch(url, {
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
      signal: AbortSignal.timeout(timeoutMs)
    }).catch(() => null);
    if (!response?.ok) {
      process.stderr.write(`STAGING_VALIDATION_ERROR: ${name} health check failed.\n`);
      process.exit(1);
    }
  }

  const prisma = createPrismaClient(process.env.DATABASE_URL);
  let migrationStateComplete = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
    const migrationRows = await prisma.$queryRaw<
      MigrationStateRow[]
    >`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"`;
    const localMigrations = (await readdir("packages/database/prisma/migrations")).filter((entry) =>
      /^\d+_/.test(entry)
    );
    migrationStateComplete = isMigrationStateComplete(localMigrations, migrationRows);
  } finally {
    await prisma.$disconnect();
  }
  if (!migrationStateComplete) {
    process.stderr.write("STAGING_VALIDATION_ERROR: migration state is incomplete.\n");
    process.exit(1);
  }

  const databaseUrl = new URL(process.env.DATABASE_URL!);
  process.stdout.write(
    [
      "STAGING_VALIDATION_PASS",
      `releaseSha=${process.env.RWOS_RELEASE_SHA}`,
      `stagingClusterId=${process.env.RWOS_STAGING_DATABASE_CLUSTER_ID}`,
      `productionClusterId=${process.env.RWOS_PRODUCTION_DATABASE_CLUSTER_ID}`,
      `databaseTlsMode=${databaseUrl.searchParams.get("sslmode")}`
    ].join(" ") + "\n"
  );
}
