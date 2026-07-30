import { randomUUID } from "node:crypto";
import { createPrismaClient } from "@rwos/database";
import {
  createFirstAdminBootstrapService,
  createPrismaFirstAdminBootstrapRepository
} from "../apps/api/src/firstAdminBootstrap";

const env = process.env;
const prisma = createPrismaClient(env.DATABASE_URL);
const expiresAt = env.RWOS_ADMIN_BOOTSTRAP_SECRET_EXPIRES_AT
  ? new Date(env.RWOS_ADMIN_BOOTSTRAP_SECRET_EXPIRES_AT)
  : null;

try {
  const service = createFirstAdminBootstrapService(
    createPrismaFirstAdminBootstrapRepository(prisma),
    {
      enabled: env.RWOS_ADMIN_BOOTSTRAP_ENABLED === "enabled",
      environment: env.RWOS_ENV ?? "",
      releaseSha: env.RWOS_RELEASE_SHA ?? "",
      configuredSecret: env.RWOS_ADMIN_BOOTSTRAP_SECRET,
      expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null
    }
  );
  const result = await service.bootstrap({
    presentedSecret: env.RWOS_ADMIN_BOOTSTRAP_SECRET,
    email: env.RWOS_ADMIN_BOOTSTRAP_EMAIL ?? "",
    displayName: env.RWOS_ADMIN_BOOTSTRAP_DISPLAY_NAME ?? "",
    password: env.RWOS_ADMIN_BOOTSTRAP_INITIAL_PASSWORD ?? "",
    correlationId: `first_admin_${randomUUID()}`
  });
  process.stdout.write(`FIRST_ADMIN_BOOTSTRAP_${result.outcome.toUpperCase()}\n`);
  if (result.outcome !== "created") process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
