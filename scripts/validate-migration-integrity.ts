import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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
      )
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
