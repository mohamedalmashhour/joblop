import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Destructive migrations are blocked by default. Entries here are explicitly human-reviewed and
// justified. Adding a migration to this set is itself the review record and must be scrutinized.
const reviewedDestructiveMigrations = new Set<string>([
  // Drops the audit_events.organization_id -> employer_organizations foreign key. audit_events are
  // append-only (BEFORE UPDATE/DELETE triggers), so the ON DELETE SET NULL made deleting an
  // organization impossible. organization_id is kept as an immutable snapshot column; no data is
  // dropped and no row is deleted by this migration.
  "20260807000000_drop_audit_event_organization_fk",
  // ALTER COLUMN ... DROP DEFAULT only, on payroll_worked_time_references columns (HR-5.1). This is
  // the standard "add NOT NULL column with a temporary default -> backfill existing rows -> drop the
  // default so future inserts must supply the value" pattern. No column is dropped, no row is
  // deleted, no existing data is altered — only the column's future-insert default is removed.
  "20260811140000_payroll_rate_snapshots",
  // ALTER COLUMN "family_root_id" DROP DEFAULT on payroll_calculations (HR-5.1 corrections). Same
  // backfill-then-drop-default pattern; the zero-UUID default is removed after each calculation's
  // family root is set. No data loss, no column/table drop, no row deletion.
  "20260811150000_payroll_corrections",
  // Stage 2b.3c-B: ALTER COLUMN "currency" DROP DEFAULT on employer_contracts,
  // employer_cancellation_obligations, and payroll_worked_time_references. Removes the redundant
  // legacy DEFAULT 'CAD' now that the governed runtime always supplies an explicit currency
  // (active-country-currency policy). Columns stay NOT NULL; no replacement default; no column/table
  // drop, no row deletion, no existing data altered — only the future-insert default is removed.
  "20260812000000_drop_legacy_cad_defaults"
]);

void main();

async function main() {
  const migrationsDirectory = join(process.cwd(), "packages", "database", "prisma", "migrations");
  const expected = JSON.parse(
    await readFile(join(migrationsDirectory, "checksums.json"), "utf8")
  ) as Record<string, string>;
  const entries = (await readdir(migrationsDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const repositoryMigrationPath = "packages/database/prisma/migrations";
  const { stdout: committedChanges } = await execFileAsync("git", [
    "diff",
    "--name-status",
    "HEAD",
    "--",
    repositoryMigrationPath
  ]);
  for (const line of committedChanges.split("\n").filter(Boolean)) {
    const [status, path] = line.split(/\s+/, 2);
    if (
      status !== "A" &&
      path?.startsWith(`${repositoryMigrationPath}/`) &&
      path.endsWith("/migration.sql")
    ) {
      throw new Error(`RWOS_COMMITTED_MIGRATION_HISTORY_CHANGED:${path}`);
    }
  }

  if (entries.length !== Object.keys(expected).length) {
    throw new Error("RWOS_MIGRATION_CHECKSUM_MANIFEST_OUT_OF_DATE");
  }

  for (const migration of entries) {
    if (!/^\d{14}_[a-z0-9_]+$/.test(migration)) {
      throw new Error(`RWOS_MIGRATION_NAME_INVALID:${migration}`);
    }
    const sql = await readFile(join(migrationsDirectory, migration, "migration.sql"), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    if (expected[migration] !== checksum) {
      throw new Error(`RWOS_APPLIED_MIGRATION_CHANGED:${migration}`);
    }
    if (
      /\b(?:DROP\s+(?:TABLE|COLUMN|CONSTRAINT|INDEX|TYPE|DATABASE)|TRUNCATE|DELETE\s+FROM|ALTER\s+COLUMN|RENAME\s+(?:TO|COLUMN))\b/i.test(
        sql
      ) &&
      !reviewedDestructiveMigrations.has(migration)
    ) {
      throw new Error(`RWOS_DESTRUCTIVE_MIGRATION_REQUIRES_REVIEW:${migration}`);
    }
  }

  const lock = await readFile(join(migrationsDirectory, "migration_lock.toml"), "utf8");
  if (!/provider\s*=\s*"postgresql"/.test(lock)) {
    throw new Error("RWOS_MIGRATION_PROVIDER_LOCK_INVALID");
  }

  console.log("MIGRATION_INTEGRITY_VALIDATION_PASS");
}
