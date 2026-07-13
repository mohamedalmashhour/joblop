import { getRuntimeConfig } from "@rwos/config";

export function getDatabaseShellStatus() {
  const config = getRuntimeConfig();

  return {
    configured: config.hasDatabaseUrl,
    migrationsAuthorized: false,
    businessSchemaAuthorized: false
  } as const;
}
