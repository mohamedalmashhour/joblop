import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { buildApi } from "../../apps/api/src/app";
import { createPrismaClient } from "@rwos/database";

/**
 * HR-6.1 Chunk 1 — live PostgreSQL/API proof for the READ-ONLY period review endpoint:
 *   GET /platform/payroll/periods/:periodId/review-context
 * Proves authorization, period-level unsupported-provider/jurisdiction flags, bounded empty-worker
 * behavior, and zero authoritative writes. Per-worker failure-flag logic is exhaustively covered by
 * the domain unit suite; exercising it with real approved worked time needs the full HR-5.1
 * marketplace seed (CI harness) and is out of this chunk's scope.
 */
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

suite("HR-6.1 period review endpoint (advisory, read-only)", () => {
  const prisma = createPrismaClient(databaseUrl!);
  let app: FastifyInstance;
  let payrollAdminId = "";
  let platformAdminId = "";
  let payrollToken = "";
  let platformToken = "";
  let workerToken = "";
  let TENANT = "";
  let supportedPeriodId = ""; // CA/QC — supported
  let unsupportedPeriodId = ""; // CA/ZZ — unsupported jurisdiction

  const auth = (t: string) => ({ authorization: `Bearer ${t}` });
  const get = (token: string | null, id: string) =>
    app.inject({ method: "GET", url: `/platform/payroll/periods/${id}/review-context`, ...(token ? { headers: auth(token) } : {}) });
  async function register(email: string) {
    const res = await app.inject({ method: "POST", url: "/auth/register", payload: { email, password: "Sup3r-Secret-Pass!", displayName: "T" } });
    return res.json() as { token: string; user: { id: string } };
  }
  const seedPeriod = (region: string) => prisma.payrollPeriod.create({
    data: { organizationId: TENANT, jurisdictionCountry: "CA", jurisdictionRegion: region, periodStart: new Date(`2026-08-0${region === "QC" ? 1 : 2}T00:00:00Z`), periodEnd: new Date(`2026-08-1${region === "QC" ? 5 : 6}T00:00:00Z`), timezone: "America/Toronto", currency: "CAD", ruleProviderKey: "synthetic-fixture", ruleProviderVersion: "synthetic-2026.08", createdByUserId: payrollAdminId }
  }).then((p) => p.id);

  beforeAll(async () => {
    const roles = async (u: string) => (u === payrollAdminId ? ["PAYROLL_ADMINISTRATOR"] : u === platformAdminId ? ["PLATFORM_ADMINISTRATOR"] : ["WORKER_ACCESS"]);
    app = buildApi({ countryCurrency: "CAD", env: { ...process.env, DATABASE_URL: databaseUrl, RWOS_ENV: "local", NODE_ENV: "test" }, resolveAuthorizationRoles: roles });
    await app.ready();
    const admin = await register(`pr-admin-${randomUUID()}@e2e.local`); payrollAdminId = admin.user.id; payrollToken = admin.token;
    const plat = await register(`pr-plat-${randomUUID()}@e2e.local`); platformAdminId = plat.user.id; platformToken = plat.token;
    const wk = await register(`pr-wk-${randomUUID()}@e2e.local`); workerToken = wk.token;
    const org = await prisma.employerOrganization.create({ data: { publicId: `ORG-PR-${randomUUID().slice(0, 8)}`, legalName: "PR Legal", displayName: "PRCare", status: "active", createdByUserId: payrollAdminId } });
    TENANT = org.id;
    supportedPeriodId = await seedPeriod("QC");
    unsupportedPeriodId = await seedPeriod("ZZ");
  });
  afterAll(async () => { await app?.close(); await prisma.$disconnect(); });

  it("enforces payroll authority (401 unauth, 403 worker, 200 admins, 404 forged)", async () => {
    expect((await get(null, supportedPeriodId)).statusCode).toBe(401);
    expect((await get(workerToken, supportedPeriodId)).statusCode).toBe(403);
    expect((await get(payrollToken, supportedPeriodId)).statusCode).toBe(200);
    expect((await get(platformToken, supportedPeriodId)).statusCode).toBe(200);
    expect((await get(payrollToken, randomUUID())).statusCode).toBe(404);
  });

  it("a supported period with no eligible workers → advisory context, empty + bounded, no invented money", async () => {
    const body = (await get(payrollToken, supportedPeriodId)).json();
    expect(body.advisory).toBe(true);
    expect(body.context.periodFlags).toEqual([]);
    expect(body.context.workers).toEqual([]);
    expect(body.context.bounds.workersTruncated).toBe(false);
    expect(body.context.organizationRef).toBe(TENANT);
    expect(JSON.stringify(body.context)).not.toContain("Minor");
  });

  it("an unsupported jurisdiction → period-level UNSUPPORTED flags", async () => {
    const ctx = (await get(payrollToken, unsupportedPeriodId)).json().context;
    const codes = ctx.periodFlags.map((f: { code: string }) => f.code);
    expect(codes).toContain("UNSUPPORTED_JURISDICTION");
    expect(codes).toContain("UNSUPPORTED_PROVIDER");
  });

  it("performs no authoritative write (calc + period counts unchanged before/after)", async () => {
    const snap = async () => ({ calcs: await prisma.payrollCalculation.count(), periods: await prisma.payrollPeriod.count(), period: await prisma.payrollPeriod.findUnique({ where: { id: supportedPeriodId } }) });
    const before = await snap();
    await get(payrollToken, supportedPeriodId);
    await get(platformToken, unsupportedPeriodId);
    const after = await snap();
    expect(after).toEqual(before);
  });
});
