import { createPrismaClient } from "@rwos/database";
import { grantFirstStaffAdmin } from "../apps/api/src/firstStaffAdminGrant";

const env = process.env;
const prisma = createPrismaClient(env.DATABASE_URL);

try {
  const outcome = await grantFirstStaffAdmin(prisma, {
    email: env.RWOS_FIRST_STAFF_ADMIN_EMAIL ?? "",
    environment: env.RWOS_ENV ?? "",
    releaseSha: env.RWOS_RELEASE_SHA ?? env.RENDER_GIT_COMMIT ?? "",
    now: new Date()
  });
  // Prints only the outcome, never the email.
  process.stdout.write(`${outcome}\n`);
  process.exitCode = outcome === "granted" ? 0 : 1;
} finally {
  await prisma.$disconnect();
}
