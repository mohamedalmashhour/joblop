import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createPrismaClient } from "@rwos/database";

async function main() {
  const seed = JSON.parse(readFileSync("local-stack-seed.json", "utf8"));
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("JOB_SEED_FAIL no DATABASE_URL"); process.exit(1); }
  const c = createPrismaClient(url);
  const org = await c.employerOrganization.findUnique({ where: { id: seed.orgAId } });
  const employer = await c.user.findFirst({ where: { emailNormalized: { contains: "employer-a" } } });
  const residence = await c.residence.findFirst({ where: { name: { contains: "Sunrise of Oak Hill" } } });
  const dept = await c.department.findFirst({ where: { residenceId: residence.id } });
  const wg = await c.workGroup.findFirst({ orderBy: { createdAt: "desc" } });
  const role = await c.roleDefinition.findFirst({ where: { workGroupId: wg.id }, orderBy: { createdAt: "desc" } });
  const uid = employer?.id ?? org.createdByUserId;
  const now = new Date();
  const jr = await c.jobRequest.create({
    data: {
      jobRequestNumber: `JR-2026-${String(Math.floor(Math.random()*900000)+100000)}`,
      organizationId: org.id, residenceId: residence.id, departmentId: dept.id,
      workGroupId: wg.id, roleDefinitionId: role.id,
      creatorUserId: uid, createdByUserId: uid,
      title: "Evening PSW care shift — Floor 1",
      description: "Evening coverage on the care floor.",
      numberOfWorkers: 2, urgency: "normal", requestType: "single_day",
      timezone: "America/Toronto",
      startAt: new Date("2026-10-20T13:00:00Z"), endAt: new Date("2026-10-20T21:00:00Z"),
      status: "approved_for_dispatch", submittedAt: now
    }
  });
  // Immutable pricing snapshot so the Control Room shows a real settlement ledger.
  // Employer rate 3000/h; worker = rate*(1-0.2); 20% platform margin.
  const contract = await c.employerContract.findFirst({ where: { organizationId: org.id, status: "active" }, orderBy: { createdAt: "desc" } });
  try {
    await c.requestPricingSnapshot.create({
      data: {
        jobRequestId: jr.id,
        organizationId: org.id,
        contractId: contract?.id ?? jr.id,
        contractVersion: contract?.version ?? "v1",
        currency: "CAD",
        marginPpm: 200000,
        employerHourlyRateMinor: 3000,
        workerHourlyRateMinor: 2400,
        platformHourlyMarginMinor: 600,
        capturedByUserId: uid
      }
    });
    console.log("PRICING_SNAPSHOT_SEED_OK");
  } catch (e) { console.log("PRICING_SNAPSHOT_SEED_SKIP", String(e).slice(0,120)); }

  await c.$disconnect();
  console.log("JOB_SEED_OK " + JSON.stringify({ id: jr.id, number: jr.jobRequestNumber, status: jr.status }));
}
main().catch((e) => { console.error("JOB_SEED_FAIL", e); process.exit(1); });
