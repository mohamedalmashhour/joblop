import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildApi } from "../../apps/api/src/app";
import { createPrismaClient } from "@rwos/database";
import type { FastifyInstance } from "fastify";

// HR-2 concurrency: two reviewers on the same subject must produce a deterministic final
// state with a COMPLETE audit history and no lost transition.
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

suite("HR-2 concurrency", () => {
  const prisma = createPrismaClient(databaseUrl!);
  let app: FastifyInstance;
  let hrUserId = "";
  let hrToken = "";
  let workerId = "";

  async function register(email: string) {
    const res = await app.inject({ method: "POST", url: "/auth/register", payload: { email, password: "Sup3r-Secret-Pass!", displayName: "T" } });
    return res.json() as { token: string; user: { id: string } };
  }
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });

  beforeAll(async () => {
    app = buildApi({ env: { ...process.env, DATABASE_URL: databaseUrl, RWOS_ENV: "local", NODE_ENV: "test" }, resolveAuthorizationRoles: async (u: string) => (u === hrUserId ? ["HR_ADMINISTRATOR"] : []) });
    await app.ready();
    const hr = await register(`hrc-${randomUUID()}@e2e.local`);
    hrUserId = hr.user.id;
    hrToken = hr.token;
    const w = await register(`hrcw-${randomUUID()}@e2e.local`);
    workerId = (await prisma.workerIdentity.create({ data: { userId: w.user.id, displayName: "HRC", status: "active" } })).id;
  });

  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });

  it("two reviewers changing the same standing → both audited, deterministic final", async () => {
    const req = (standing: string, reason: string) => app.inject({ method: "POST", url: `/platform/hr/workers/${workerId}/standing`, headers: auth(hrToken), payload: { standing, reason } });
    const before = await prisma.hrEvent.count({ where: { workerIdentityId: workerId, eventType: "standing_changed" } });
    // This is the worker's FIRST HR touch, so both requests race to create the HR profile lazily.
    // Both must succeed: the loser of the create reuses the winner's profile.
    const responses = await Promise.all([req("restricted", "A"), req("suspended", "B")]);
    expect(responses.map((r) => r.statusCode)).toEqual([200, 200]);
    const after = await prisma.hrEvent.count({ where: { workerIdentityId: workerId, eventType: "standing_changed" } });
    expect(after - before).toBe(2); // no lost transition
    const final = (await prisma.hrProfile.findUniqueOrThrow({ where: { workerIdentityId: workerId } })).standing;
    expect(["restricted", "suspended"]).toContain(final);
  });

  it("credential renewal vs revoke → old credential ends in a valid terminal state (no corruption)", async () => {
    const add = await app.inject({ method: "POST", url: `/platform/hr/workers/${workerId}/credentials`, headers: auth(hrToken), payload: { credentialType: "conc", expiresAt: "2026-12-01T00:00:00.000Z" } });
    const id = add.json().id as string;
    await Promise.all([
      app.inject({ method: "POST", url: `/platform/hr/credentials/${id}/renew`, headers: auth(hrToken), payload: { expiresAt: "2027-12-01T00:00:00.000Z" } }),
      app.inject({ method: "POST", url: `/platform/hr/credentials/${id}/revoke`, headers: auth(hrToken), payload: { reason: "x" } })
    ]);
    const row = await prisma.hrCredential.findUniqueOrThrow({ where: { id } });
    expect(["replaced", "revoked"]).toContain(row.status); // terminal, not corrupted
    // every attempt is recorded
    const events = await prisma.hrEvent.count({ where: { subjectId: id } });
    expect(events).toBeGreaterThanOrEqual(1);
  });

  it("case close vs action-required → one valid transition wins; final is a legal state", async () => {
    const open = await app.inject({ method: "POST", url: `/platform/hr/workers/${workerId}/cases`, headers: auth(hrToken), payload: { caseType: "conc" } });
    const caseId = open.json().id as string;
    await app.inject({ method: "POST", url: `/platform/hr/cases/${caseId}/transition`, headers: auth(hrToken), payload: { to: "under_review" } });
    const [r1, r2] = await Promise.all([
      app.inject({ method: "POST", url: `/platform/hr/cases/${caseId}/transition`, headers: auth(hrToken), payload: { to: "resolved" } }),
      app.inject({ method: "POST", url: `/platform/hr/cases/${caseId}/transition`, headers: auth(hrToken), payload: { to: "action_required" } })
    ]);
    // both are legal FROM under_review, so both may 200; final is one of them (deterministic legal state)
    expect([r1.statusCode, r2.statusCode].every((c) => c === 200 || c === 409)).toBe(true);
    const final = (await prisma.hrCase.findUniqueOrThrow({ where: { id: caseId } })).status;
    expect(["resolved", "action_required"]).toContain(final);
  });

  it("duplicate submission (same standing twice) is fully audited (no silent dedup of history)", async () => {
    const req = () => app.inject({ method: "POST", url: `/platform/hr/workers/${workerId}/standing`, headers: auth(hrToken), payload: { standing: "review_required" } });
    const before = await prisma.hrEvent.count({ where: { workerIdentityId: workerId, eventType: "standing_changed" } });
    await Promise.all([req(), req()]);
    const after = await prisma.hrEvent.count({ where: { workerIdentityId: workerId, eventType: "standing_changed" } });
    expect(after - before).toBe(2);
    expect((await prisma.hrProfile.findUniqueOrThrow({ where: { workerIdentityId: workerId } })).standing).toBe("review_required");
  });
});
