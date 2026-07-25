import { getRuntimeConfig } from "@rwos/config";

export {
  developmentWorkGroups,
  phase01AccessRoles,
  phase01PermissionKeys,
  type DevelopmentRoleDefinition,
  type DevelopmentWorkGroup
} from "./catalogue";
export { createPrismaClient, getDatabaseFoundationStatus, PrismaClient, type Prisma } from "./foundation";

export function getDatabaseShellStatus() {
  const config = getRuntimeConfig();

  return {
    configured: config.hasDatabaseUrl,
    migrationsAuthorized: true,
    businessSchemaAuthorized: true
  } as const;
}
