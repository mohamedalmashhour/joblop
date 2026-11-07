import { normalizeEmail } from "@rwos/auth";
import { createPrismaClient } from "@rwos/database";
import { setStaffPhone } from "../apps/api/src/staffPhoneSignIn";

async function main() {
  const prisma = createPrismaClient(process.env.DATABASE_URL);
  try {
    const outcome = await setStaffPhone(prisma, {
      email: normalizeEmail(process.env.RWOS_STAFF_EMAIL ?? ""),
      phone: process.env.RWOS_STAFF_PHONE
    });
    // Prints only the outcome.
    process.stdout.write(`${outcome}\n`);
    process.exitCode = outcome === "saved" ? 0 : 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
