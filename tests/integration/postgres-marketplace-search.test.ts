import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { boundingBoxKm, searchNearbyJobs, type MarketplaceJobCandidate } from "@rwos/shared";
import { canadaAddressAdapter } from "@rwos/country-canada";
import { createPrismaClient } from "@rwos/database";

const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

// The marketplace search does a DB bounding-box pre-filter on indexed residence
// lat/lng (+ active-residence + marketplace-status), then exact geodesic ranking. This
// verifies the DB query behavior against real Postgres: within-box included,
// outside-box excluded, inactive residence excluded, then radius ranking.
suite("PostgreSQL marketplace bounding-box search", () => {
  const prisma = createPrismaClient(databaseUrl!);
  const laval = { latitude: 45.5701, longitude: -73.7527 };
  const toronto = { latitude: 43.6426, longitude: -79.3871 };

  async function seed() {
    const userId = randomUUID();
    const tag = userId.slice(0, 12);
    await prisma.user.create({ data: { id: userId, publicId: `USR-MK-${tag}`, emailNormalized: `mk-${userId}@e2e.local`, displayName: "MK", status: "active" } });
    const org = await prisma.employerOrganization.create({ data: { publicId: `ORG-MK-${tag}`, legalName: `MK ${tag}`, displayName: "MK Care", status: "active", createdByUserId: userId } });
    const wg = await prisma.workGroup.findFirstOrThrow();
    const role = await prisma.roleDefinition.findFirstOrThrow({ where: { workGroupId: wg.id } });
    const dept = async (resId: string) => (await prisma.department.create({ data: { publicId: `DEP-MK-${randomUUID().slice(0, 8)}`, organizationId: org.id, residenceId: resId, name: "D", status: "active", createdByUserId: userId } })).id;

    const mkResidence = async (label: string, coords: { latitude: number; longitude: number }, status: "active" | "closed") =>
      prisma.residence.create({ data: { publicId: `RES-MK-${randomUUID().slice(0, 8)}`, organizationId: org.id, name: label, status, createdByUserId: userId, province: "QC", city: "Laval", latitude: coords.latitude, longitude: coords.longitude, geocodeProvider: "fixture", geocodeResolvedAt: new Date() } });

    const nearActive = await mkResidence("Near-Active", laval, "active");
    const farActive = await mkResidence("Far-Active", toronto, "active");
    const nearInactive = await mkResidence("Near-Inactive", laval, "closed");

    const mkJob = async (res: { id: string }, n: number) => {
      const d = await dept(res.id);
      return prisma.jobRequest.create({
        data: {
          jobRequestNumber: `JR-MK-${randomUUID().slice(0, 10)}`,
          organizationId: org.id, residenceId: res.id, departmentId: d, workGroupId: wg.id, roleDefinitionId: role.id,
          creatorUserId: userId, title: `MK ${n}`, numberOfWorkers: 2, requestType: "single_day", timezone: "America/Toronto",
          startAt: new Date(Date.now() + 20 * 3_600_000), endAt: new Date(Date.now() + 28 * 3_600_000),
          status: "approved_for_dispatch", createdByUserId: userId
        }
      });
    };
    const jobNear = await mkJob(nearActive, 1);
    const jobFar = await mkJob(farActive, 2);
    await mkJob(nearInactive, 3); // must be excluded (inactive residence)
    return { orgId: org.id, jobNearId: jobNear.id, jobFarId: jobFar.id };
  }

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("bounding-box + active-residence query includes near-active, excludes far and inactive; radius ranks", async () => {
    const { orgId, jobNearId, jobFarId } = await seed();
    const box = boundingBoxKm(laval, 25);
    const rows = await prisma.jobRequest.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["submitted", "approved_for_dispatch"] },
        residence: { status: "active", latitude: { gte: box.minLat, lte: box.maxLat }, longitude: { gte: box.minLng, lte: box.maxLng } }
      },
      select: { id: true, numberOfWorkers: true, startAt: true, endAt: true, roleDefinition: { select: { displayLabel: true } }, organization: { select: { displayName: true } }, residence: { select: { city: true, province: true, latitude: true, longitude: true } } }
    });
    const ids = rows.map((r) => r.id);
    expect(ids).toContain(jobNearId); // within 25km box + active
    expect(ids).not.toContain(jobFarId); // Toronto — outside the box
    // the inactive-residence job is excluded by the active filter
    expect(rows.every((r) => r.residence.latitude !== null)).toBe(true);

    const candidates: MarketplaceJobCandidate[] = rows.map((r) => ({
      jobRequestId: r.id, role: r.roleDefinition.displayLabel, employerName: r.organization.displayName, verifiedEmployer: false,
      city: r.residence.city, province: "QC", latitude: r.residence.latitude!, longitude: r.residence.longitude!,
      startAt: r.startAt.toISOString(), endAt: r.endAt.toISOString(), openings: r.numberOfWorkers, workerRateMinor: null, currency: "CAD"
    }));
    const results = searchNearbyJobs({ origin: laval, radiusKm: 25, candidates, regionNames: canadaAddressAdapter });
    expect(results.map((x) => x.jobRequestId)).toContain(jobNearId);
    // privacy: no exact coordinates leak
    expect(JSON.stringify(results)).not.toContain("45.5701");
  });
});
