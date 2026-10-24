// Supplementary LOCAL seed: gives Org A an ACTIVE employer contract that prices the seeded role,
// so a staffing request can actually be submitted (clears "contract does not price this role").
import { readFileSync } from "node:fs";
import { createPrismaClient } from "@rwos/database";

const seed = JSON.parse(readFileSync("local-stack-seed.json", "utf8"));
const orgAId: string = seed.orgAId;
const url = process.env.DATABASE_URL;
if (!url) { console.error("CONTRACT_SEED_FAIL no DATABASE_URL"); process.exit(1); }
const prisma = createPrismaClient(url);

async function main() {
  const org = await prisma.employerOrganization.findUnique({ where: { id: orgAId } });
  if (!org) throw new Error("org A not found");
  const wg = await prisma.workGroup.findFirst({ orderBy: { createdAt: "desc" } });
  if (!wg) throw new Error("no work group");
  const role = await prisma.roleDefinition.findFirst({ where: { workGroupId: wg.id }, orderBy: { createdAt: "desc" } });
  if (!role) throw new Error("no role");
  const now = new Date();
  // supersede any existing active contracts first (keeps the unique timeline clean)
  await prisma.employerContract.updateMany({ where: { organizationId: orgAId, status: "active" }, data: { status: "superseded" } });
  const contract = await prisma.employerContract.create({
    data: {
      organizationId: orgAId,
      version: `v-${now.getTime()}`,
      status: "active",
      currency: "CAD",
      signedByUserId: org.createdByUserId,
      signedAt: now,
      activatedAt: now,
      effectiveFrom: now,
      createdByUserId: org.createdByUserId!,
      roleRates: { create: [{ workGroupId: wg.id, roleDefinitionId: role.id, hourlyRateMinor: 3000 }] }
    },
    include: { roleRates: true }
  });
  console.log("CONTRACT_SEED_OK", JSON.stringify({ contract: contract.id, role: role.id, rateMinor: 3000 }));
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error("CONTRACT_SEED_FAIL", e); process.exit(1); });
