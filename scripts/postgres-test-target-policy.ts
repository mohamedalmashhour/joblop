export const postgresTestConfirmation = "disposable-test-target";

export function buildIsolatedDatabaseUrl(baseDatabaseUrl: string, databaseName: string) {
  const isolatedUrl = new URL(baseDatabaseUrl);
  isolatedUrl.pathname = `/${databaseName}`;
  return isolatedUrl;
}

export function validatePostgresTestTarget(
  testDatabaseUrl: string | undefined,
  confirmation: string | undefined,
  applicationDatabaseUrl: string | undefined,
  testClusterId: string | undefined,
  productionClusterId: string | undefined
) {
  const issues: string[] = [];
  if (!testDatabaseUrl) {
    return ["RWOS_TEST_DATABASE_URL is required for PostgreSQL concurrency validation."];
  }
  if (confirmation !== postgresTestConfirmation) {
    issues.push(`RWOS_TEST_DATABASE_CONFIRMATION must equal ${postgresTestConfirmation}.`);
  }
  if (!testClusterId?.trim()) issues.push("RWOS_TEST_DATABASE_CLUSTER_ID is required.");
  if (!productionClusterId?.trim()) issues.push("RWOS_PRODUCTION_DATABASE_CLUSTER_ID is required.");
  if (testClusterId?.trim() && testClusterId.trim() === productionClusterId?.trim()) {
    issues.push("The approved test and production database cluster identifiers must differ.");
  }
  if (applicationDatabaseUrl && applicationDatabaseUrl === testDatabaseUrl) {
    issues.push("RWOS_TEST_DATABASE_URL must differ from DATABASE_URL.");
  }
  try {
    const parsed = new URL(testDatabaseUrl);
    if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
      issues.push("RWOS_TEST_DATABASE_URL must use PostgreSQL.");
    }
    const databaseName = parsed.pathname.replace(/^\/+/, "").toLowerCase();
    if (!/(staging|stage|validation|test)/.test(databaseName)) {
      issues.push(
        "RWOS_TEST_DATABASE_URL must name an explicit staging, validation, or test database."
      );
    }
  } catch {
    issues.push("RWOS_TEST_DATABASE_URL must be a valid PostgreSQL URL.");
  }
  return issues;
}
