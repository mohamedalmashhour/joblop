import {
  isFullReleaseSha,
  isImmutableExternalIdentity,
  readApprovedPostgresTlsMode
} from "./evidence-policy";

export const stagingConfirmation = "authorized-staging-validation";

export type StagingValidationEnvironment = Readonly<Record<string, string | undefined>>;
export type MigrationStateRow = Readonly<{
  migration_name: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
}>;

export function isMigrationStateComplete(
  localMigrations: readonly string[],
  migrationRows: readonly MigrationStateRow[]
) {
  const applied = new Set(
    migrationRows
      .filter((row) => row.finished_at && !row.rolled_back_at)
      .map((row) => row.migration_name)
  );
  const local = new Set(localMigrations);
  const missing = localMigrations.some((migration) => !applied.has(migration));
  const unknownApplied = [...applied].some((migration) => !local.has(migration));
  const incomplete = migrationRows.some((row) => !row.finished_at && !row.rolled_back_at);
  return !missing && !unknownApplied && !incomplete;
}

export function validateStagingEnvironment(env: StagingValidationEnvironment) {
  const issues: string[] = [];
  const required = [
    "RWOS_RELEASE_SHA",
    "RWOS_STAGING_DATABASE_CLUSTER_ID",
    "RWOS_PRODUCTION_DATABASE_CLUSTER_ID",
    "DATABASE_URL",
    "INTERNAL_API_ORIGIN",
    "AUTH_RATE_LIMITER_ORIGIN",
    "AUTH_RATE_LIMITER_TOKEN",
    "AUTH_RATE_LIMITER_KEY_SECRET",
    "AUTH_RATE_LIMITER_KEY_ID",
    "AUTH_RATE_LIMITER_NAMESPACE",
    "AUTH_LIMITER_AUTH_MODE",
    "AUTH_LIMITER_AUDIENCE",
    "AUTH_LIMITER_API_SERVICE_ACCOUNT",
    "CANDIDATE_SOURCE_ORIGIN",
    "CANDIDATE_SOURCE_TOKEN",
    "CANDIDATE_ADAPTER_AUTH_MODE",
    "CANDIDATE_ADAPTER_AUDIENCE",
    "CANDIDATE_ADAPTER_API_SERVICE_ACCOUNT",
    "OFFER_DELIVERY_ORIGIN",
    "OFFER_DELIVERY_TOKEN",
    "OFFER_DELIVERY_ADAPTER_AUTH_MODE",
    "OFFER_DELIVERY_ADAPTER_AUDIENCE",
    "OFFER_DELIVERY_ADAPTER_API_SERVICE_ACCOUNT",
    "SECRET_MANAGER_PROVIDER",
    "MONITORING_HEALTHCHECK_URL",
    "PAGING_HEALTHCHECK_URL"
  ] as const;

  if (env.RWOS_ENV !== "production") issues.push("RWOS_ENV must be production.");
  if (env.NODE_ENV !== "production") issues.push("NODE_ENV must be production.");
  if (env.RWOS_STAGING_VALIDATION_CONFIRMATION !== stagingConfirmation) {
    issues.push(`RWOS_STAGING_VALIDATION_CONFIRMATION must equal ${stagingConfirmation}.`);
  }
  for (const key of required) {
    if (!env[key]?.trim()) issues.push(`${key} is required.`);
  }
  if (env.RWOS_RELEASE_SHA && !isFullReleaseSha(env.RWOS_RELEASE_SHA)) {
    issues.push("RWOS_RELEASE_SHA must be a full lowercase 40-character Git commit SHA.");
  }
  for (const key of [
    "RWOS_STAGING_DATABASE_CLUSTER_ID",
    "RWOS_PRODUCTION_DATABASE_CLUSTER_ID"
  ] as const) {
    if (env[key] && !isImmutableExternalIdentity(env[key])) {
      issues.push(`${key} must be an immutable provider-qualified identity.`);
    }
  }
  if (
    env.RWOS_STAGING_DATABASE_CLUSTER_ID?.trim() &&
    env.RWOS_STAGING_DATABASE_CLUSTER_ID.trim() === env.RWOS_PRODUCTION_DATABASE_CLUSTER_ID?.trim()
  ) {
    issues.push("The staging and production database cluster identifiers must differ.");
  }

  for (const key of [
    "INTERNAL_API_ORIGIN",
    "AUTH_RATE_LIMITER_ORIGIN",
    "CANDIDATE_SOURCE_ORIGIN",
    "OFFER_DELIVERY_ORIGIN",
    "MONITORING_HEALTHCHECK_URL",
    "PAGING_HEALTHCHECK_URL"
  ] as const) {
    const value = env[key];
    if (value && !isHttps(value)) issues.push(`${key} must use HTTPS.`);
  }

  const databaseUrl = env.DATABASE_URL;
  if (databaseUrl) {
    try {
      const parsed = new URL(databaseUrl);
      if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
        issues.push("DATABASE_URL must use PostgreSQL.");
      }
      const databaseName = parsed.pathname.replace(/^\/+/, "").toLowerCase();
      if (!/(staging|stage|validation|test)/.test(databaseName)) {
        issues.push("DATABASE_URL must name an explicit staging, validation, or test database.");
      }
      if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(parsed.hostname)) {
        issues.push("DATABASE_URL must not use localhost for target staging validation.");
      }
      if (!readApprovedPostgresTlsMode(parsed)) {
        issues.push(
          "DATABASE_URL must require TLS with sslmode=require, verify-ca, or verify-full."
        );
      }
    } catch {
      issues.push("DATABASE_URL must be a valid PostgreSQL URL.");
    }
  }

  if (
    env.AUTH_RATE_LIMITER_TOKEN &&
    env.AUTH_RATE_LIMITER_KEY_SECRET &&
    env.AUTH_RATE_LIMITER_TOKEN === env.AUTH_RATE_LIMITER_KEY_SECRET
  ) {
    issues.push("AUTH_RATE_LIMITER_TOKEN and AUTH_RATE_LIMITER_KEY_SECRET must be distinct.");
  }
  for (const key of [
    "AUTH_LIMITER_AUTH_MODE",
    "CANDIDATE_ADAPTER_AUTH_MODE",
    "OFFER_DELIVERY_ADAPTER_AUTH_MODE"
  ] as const) {
    if (env[key] && !["dual-required", "iam-application"].includes(env[key])) {
      issues.push(`${key} must require IAM and application authorization.`);
    }
  }
  for (const key of [
    "AUTH_LIMITER_AUDIENCE",
    "CANDIDATE_ADAPTER_AUDIENCE",
    "OFFER_DELIVERY_ADAPTER_AUDIENCE"
  ] as const) {
    if (env[key] && (!isHttps(env[key]) || !env[key].endsWith(".run.app"))) {
      issues.push(`${key} must be an exact HTTPS Cloud Run audience.`);
    }
  }

  return issues;
}

function isHttps(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
