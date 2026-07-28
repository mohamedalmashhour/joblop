import {
  isFullReleaseSha,
  isImmutableExternalIdentity,
  readApprovedPostgresTlsMode
} from "./evidence-policy";

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
  productionClusterId: string | undefined,
  releaseSha: string | undefined
) {
  const issues: string[] = [];
  if (!testDatabaseUrl) {
    return ["RWOS_TEST_DATABASE_URL is required for PostgreSQL concurrency validation."];
  }
  if (confirmation !== postgresTestConfirmation) {
    issues.push(`RWOS_TEST_DATABASE_CONFIRMATION must equal ${postgresTestConfirmation}.`);
  }
  if (!testClusterId?.trim()) issues.push("RWOS_TEST_DATABASE_CLUSTER_ID is required.");
  else if (!isImmutableExternalIdentity(testClusterId)) {
    issues.push("RWOS_TEST_DATABASE_CLUSTER_ID must be an immutable provider-qualified identity.");
  }
  if (!productionClusterId?.trim()) issues.push("RWOS_PRODUCTION_DATABASE_CLUSTER_ID is required.");
  else if (!isImmutableExternalIdentity(productionClusterId)) {
    issues.push(
      "RWOS_PRODUCTION_DATABASE_CLUSTER_ID must be an immutable provider-qualified identity."
    );
  }
  if (!releaseSha?.trim()) issues.push("RWOS_RELEASE_SHA is required.");
  if (releaseSha && !isFullReleaseSha(releaseSha)) {
    issues.push("RWOS_RELEASE_SHA must be a full lowercase 40-character Git commit SHA.");
  }
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
    if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(parsed.hostname)) {
      if (!readApprovedPostgresTlsMode(parsed)) {
        issues.push(
          "RWOS_TEST_DATABASE_URL must require TLS with sslmode=require, verify-ca, or verify-full."
        );
      }
    }
  } catch {
    issues.push("RWOS_TEST_DATABASE_URL must be a valid PostgreSQL URL.");
  }
  return issues;
}
