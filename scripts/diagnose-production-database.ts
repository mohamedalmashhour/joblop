import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { createPrismaClient } from "@rwos/database";

import {
  compareDatabaseInventory,
  normalizeDatabaseInventory,
  type DatabaseInventory,
  validateProductionDiagnosticEnvironment
} from "./production-db-diagnostic-policy";

void main();

async function main() {
  const issues = validateProductionDiagnosticEnvironment(process.env);
  if (issues.length) {
    for (const issue of issues) process.stderr.write(`PRODUCTION_DIAGNOSTIC_ERROR: ${issue}\n`);
    process.exit(1);
  }

  const baseline = JSON.parse(
    await readFile(process.env.RWOS_PRODUCTION_BASELINE_PATH!, "utf8")
  ) as DatabaseInventory;
  const client = createPrismaClient(process.env.RWOS_PRODUCTION_DATABASE_URL);
  let inventory: DatabaseInventory;

  try {
    await client.$executeRawUnsafe("BEGIN TRANSACTION READ ONLY");
    const readOnly = await client.$queryRawUnsafe<Array<{ transaction_read_only: string }>>(
      "SHOW transaction_read_only"
    );
    if (readOnly[0]?.transaction_read_only !== "on") {
      throw new Error("RWOS_PRODUCTION_DIAGNOSTIC_NOT_READ_ONLY");
    }

    const [columns, foreignKeys, migrations, objects] = await Promise.all([
      client.$queryRawUnsafe<DatabaseInventory["columns"]>(`
        SELECT table_schema AS "schema", table_name AS "table", column_name AS "column",
               data_type AS "dataType"
        FROM information_schema.columns
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      `),
      client.$queryRawUnsafe<DatabaseInventory["foreignKeys"]>(`
        SELECT ns.nspname AS "schema", source.relname AS "table", source_col.attname AS "column",
               target_ns.nspname AS "referencedSchema", target.relname AS "referencedTable",
               target_col.attname AS "referencedColumn",
               format_type(source_col.atttypid, source_col.atttypmod) AS "sourceType",
               format_type(target_col.atttypid, target_col.atttypmod) AS "targetType"
        FROM pg_constraint constraint_row
        JOIN pg_class source ON source.oid = constraint_row.conrelid
        JOIN pg_namespace ns ON ns.oid = source.relnamespace
        JOIN pg_class target ON target.oid = constraint_row.confrelid
        JOIN pg_namespace target_ns ON target_ns.oid = target.relnamespace
        JOIN LATERAL unnest(constraint_row.conkey) WITH ORDINALITY source_key(attnum, ord) ON TRUE
        JOIN LATERAL unnest(constraint_row.confkey) WITH ORDINALITY target_key(attnum, ord)
          ON target_key.ord = source_key.ord
        JOIN pg_attribute source_col ON source_col.attrelid = source.oid
          AND source_col.attnum = source_key.attnum
        JOIN pg_attribute target_col ON target_col.attrelid = target.oid
          AND target_col.attnum = target_key.attnum
        WHERE constraint_row.contype = 'f'
      `),
      client.$queryRawUnsafe<DatabaseInventory["migrations"]>(`
        SELECT migration_name AS "name", finished_at IS NOT NULL AS "finished",
               rolled_back_at IS NOT NULL AS "rolledBack"
        FROM "_prisma_migrations"
      `),
      client.$queryRawUnsafe<DatabaseInventory["objects"]>(`
        SELECT table_schema AS "schema", table_name AS "name", table_type AS "type"
        FROM information_schema.tables
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      `)
    ]);
    inventory = normalizeDatabaseInventory({ columns, foreignKeys, migrations, objects });
    await client.$executeRawUnsafe("ROLLBACK");
  } catch (error) {
    await client.$executeRawUnsafe("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await client.$disconnect();
  }

  const comparisonIssues = compareDatabaseInventory(baseline, inventory);
  if (comparisonIssues.length) {
    for (const issue of comparisonIssues) {
      process.stderr.write(`PRODUCTION_DIAGNOSTIC_ERROR: ${issue}\n`);
    }
    process.exit(1);
  }

  const fingerprint = createHash("sha256").update(JSON.stringify(inventory)).digest("hex");
  const url = new URL(process.env.RWOS_PRODUCTION_DATABASE_URL!);
  process.stdout.write(
    JSON.stringify({
      status: "production_database_diagnostic_passed",
      releaseSha: process.env.RWOS_RELEASE_SHA,
      clusterId: process.env.RWOS_PRODUCTION_DATABASE_CLUSTER_ID,
      databaseName: url.pathname.replace(/^\/+/, ""),
      tlsMode: url.searchParams.get("sslmode"),
      inventorySha256: fingerprint,
      counts: {
        columns: inventory.columns.length,
        foreignKeys: inventory.foreignKeys.length,
        migrations: inventory.migrations.length,
        objects: inventory.objects.length
      }
    }) + "\n"
  );
}
