import type { PrismaClient } from "@rwos/database";
import { ownedEntityTypes } from "./manifest";
import { approvedIdentityColumnsForEntity, approvedTableForEntity } from "./mutationPlan";
import type { SqlResult, SqlTransactionExecutor } from "./postgresRepository";

type PrismaQueryPort = Readonly<{
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
}>;

type PrismaTransactionPort = PrismaQueryPort &
  Readonly<{
    $transaction<T>(work: (transaction: PrismaQueryPort) => Promise<T>): Promise<T>;
  }>;

export function createPrismaTransactionExecutor(
  client: Pick<PrismaClient, "$queryRawUnsafe" | "$executeRawUnsafe" | "$transaction">
): SqlTransactionExecutor {
  const port = client as unknown as PrismaTransactionPort;
  return {
    query: (sql, parameters) => execute(port, sql, parameters),
    transaction: (work) =>
      port.$transaction((transaction) =>
        work({
          query: (sql, parameters) => execute(transaction, sql, parameters)
        })
      )
  };
}

async function execute<Row extends Record<string, unknown>>(
  connection: PrismaQueryPort,
  sql: string,
  parameters: readonly unknown[] = []
): Promise<SqlResult<Row>> {
  const policyTag = sql.match(/^\s*\/\*\s*(qa-reset:[a-z0-9:_-]+)\s*\*\//u)?.[1];
  if (
    !policyTag ||
    !approvedPolicyTag(policyTag) ||
    !tablesAllowedForTag(sql, policyTag) ||
    !parametersMatchPlaceholders(sql, parameters) ||
    sql.includes(";") ||
    /\b(?:ALTER|CREATE|DROP|TRUNCATE|GRANT|REVOKE|COPY)\b/iu.test(
      sql.replace(/^\s*\/\*[\s\S]*?\*\//u, "")
    )
  ) {
    throw new Error("RWOS_QA_RESET_SQL_STATEMENT_DENIED");
  }
  const statement = sql
    .replaceAll(/\/\*[\s\S]*?\*\//g, "")
    .trimStart()
    .toUpperCase();
  const statementClass = statement.match(/^[A-Z]+/u)?.[0] ?? "";
  if (
    !statementClassAllowed(policyTag, statementClass) ||
    !boundedStatementShape(policyTag, statement, statementClass)
  ) {
    throw new Error("RWOS_QA_RESET_SQL_STATEMENT_DENIED");
  }
  if (statement.startsWith("SELECT")) {
    const rows = await connection.$queryRawUnsafe<Row[]>(sql, ...parameters);
    return { rows, rowCount: rows.length };
  }
  if (
    !statement.startsWith("INSERT") &&
    !statement.startsWith("UPDATE") &&
    !statement.startsWith("DELETE")
  ) {
    throw new Error("RWOS_QA_RESET_SQL_STATEMENT_DENIED");
  }
  const rowCount = await connection.$executeRawUnsafe(sql, ...parameters);
  return { rows: [], rowCount };
}

function parametersMatchPlaceholders(sql: string, parameters: readonly unknown[]) {
  const indexes = [...sql.replace(/^\s*\/\*[\s\S]*?\*\//u, "").matchAll(/\$(\d+)/gu)].map((match) =>
    Number(match[1])
  );
  if (indexes.some((index) => !Number.isInteger(index) || index < 1)) return false;
  const unique = [...new Set(indexes)].sort((left, right) => left - right);
  if (unique.length === 0) return parameters.length === 0;
  const maximum = unique.at(-1)!;
  return (
    maximum === parameters.length &&
    unique.length === maximum &&
    unique.every((value, index) => value === index + 1)
  );
}

function statementClassAllowed(tag: string, statementClass: string) {
  const fixedClasses: Readonly<Record<string, string>> = {
    "qa-reset:advisory-lock": "SELECT",
    "qa-reset:manifest": "SELECT",
    "qa-reset:manifest-inspect": "SELECT",
    "qa-reset:tenants": "SELECT",
    "qa-reset:control": "SELECT",
    "qa-reset:create-control": "INSERT",
    "qa-reset:complete-control": "UPDATE",
    "qa-reset:owned-record": "UPDATE",
    "qa-reset:owned-record-authorize": "SELECT",
    "qa-reset:owned-records-inspect": "SELECT",
    "qa-reset:event": "INSERT"
  };
  const fixed = fixedClasses[tag];
  if (fixed) return statementClass === fixed;
  if (tag.startsWith("qa-reset:entity-cleanup:")) {
    return statementClass === "DELETE" || statementClass === "SELECT";
  }
  if (tag.startsWith("qa-reset:entity-prepare:")) {
    return ["INSERT", "UPDATE", "SELECT"].includes(statementClass);
  }
  return false;
}

function boundedStatementShape(tag: string, statement: string, statementClass: string) {
  if (
    tag === "qa-reset:advisory-lock" &&
    !/^SELECT\s+PG_ADVISORY_XACT_LOCK\(HASHTEXTEXTENDED\(\$1,\s*0\)\)::TEXT\s+AS\s+LOCK_RESULT$/u.test(
      statement.trim()
    )
  ) {
    return false;
  }
  if (
    tag === "qa-reset:event" &&
    !/^INSERT\s+INTO\s+QA_RESET_CONTROL_EVENTS\s*\(\s*ID,\s*CONTROL_RUN_ID,\s*SEQUENCE,\s*EVENT_TYPE,\s*PRIOR_STATUS,\s*NEW_STATUS,\s*CALLER_ALIAS,\s*CALLER_PRINCIPAL_DIGEST,\s*SAFE_COUNT,\s*CREATED_AT\s*\)\s*VALUES\s*\(\s*\$1,\s*\$2,\s*1,\s*\$3,\s*'RUNNING',\s*\$4,\s*\$5,\s*\$6,\s*\$7,\s*\$8\s*\)$/u.test(
      statement.trim()
    )
  ) {
    return false;
  }
  if (
    ["UPDATE", "DELETE"].includes(statementClass) &&
    (!/\bWHERE\b/u.test(statement) || !/\$\d+/u.test(statement))
  ) {
    return false;
  }
  if (
    statementClass === "INSERT" &&
    (!insertContainsRequiredIdentity(tag, statement) || !/\bVALUES\s*\([^)]*\$\d+/u.test(statement))
  ) {
    return false;
  }
  if (
    tag.startsWith("qa-reset:entity-cleanup:") &&
    statementClass === "DELETE" &&
    !exactCleanupPredicate(tag, statement)
  ) {
    return false;
  }
  if (
    tag.startsWith("qa-reset:entity-cleanup:") &&
    statementClass === "SELECT" &&
    !exactRetainedEvidencePredicate(tag, statement)
  ) {
    return false;
  }
  if (
    tag.startsWith("qa-reset:entity-") &&
    statementClass === "SELECT" &&
    (!/\bWHERE\b/u.test(statement) || !/\$\d+/u.test(statement))
  ) {
    return false;
  }
  return true;
}

function insertContainsRequiredIdentity(tag: string, statement: string) {
  const columns = statement
    .match(/\bINTO\s+"?[A-Z_][A-Z0-9_]*"?\s*\(([^)]*)\)/u)?.[1]
    ?.split(",")
    .map((column) => column.trim().replaceAll('"', ""));
  if (!columns) return false;
  if (!tag.startsWith("qa-reset:entity-prepare:")) return columns.includes("ID");
  const entityType = tag.split(":").at(-1) as (typeof ownedEntityTypes)[number];
  return approvedIdentityColumnsForEntity(entityType).every((column) =>
    columns.includes(column.toUpperCase())
  );
}

function exactCleanupPredicate(tag: string, statement: string) {
  const entityType = tag.split(":").at(-1) as (typeof ownedEntityTypes)[number];
  const expectedColumns = approvedIdentityColumnsForEntity(entityType).map((column) =>
    column.toUpperCase()
  );
  const predicate = statement.match(/\bWHERE\s+([\s\S]+)$/u)?.[1]?.trim();
  if (!predicate || /\b(?:OR|RETURNING|USING)\b/u.test(predicate)) return false;
  const terms = predicate.split(/\s+AND\s+/u);
  return (
    terms.length === expectedColumns.length &&
    terms.every((term, index) => {
      const match = term.match(/^"?([A-Z_][A-Z0-9_]*)"?\s*=\s*\$(\d+)$/u);
      return Boolean(
        match && match[1] === expectedColumns[index] && Number(match[2]) === index + 1
      );
    })
  );
}

const retainedEvidenceColumns: Readonly<Record<string, readonly string[]>> = {
  audit_actor_reference: ["ID", "ACTOR_TYPE", "USER_ID", "ORGANIZATION_ID", "DISPLAY_LABEL"],
  audit_event: [
    "ID",
    "ACTOR_REFERENCE_ID",
    "ORGANIZATION_ID",
    "ENTITY_TYPE",
    "ENTITY_ID",
    "ENTITY_PUBLIC_REFERENCE",
    "ACTION",
    "PRIOR_STATE",
    "NEW_STATE",
    "REASON",
    "SOURCE",
    "CORRELATION_ID",
    "POLICY_VERSION"
  ]
};

function exactRetainedEvidencePredicate(tag: string, statement: string) {
  const entityType = tag.split(":").at(-1)!;
  const expectedColumns = retainedEvidenceColumns[entityType];
  if (!expectedColumns) return false;
  const selection = statement.match(
    /^SELECT\s+ID\s+FROM\s+"?[A-Z_][A-Z0-9_]*"?\s+WHERE\s+([\s\S]+)$/u
  );
  const predicate = selection?.[1]?.trim();
  if (!predicate || /\b(?:OR|JOIN|UNION|RETURNING|USING)\b/u.test(predicate)) return false;
  const terms = predicate.split(/\s+AND\s+/u);
  return (
    terms.length === expectedColumns.length &&
    terms.every((term, index) => {
      const match = term.match(/^"?([A-Z_][A-Z0-9_]*)"?\s+IS\s+NOT\s+DISTINCT\s+FROM\s+\$(\d+)$/u);
      return Boolean(
        match && match[1] === expectedColumns[index] && Number(match[2]) === index + 1
      );
    })
  );
}

const fixedPolicyTags = new Set([
  "qa-reset:advisory-lock",
  "qa-reset:manifest",
  "qa-reset:manifest-inspect",
  "qa-reset:tenants",
  "qa-reset:control",
  "qa-reset:create-control",
  "qa-reset:complete-control",
  "qa-reset:owned-record",
  "qa-reset:owned-record-authorize",
  "qa-reset:owned-records-inspect",
  "qa-reset:event"
]);

function approvedPolicyTag(tag: string) {
  if (fixedPolicyTags.has(tag)) return true;
  const entityMatch = tag.match(/^qa-reset:entity-(?:prepare|cleanup):([a-z_]+)$/u);
  return Boolean(
    entityMatch && ownedEntityTypes.includes(entityMatch[1] as (typeof ownedEntityTypes)[number])
  );
}

function tablesAllowedForTag(sql: string, tag: string) {
  const fixedTables: Readonly<Record<string, readonly string[]>> = {
    "qa-reset:advisory-lock": [],
    "qa-reset:manifest": ["qa_reset_manifest_ownership"],
    "qa-reset:manifest-inspect": ["qa_reset_manifest_ownership"],
    "qa-reset:tenants": ["qa_reset_manifest_tenants"],
    "qa-reset:control": ["qa_reset_control_runs"],
    "qa-reset:create-control": ["qa_reset_control_runs"],
    "qa-reset:complete-control": ["qa_reset_control_runs"],
    "qa-reset:owned-record": ["qa_reset_owned_records"],
    "qa-reset:owned-record-authorize": ["qa_reset_owned_records", "qa_reset_manifest_ownership"],
    "qa-reset:owned-records-inspect": ["qa_reset_owned_records"],
    "qa-reset:event": ["qa_reset_control_events"]
  };
  const entityMatch = tag.match(/^qa-reset:entity-(?:prepare|cleanup):([a-z_]+)$/u);
  const allowed = entityMatch
    ? [approvedTableForEntity(entityMatch[1] as (typeof ownedEntityTypes)[number])]
    : fixedTables[tag];
  if (!allowed) return false;
  const touchedTables = [
    ...sql.matchAll(/\b(?:FROM|INTO|UPDATE|JOIN|USING)\s+"?([a-z_][a-z0-9_]*)"?/giu)
  ].map((match) => match[1]!);
  const actual = [...new Set(touchedTables)].sort();
  const expected = [...allowed].sort();
  return (
    actual.length === expected.length && actual.every((table, index) => table === expected[index])
  );
}
