// Supplementary LOCAL seed: gives Org A an active residence + department + work group + role
// so the employer "Create staffing request" form can load its choices and post a job.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createPrismaClient } from "@rwos/database";

const seed = JSON.parse(readFileSync("local-stack-seed.json", "utf8"));
const orgAId: string = seed.orgAId;
const url = process.env.DATABASE_URL;
if (!url) { console.error("EXTRA_SEED_FAIL no DATABASE_URL"); process.exit(1); }
const prisma = createPrismaClient(url);

async function main() {
  const residence = await prisma.residence.create({ data: {
    publicId: `RES-A-${randomUUID().slice(0, 8)}`,
    organizationId: orgAId,
    name: "Sunrise of Oak Hill — Main Residence",
    status: "active",
    addressSummary: "123 Test Avenue, Laval QC",
    city: "Laval", region: "QC", country: "CA", province: "QC"
  }});
  const department = await prisma.department.create({ data: {
    publicId: `DEP-A-${randomUUID().slice(0, 8)}`,
    organizationId: orgAId,
    residenceId: residence.id,
    name: "Care Floor 1",
    status: "active"
  }});
  const wg = await prisma.workGroup.create({ data: {
    key: `wg_care_${randomUUID().slice(0, 6)}`,
    displayLabel: "Personal Support / Care",
    status: "active",
    displayOrder: 10
  }});
  const role = await prisma.roleDefinition.create({ data: {
    workGroupId: wg.id,
    key: `role_psw_${randomUUID().slice(0, 6)}`,
    displayLabel: "Personal Support Worker (PSW)",
    status: "active",
    displayOrder: 10
  }});
  console.log("EXTRA_SEED_OK", JSON.stringify({ residence: residence.id, department: department.id, workGroup: wg.id, role: role.id }));
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error("EXTRA_SEED_FAIL", e); process.exit(1); });
