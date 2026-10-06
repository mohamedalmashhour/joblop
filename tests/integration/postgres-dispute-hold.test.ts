import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildApi } from "../../apps/api/src/app";
import { createPrismaClient } from "@rwos/database";
import type { FastifyInstance } from "fastify";

// PERSISTED WORKER-DISPUTE HOLD/RELEASE (TEST / SYNTHETIC). Proves JobLop's signature guarantee at
// the DB level: raising a dispute on a payout PAUSES it (status -> held, heldReason "dispute"), and
// withdrawing the dispute RELEASES it back to pending — never auto-paid while disputed. The money
// reconciliation of a corrected dispute is proven at the engine level in tests/finance.
//
// Gated on RWOS_TEST_DATABASE_URL (a throwaway DB), like the other postgres-* suites.
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;
const NOW = new Date();

suite("persisted worker-dispute hold/release", () => {
  const prisma = createPrismaClient(databaseUrl!);
  let app: FastifyInstance;
  let workerToken = "";
  let workerId = "";
  let orgId = "";
  const payrollCalculationId = randomUUID(); // the payout's unique key; no real calc needed for the hold
  let disputeId = "";

  async function register(email: string) {
    const res = await app.inject({ method: "POST", url: "/auth/register", payload: { email, password: "Sup3r-Secret-Pass!", displayName: "T" } });
    return res.json() as { token: string; user: { id: string } };
  }
  const payoutStatus = async () =>
    prisma.workerPayout.findUnique({ where: { payrollCalculationId }, select: { status: true, heldReason: true } });

  beforeAll(async () => {
    app = buildApi({ countryCurrency: "CAD", env: { ...process.env, DATABASE_URL: databaseUrl, RWOS_ENV: "local", NODE_ENV: "test" }, resolveAuthorizationRoles: async () => ["WORKER_ACCESS"] });
    await app.ready();

    const w = await register(`disp-w-${randomUUID()}@e2e.local`); workerToken = w.token;
    workerId = (await prisma.workerIdentity.create({ data: { userId: w.user.id, displayName: "Dispute Worker", status: "active" } })).id;
    const org = await prisma.employerOrganization.create({ data: { publicId: `ORG-DS-${randomUUID().slice(0, 8)}`, legalName: "L", displayName: "DisputeCare", status: "active", createdByUserId: w.user.id } });
    orgId = org.id;

    // Seed a PENDING payout for this worker (what a close would produce). hold_until is NOT NULL.
    await prisma.$executeRawUnsafe(
      `INSERT INTO worker_payouts (id, worker_identity_id, payroll_calculation_id, organization_id, currency, amount_minor, status, hold_until, created_at, updated_at)
       VALUES ($1,$2,$3,$4,'CAD',13004,'pending',$5,$5,$5)`,
      randomUUID(), workerId, payrollCalculationId, orgId, NOW.toISOString()
    );
  });

  afterAll(async () => { await app?.close(); await prisma.$disconnect(); });

  it("payout starts pending", async () => {
    expect((await payoutStatus())?.status).toBe("pending");
  });

  it("raising a dispute PAUSES the payout (held, reason 'dispute')", async () => {
    const res = await app.inject({
      method: "POST", url: "/worker/disputes", headers: { authorization: `Bearer ${workerToken}` },
      payload: { payrollCalculationId, category: "hours", reason: "Hours recorded look higher than what I actually worked." }
    });
    expect(res.statusCode).toBe(201);
    disputeId = (res.json().dispute as { id: string }).id;
    expect(disputeId).toBeTruthy();
    const p = await payoutStatus();
    expect(p?.status).toBe("held");
    expect(p?.heldReason).toBe("dispute");
  });

  it("a second dispute on the same held payout is refused (already open)", async () => {
    const res = await app.inject({
      method: "POST", url: "/worker/disputes", headers: { authorization: `Bearer ${workerToken}` },
      payload: { payrollCalculationId, category: "pay_amount", reason: "Another reason while one is already open." }
    });
    expect(res.statusCode).toBe(409);
    expect((await payoutStatus())?.status).toBe("held"); // still held, unchanged
  });

  it("withdrawing the dispute RELEASES the payout back to pending", async () => {
    const res = await app.inject({
      method: "POST", url: `/worker/disputes/${encodeURIComponent(disputeId)}/withdraw`, headers: { authorization: `Bearer ${workerToken}` }
    });
    expect(res.statusCode).toBe(200);
    const p = await payoutStatus();
    expect(p?.status).toBe("pending");
    expect(p?.heldReason).toBeNull();
  });
});
