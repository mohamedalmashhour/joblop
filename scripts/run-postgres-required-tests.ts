import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import { createPrismaClient } from "@rwos/database";

import {
  buildIsolatedDatabaseUrl,
  postgresTestConfirmation,
  validatePostgresTestTarget
} from "./postgres-test-target-policy";

void main();

async function main() {
  const issues = validatePostgresTestTarget(
    process.env.RWOS_TEST_DATABASE_URL,
    process.env.RWOS_TEST_DATABASE_CONFIRMATION,
    process.env.DATABASE_URL,
    process.env.RWOS_TEST_DATABASE_CLUSTER_ID,
    process.env.RWOS_PRODUCTION_DATABASE_CLUSTER_ID
  );
  if (issues.length > 0) {
    for (const issue of issues) process.stderr.write(`${issue}\n`);
    process.exit(1);
  }

  const databaseName = `rwos_validation_${Date.now()}_${randomUUID()
    .replaceAll("-", "")
    .slice(0, 12)}`;
  const baseUrl = new URL(process.env.RWOS_TEST_DATABASE_URL!);
  const isolatedUrl = buildIsolatedDatabaseUrl(baseUrl.toString(), databaseName);
  const validationEnvironment = {
    ...process.env,
    DATABASE_URL: isolatedUrl.toString(),
    RWOS_TEST_DATABASE_URL: isolatedUrl.toString(),
    RWOS_TEST_DATABASE_CONFIRMATION: postgresTestConfirmation
  };

  let databaseCreated = false;
  try {
    const administrationClient = createPrismaClient(baseUrl.toString());
    try {
      await administrationClient.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
      databaseCreated = true;
      process.stdout.write(`POSTGRES_ISOLATED_DATABASE_CREATED name=${databaseName}\n`);
    } finally {
      await administrationClient.$disconnect();
    }
    run(
      "pnpm",
      ["--filter", "@rwos/database", "exec", "prisma", "migrate", "deploy"],
      validationEnvironment
    );
    run(
      "pnpm",
      [
        "exec",
        "vitest",
        "run",
        "tests/integration/postgres-worker-offer-capacity.test.ts",
        "tests/integration/postgres-assignment-concurrency.test.ts"
      ],
      validationEnvironment
    );
  } finally {
    if (databaseCreated) {
      const administrationClient = createPrismaClient(baseUrl.toString());
      try {
        await administrationClient.$executeRawUnsafe(
          `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${databaseName}' AND pid <> pg_backend_pid()`
        );
        await administrationClient.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
        process.stdout.write(`POSTGRES_ISOLATED_DATABASE_CLEANUP_PASS name=${databaseName}\n`);
      } finally {
        await administrationClient.$disconnect();
      }
    }
  }
  process.stdout.write("POSTGRES_REQUIRED_VALIDATION_PASS\n");
}

function run(command: string, args: string[], environment: NodeJS.ProcessEnv) {
  const completed = spawnSync(command, args, {
    cwd: process.cwd(),
    env: environment,
    stdio: "inherit"
  });
  if (completed.status !== 0) {
    throw new Error("Required PostgreSQL validation failed.");
  }
}
