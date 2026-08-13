// JobLop 10k-user CAPACITY seed — SYNTHETIC / LOCAL ONLY. NOT a production or staging artifact.
//
// Builds a PERSISTENT, deterministic 10,000-user population plus a sign-in-capable actor pool for
// the mixed-workload HTTP load harness (tests/performance/loadHarness.ts). No real PII; `.invalid`
// TLD can never resolve; one shared synthetic password drives the REAL sign-in flow (no auth
// backdoor). Fails closed unless explicitly enabled AND RWOS_ENV is local|test.
//
// Roles: workers get WORKER_ACCESS implicitly via an active worker_identity; employer actors get an
// active OrganizationMembership + ORGANIZATION_OWNER; admin actors get a PlatformAccessGrant to
// PLATFORM_ADMINISTRATOR (which also satisfies payroll authority). Tenant isolation is preserved:
// each worker/employer is bound to exactly one org.
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createPrismaClient } from "@rwos/database";
import { hashPassword, normalizeEmail } from "@rwos/auth";

export const PERF_PASSWORD = "Perf-10k-Synthetic-Pass1";
const RELEASE_SHA = "0".repeat(40);

// Tunable population knobs (defaults sized for a 10k population + up to ~1k concurrency).
const ORGS = Number(process.env.PERF_ORGS ?? 300);
const WORKER_ACTORS = Number(process.env.PERF_WORKER_ACTORS ?? 1200); // sign-in-capable, have offers
const EMPLOYER_ACTORS = Number(process.env.PERF_EMPLOYER_ACTORS ?? 150);
const ADMIN_ACTORS = Number(process.env.PERF_ADMIN_ACTORS ?? 30);
const TOTAL_USERS = Number(process.env.PERF_TOTAL_USERS ?? 10000); // population baseline

function assertPerfSeedEnabled(env: NodeJS.ProcessEnv): void {
  const rwosEnv = env.RWOS_ENV ?? "local";
  if (rwosEnv !== "local" && rwosEnv !== "test") throw new Error("PERF_SEED_ONLY_LOCAL_OR_TEST");
  if (env.RWOS_PERF_SEED !== "enabled") throw new Error("PERF_SEED_NOT_ENABLED");
}

export type PerfActors = {
  password: string;
  workers: { email: string; workerIdentityId: string; orgId: string }[];
  employers: { email: string; orgId: string }[];
  admins: { email: string }[];
  orgs: { id: string; jobId: string; reviewId: string; residenceId: string; departmentId: string; periodId: string }[];
  workGroupId: string;
  roleDefinitionId: string;
};

async function main() {
  assertPerfSeedEnabled(process.env);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL required");
  const prisma = createPrismaClient(databaseUrl);
  const t0 = Date.now();
  try {
    const passwordHash = await hashPassword(PERF_PASSWORD);
    const now = new Date();
    const tag = (process.env.PERF_TAG ?? "p10k").replace(/[^a-z0-9]/gi, "");

    const ownerRole = await prisma.accessRoleDefinition.findFirstOrThrow({ where: { key: "ORGANIZATION_OWNER" } });
    const platformRole = await prisma.accessRoleDefinition.findFirstOrThrow({ where: { key: "PLATFORM_ADMINISTRATOR" } });
    const wg = await prisma.workGroup.findFirstOrThrow();
    const role = await prisma.roleDefinition.findFirstOrThrow({ where: { workGroupId: wg.id } });

    // A bootstrap platform admin to own created rows (createdByUserId).
    const bootEmail = `perf-boot-${tag}@perf.invalid`;
    const boot = await prisma.user.create({
      data: {
        publicId: `usr_${randomUUID().replaceAll("-", "").slice(0, 16)}`,
        emailNormalized: normalizeEmail(bootEmail), displayName: "Perf Boot", status: "active",
        identities: { create: { provider: "local_password", providerSubject: normalizeEmail(bootEmail), passwordHash, passwordUpdatedAt: now, emailVerifiedAt: now } }
      }
    });
    await prisma.platformAccessGrant.create({ data: { userId: boot.id, accessRoleDefinitionId: platformRole.id, releaseSha: RELEASE_SHA, grantedAt: now } });

    // ── Organizations with scope (residence, department, contract, one job + dispatch review, period) ──
    const orgs: PerfActors["orgs"] = [];
    for (let o = 0; o < ORGS; o += 1) {
      const org = await prisma.employerOrganization.create({ data: { publicId: `ORG-${tag}-${o}`, legalName: `Org ${o} Legal`, displayName: `PerfOrg ${o}`, status: "active", createdByUserId: boot.id } });
      const res = await prisma.residence.create({ data: { publicId: `RES-${tag}-${o}`, organizationId: org.id, name: `R${o}`, status: "active", createdByUserId: boot.id, province: "QC", city: "Laval" } });
      const dept = await prisma.department.create({ data: { publicId: `DEP-${tag}-${o}`, organizationId: org.id, residenceId: res.id, name: `D${o}`, status: "active", createdByUserId: boot.id } });
      const job = await prisma.jobRequest.create({ data: { jobRequestNumber: `JR-${tag}-${o}`, organizationId: org.id, residenceId: res.id, departmentId: dept.id, workGroupId: wg.id, roleDefinitionId: role.id, creatorUserId: boot.id, title: `Shift ${o}`, numberOfWorkers: 5, requestType: "single_day", timezone: "America/Toronto", startAt: new Date("2026-08-05T13:00:00Z"), endAt: new Date("2026-08-05T21:00:00Z"), status: "approved_for_dispatch", createdByUserId: boot.id } });
      const review = await prisma.dispatchReview.create({ data: { jobRequestId: job.id, organizationId: org.id, residenceId: res.id, departmentId: dept.id, workGroupId: wg.id, roleDefinitionId: role.id, state: "offer_preparation", priority: "normal", requiredWorkerCount: 5, createdByUserId: boot.id } });
      const cid = randomUUID();
      await prisma.$executeRawUnsafe(`INSERT INTO employer_contracts (id, organization_id, version, status, currency, activated_at, effective_from, created_by_user_id, created_at, updated_at) VALUES ($1,$2,$3,'active','CAD',now(),'2026-07-01T00:00:00Z',$4,now(),now())`, cid, org.id, `ct-${tag}-${o}`, boot.id);
      await prisma.$executeRawUnsafe(`INSERT INTO contract_role_rates (id, contract_id, work_group_id, role_definition_id, hourly_rate_minor, created_at) VALUES (gen_random_uuid(),$1,$2,$3,3000,now())`, cid, wg.id, role.id);
      const period = await prisma.payrollPeriod.create({ data: { organizationId: org.id, jurisdictionCountry: "CA", jurisdictionRegion: "QC", periodStart: new Date("2026-08-01T00:00:00Z"), periodEnd: new Date("2026-08-15T00:00:00Z"), timezone: "America/Toronto", currency: "CAD", ruleProviderKey: "synthetic-fixture", ruleProviderVersion: "synthetic-2026.08", createdByUserId: boot.id } });
      orgs.push({ id: org.id, jobId: job.id, reviewId: review.id, residenceId: res.id, departmentId: dept.id, periodId: period.id });
    }
    console.log(`[perf-seed] ${ORGS} orgs in ${Date.now() - t0}ms`);

    // ── Actor helper: batch-create users + password identities + return ids ──
    async function createActorUsers(prefix: string, count: number): Promise<{ id: string; email: string }[]> {
      const rows = Array.from({ length: count }, (_, i) => ({ i, email: `${prefix}-${tag}-${i}@perf.invalid`, publicId: `usr_${prefix}${tag}${i}`.slice(0, 24) }));
      // createMany users
      await prisma.user.createMany({ data: rows.map((r) => ({ publicId: r.publicId, emailNormalized: normalizeEmail(r.email), displayName: `Perf ${prefix} ${r.i}`, status: "active" })), skipDuplicates: true });
      const created = await prisma.user.findMany({ where: { emailNormalized: { in: rows.map((r) => normalizeEmail(r.email)) } }, select: { id: true, emailNormalized: true } });
      const byEmail = new Map(created.map((u) => [u.emailNormalized, u.id]));
      await prisma.userIdentity.createMany({ data: rows.map((r) => ({ userId: byEmail.get(normalizeEmail(r.email))!, provider: "local_password" as const, providerSubject: normalizeEmail(r.email), passwordHash, passwordUpdatedAt: now, emailVerifiedAt: now })), skipDuplicates: true });
      return rows.map((r) => ({ id: byEmail.get(normalizeEmail(r.email))!, email: r.email }));
    }

    // Worker actors → worker_identity + a 'sent' offer (accept/decline targets), org round-robin.
    const workerUsers = await createActorUsers("wkr", WORKER_ACTORS);
    await prisma.workerIdentity.createMany({ data: workerUsers.map((u, i) => ({ id: undefined as unknown as string, userId: u.id, displayName: `Worker ${i}`, status: "active" })).map(({ id, ...rest }) => rest), skipDuplicates: true });
    const workerIdents = await prisma.workerIdentity.findMany({ where: { userId: { in: workerUsers.map((u) => u.id) } }, select: { id: true, userId: true } });
    const identByUser = new Map(workerIdents.map((w) => [w.userId, w.id]));
    const workers: PerfActors["workers"] = workerUsers.map((u, i) => ({ email: u.email, workerIdentityId: identByUser.get(u.id)!, orgId: orgs[i % ORGS].id }));

    // One 'sent' offer + terms per worker actor, scoped to that worker's org.
    for (let start = 0; start < workerUsers.length; start += 500) {
      const slice = workerUsers.slice(start, start + 500);
      const offerRows = slice.map((u, k) => {
        const globalIdx = start + k; const org = orgs[globalIdx % ORGS];
        return { id: randomUUID(), dispatchReviewId: org.reviewId, jobRequestId: org.jobId, organizationId: org.id, residenceId: org.residenceId, departmentId: org.departmentId, workerIdentityId: identByUser.get(u.id)!, status: "sent" as const, expiresAt: new Date(Date.now() + 30 * 864e5), createdByUserId: boot.id };
      });
      await prisma.workerOffer.createMany({ data: offerRows, skipDuplicates: true });
      await prisma.workerOfferTermsVersion.createMany({ data: offerRows.map((o) => ({ workerOfferId: o.id, versionNumber: 1, workerVisibleTitle: "Shift offer", timezone: "America/Toronto", startAt: new Date("2026-08-05T13:00:00Z"), endAt: new Date("2026-08-05T21:00:00Z"), workGroupId: wg.id, roleDefinitionId: role.id, createdByUserId: boot.id })), skipDuplicates: true });
    }
    console.log(`[perf-seed] ${WORKER_ACTORS} worker actors + offers in ${Date.now() - t0}ms`);

    // Employer actors → membership + ORGANIZATION_OWNER (one per org round-robin).
    const employerUsers = await createActorUsers("emp", EMPLOYER_ACTORS);
    const employers: PerfActors["employers"] = [];
    for (let i = 0; i < employerUsers.length; i += 1) {
      const org = orgs[i % ORGS];
      const mem = await prisma.organizationMembership.create({ data: { organizationId: org.id, userId: employerUsers[i].id, status: "active", acceptedAt: now } });
      await prisma.membershipAccessRole.create({ data: { membershipId: mem.id, accessRoleDefinitionId: ownerRole.id } });
      employers.push({ email: employerUsers[i].email, orgId: org.id });
    }

    // Admin actors → platform grant PLATFORM_ADMINISTRATOR (covers payroll authority).
    const adminUsers = await createActorUsers("adm", ADMIN_ACTORS);
    await prisma.platformAccessGrant.createMany({ data: adminUsers.map((u) => ({ userId: u.id, accessRoleDefinitionId: platformRole.id, releaseSha: RELEASE_SHA, grantedAt: now })), skipDuplicates: true });
    const admins = adminUsers.map((u) => ({ email: u.email }));
    console.log(`[perf-seed] ${EMPLOYER_ACTORS} employer + ${ADMIN_ACTORS} admin actors in ${Date.now() - t0}ms`);

    // ── Data-volume top-up to TOTAL_USERS via generate_series (no password identity; pure volume) ──
    const already = WORKER_ACTORS + EMPLOYER_ACTORS + ADMIN_ACTORS + 1;
    const fill = Math.max(0, TOTAL_USERS - already);
    if (fill > 0) {
      const org0 = orgs[0];
      const u = (p: string) => `(md5('${p}-${tag}-'||g::text))::uuid`;
      const g = (sql: string) => prisma.$executeRawUnsafe(sql);
      await g(`INSERT INTO users (id, public_id, email_normalized, updated_at) SELECT ${u("fus")}, 'FILL-${tag}-'||g, 'fill-${tag}-'||g||'@perf.invalid', now() FROM generate_series(1,${fill}) g`);
      await g(`INSERT INTO worker_identities (id, user_id, display_name, status, created_at, updated_at) SELECT ${u("fwi")}, ${u("fus")}, 'Fill '||g, 'active', now(), now() FROM generate_series(1,${fill}) g`);
      // Downstream chain for the fill workers (attendance/timesheet) so payroll has volume to compute.
      await g(`INSERT INTO worker_offers (id, dispatch_review_id, job_request_id, organization_id, residence_id, department_id, worker_identity_id, status, expires_at, created_by_user_id, created_at, updated_at) SELECT ${u("fof")}, '${org0.reviewId}', '${org0.jobId}', '${org0.id}', '${org0.residenceId}', '${org0.departmentId}', ${u("fwi")}, 'accepted', now()+interval '30 days', '${boot.id}', now(), now() FROM generate_series(1,${fill}) g`);
      await g(`INSERT INTO worker_offer_terms_versions (id, worker_offer_id, version_number, worker_visible_title, timezone, start_at, end_at, work_group_id, role_definition_id, created_by_user_id, created_at) SELECT ${u("ftr")}, ${u("fof")}, 1, 'Fill', 'America/Toronto', '2026-08-05T13:00:00Z', '2026-08-05T21:00:00Z', '${wg.id}', '${role.id}', '${boot.id}', now() FROM generate_series(1,${fill}) g`);
      await g(`INSERT INTO assignments (id, job_request_id, dispatch_review_id, worker_offer_id, worker_offer_terms_version_id, worker_identity_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, status, confirmed_start_at, confirmed_end_at, timezone, confirmed_title, capacity_checked_at, conflict_checked_at, confirmed_at, created_by_user_id, version, created_at, updated_at) SELECT ${u("fas")}, '${org0.jobId}', '${org0.reviewId}', ${u("fof")}, ${u("ftr")}, ${u("fwi")}, '${org0.id}', '${org0.residenceId}', '${org0.departmentId}', '${wg.id}', '${role.id}', 'confirmed', '2026-08-05T13:00:00Z', '2026-08-05T21:00:00Z', 'America/Toronto', 'Fill', now(), now(), now(), '${boot.id}', 1, now(), now() FROM generate_series(1,${fill}) g`);
      await g(`INSERT INTO attendance_records (id, assignment_id, job_request_id, worker_identity_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, status, scheduled_start_at, scheduled_end_at, timezone, assignment_status_snapshot, verification_method, created_by_user_id, version, created_at, updated_at) SELECT ${u("fat")}, ${u("fas")}, '${org0.jobId}', ${u("fwi")}, '${org0.id}', '${org0.residenceId}', '${org0.departmentId}', '${wg.id}', '${role.id}', 'checked_out', '2026-08-05T13:00:00Z', '2026-08-05T21:00:00Z', 'America/Toronto', 'confirmed', 'none', '${boot.id}', 1, now(), now() FROM generate_series(1,${fill}) g`);
      await g(`INSERT INTO timesheets (id, assignment_id, attendance_record_id, job_request_id, worker_identity_id, organization_id, residence_id, department_id, work_group_id, role_definition_id, status, attendance_version_snapshot, assignment_version_snapshot, scheduled_start_at, scheduled_end_at, timezone, payable_minutes, billable_minutes, break_minutes, approved_at, created_by_user_id, version, created_at, updated_at) SELECT ${u("fts")}, ${u("fas")}, ${u("fat")}, '${org0.jobId}', ${u("fwi")}, '${org0.id}', '${org0.residenceId}', '${org0.departmentId}', '${wg.id}', '${role.id}', 'approved', 1, 1, '2026-08-05T13:00:00Z', '2026-08-05T21:00:00Z', 'America/Toronto', 480, 480, 0, now(), '${boot.id}', 1, now(), now() FROM generate_series(1,${fill}) g`);
    }
    console.log(`[perf-seed] +${fill} data-volume worker chains in ${Date.now() - t0}ms`);

    const actors: PerfActors = { password: PERF_PASSWORD, workers, employers, admins, orgs, workGroupId: wg.id, roleDefinitionId: role.id };
    const outPath = join(process.cwd(), "tests/performance/.actors.json");
    writeFileSync(outPath, JSON.stringify(actors));
    const counts = await prisma.$queryRawUnsafe<{ users: bigint; workers: bigint; offers: bigint }[]>(`select (select count(*) from users)::bigint users, (select count(*) from worker_identities)::bigint workers, (select count(*) from worker_offers)::bigint offers`);
    console.log(`[perf-seed] DONE in ${Date.now() - t0}ms. DB: ${JSON.stringify(counts[0], (_, v) => (typeof v === "bigint" ? Number(v) : v))}. Actors → ${outPath}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
