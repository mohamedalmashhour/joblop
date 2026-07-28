export const rehearsalConfirmation = "restore-to-disposable-database";

export function validateDatabaseRehearsalInput(input: {
  sourceDatabaseUrl: string | undefined;
  targetDatabaseUrl: string | undefined;
  targetIdentity: string | undefined;
  confirmation: string | undefined;
}) {
  if (input.confirmation !== rehearsalConfirmation) {
    throw new Error("RWOS_DATABASE_REHEARSAL_CONFIRMATION_REQUIRED");
  }
  const source = parsePostgresUrl(input.sourceDatabaseUrl, "SOURCE");
  const target = parsePostgresUrl(input.targetDatabaseUrl, "TARGET");
  if (source.href === target.href) throw new Error("RWOS_DATABASE_REHEARSAL_TARGET_EQUALS_SOURCE");
  const targetDatabase = target.pathname.slice(1).toLowerCase();
  if (!/(?:^|[_-])(rehearsal|restore[_-]?test)(?:$|[_-])/.test(targetDatabase)) {
    throw new Error("RWOS_DATABASE_REHEARSAL_DISPOSABLE_TARGET_REQUIRED");
  }
  if (input.targetIdentity !== databaseIdentity(target)) {
    throw new Error("RWOS_DATABASE_REHEARSAL_TARGET_IDENTITY_MISMATCH");
  }
  return { source, target };
}

export function databaseIdentity(databaseUrl: URL) {
  return `${databaseUrl.hostname.toLowerCase()}/${decodeURIComponent(databaseUrl.username)}/${databaseUrl.pathname.slice(1)}`;
}

function parsePostgresUrl(value: string | undefined, label: string) {
  if (!value) throw new Error(`RWOS_DATABASE_REHEARSAL_${label}_URL_REQUIRED`);
  const parsed = new URL(value);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error(`RWOS_DATABASE_REHEARSAL_${label}_POSTGRES_REQUIRED`);
  }
  if (!parsed.hostname || parsed.pathname.length <= 1) {
    throw new Error(`RWOS_DATABASE_REHEARSAL_${label}_URL_INVALID`);
  }
  return parsed;
}
