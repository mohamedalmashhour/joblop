import {
  isFullReleaseSha,
  isImmutableExternalIdentity,
  readApprovedPostgresTlsMode
} from "./evidence-policy";

export const productionDiagnosticConfirmation = "authorized-read-only-production-diagnostic";

export type ProductionDiagnosticEnvironment = Readonly<Record<string, string | undefined>>;

export function validateProductionDiagnosticEnvironment(env: ProductionDiagnosticEnvironment) {
  const issues: string[] = [];
  const required = [
    "RWOS_PRODUCTION_DATABASE_URL",
    "RWOS_PRODUCTION_DATABASE_CLUSTER_ID",
    "RWOS_PRODUCTION_BASELINE_PATH",
    "RWOS_RELEASE_SHA"
  ] as const;

  for (const key of required) {
    if (!env[key]?.trim()) issues.push(`${key} is required.`);
  }
  if (env.RWOS_PRODUCTION_DIAGNOSTIC_CONFIRMATION !== productionDiagnosticConfirmation) {
    issues.push(
      `RWOS_PRODUCTION_DIAGNOSTIC_CONFIRMATION must equal ${productionDiagnosticConfirmation}.`
    );
  }
  if (env.RWOS_PRODUCTION_DATABASE_READ_ONLY !== "confirmed") {
    issues.push("RWOS_PRODUCTION_DATABASE_READ_ONLY must equal confirmed.");
  }
  if (env.RWOS_RELEASE_SHA && !isFullReleaseSha(env.RWOS_RELEASE_SHA)) {
    issues.push("RWOS_RELEASE_SHA must be a full lowercase 40-character Git commit SHA.");
  }
  if (
    env.RWOS_PRODUCTION_DATABASE_CLUSTER_ID &&
    !isImmutableExternalIdentity(env.RWOS_PRODUCTION_DATABASE_CLUSTER_ID)
  ) {
    issues.push(
      "RWOS_PRODUCTION_DATABASE_CLUSTER_ID must be an immutable provider-qualified identity."
    );
  }

  if (env.RWOS_PRODUCTION_DATABASE_URL) {
    try {
      const url = new URL(env.RWOS_PRODUCTION_DATABASE_URL);
      if (!["postgres:", "postgresql:"].includes(url.protocol)) {
        issues.push("RWOS_PRODUCTION_DATABASE_URL must use PostgreSQL.");
      }
      if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(url.hostname)) {
        issues.push("RWOS_PRODUCTION_DATABASE_URL must not use localhost.");
      }
      const databaseName = url.pathname.replace(/^\/+/, "").toLowerCase();
      if (!databaseName || /(staging|stage|validation|test|rehearsal)/.test(databaseName)) {
        issues.push("RWOS_PRODUCTION_DATABASE_URL must identify a production database.");
      }
      if (!readApprovedPostgresTlsMode(url)) {
        issues.push(
          "RWOS_PRODUCTION_DATABASE_URL must require TLS with sslmode=require, verify-ca, or verify-full."
        );
      }
    } catch {
      issues.push("RWOS_PRODUCTION_DATABASE_URL must be a valid PostgreSQL URL.");
    }
  }

  return issues;
}

export type DatabaseInventory = Readonly<{
  columns: readonly Readonly<{
    schema: string;
    table: string;
    column: string;
    dataType: string;
  }>[];
  foreignKeys: readonly Readonly<{
    schema: string;
    table: string;
    column: string;
    referencedSchema: string;
    referencedTable: string;
    referencedColumn: string;
    sourceType: string;
    targetType: string;
  }>[];
  migrations: readonly Readonly<{
    name: string;
    finished: boolean;
    rolledBack: boolean;
  }>[];
  objects: readonly Readonly<{
    schema: string;
    name: string;
    type: string;
  }>[];
}>;

export function normalizeDatabaseInventory(inventory: DatabaseInventory): DatabaseInventory {
  const byJson = <T>(values: readonly T[]) =>
    [...values].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return {
    columns: byJson(inventory.columns),
    foreignKeys: byJson(inventory.foreignKeys),
    migrations: byJson(inventory.migrations),
    objects: byJson(inventory.objects)
  };
}

export function compareDatabaseInventory(
  approvedBaseline: DatabaseInventory,
  observed: DatabaseInventory
) {
  const issues: string[] = [];
  const baseline = normalizeDatabaseInventory(approvedBaseline);
  const actual = normalizeDatabaseInventory(observed);

  for (const key of ["columns", "foreignKeys", "migrations", "objects"] as const) {
    if (JSON.stringify(baseline[key]) !== JSON.stringify(actual[key])) {
      issues.push(`Production ${key} do not match the approved development baseline.`);
    }
  }
  for (const foreignKey of actual.foreignKeys) {
    if (foreignKey.sourceType !== foreignKey.targetType) {
      issues.push(
        `Incompatible foreign-key types: ${foreignKey.schema}.${foreignKey.table}.${foreignKey.column}.`
      );
    }
  }
  if (actual.migrations.some((migration) => !migration.finished || migration.rolledBack)) {
    issues.push("Production migration state contains an incomplete or rolled-back migration.");
  }
  return issues;
}
