import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import { createPrismaClient } from "@rwos/database";

import {
  buildIsolatedDatabaseUrl,
  localPostgresTestMode,
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
    process.env.RWOS_PRODUCTION_DATABASE_CLUSTER_ID,
    process.env.RWOS_RELEASE_SHA,
    process.env.RWOS_POSTGRES_TEST_MODE
  );
  if (issues.length > 0) {
    for (const issue of issues) process.stderr.write(`${issue}\n`);
    process.exit(1);
  }

  const databaseName = `rwos_validation_${Date.now()}_${randomUUID()
    .replaceAll("-", "")
    .slice(0, 12)}`;
  const baseUrl = new URL(process.env.RWOS_TEST_DATABASE_URL!);
  const localMode = process.env.RWOS_POSTGRES_TEST_MODE === localPostgresTestMode;
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
      process.stdout.write(
        localMode
          ? `LOCAL_POSTGRES_ISOLATED_DATABASE_CREATED name=${databaseName} host=loopback\n`
          : [
              "POSTGRES_ISOLATED_DATABASE_CREATED",
              `name=${databaseName}`,
              `releaseSha=${process.env.RWOS_RELEASE_SHA}`,
              `testClusterId=${process.env.RWOS_TEST_DATABASE_CLUSTER_ID}`,
              `productionClusterId=${process.env.RWOS_PRODUCTION_DATABASE_CLUSTER_ID}`,
              `databaseTlsMode=${baseUrl.searchParams.get("sslmode") ?? "local-only"}`
            ].join(" ") + "\n"
      );
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
      ["exec", "vitest", "run", "apps/qa-reset/src/postgresLifecycle.integration.test.ts"],
      validationEnvironment
    );
    run(
      "pnpm",
      [
        "exec",
        "vitest",
        "run",
        "--config",
        "vitest.external.config.ts",
        "apps/api/src/firstAdminBootstrap.postgres.test.ts",
        "apps/api/src/passwordReset.postgres.test.ts"
      ],
      validationEnvironment
    );
    run(
      "pnpm",
      [
        "exec",
        "vitest",
        "run",
        "tests/integration/postgres-worker-offer-capacity.test.ts",
        "tests/integration/postgres-assignment-concurrency.test.ts",
        "tests/integration/postgres-payroll-review-context.test.ts",
        "tests/integration/postgres-payroll-ai-review.test.ts",
        "tests/integration/postgres-payroll-period-review.test.ts",
        "tests/integration/postgres-payroll-period-review-paths.test.ts",
        "tests/integration/postgres-payroll-provenance.test.ts",
        "tests/integration/postgres-payroll-ai-egress.test.ts",
        "tests/integration/postgres-payroll-telemetry.test.ts"
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
        process.stdout.write(
          `${localMode ? "LOCAL_" : ""}POSTGRES_ISOLATED_DATABASE_CLEANUP_PASS name=${databaseName}\n`
        );
      } finally {
        await administrationClient.$disconnect();
      }
    }
  }
  process.stdout.write(
    localMode
      ? "LOCAL_POSTGRES_REQUIRED_VALIDATION_PASS evidence=none\n"
      : `POSTGRES_REQUIRED_VALIDATION_PASS releaseSha=${process.env.RWOS_RELEASE_SHA}\n`
  );
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
