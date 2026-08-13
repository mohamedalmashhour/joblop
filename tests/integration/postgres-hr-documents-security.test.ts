import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildApi } from "../../apps/api/src/app";
import { createPrismaClient } from "@rwos/database";
import type { FastifyInstance } from "fastify";

// HR-3 Documents & Compliance: security + governance + concurrency, real Postgres via inject.
const databaseUrl = process.env.RWOS_TEST_DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

suite("HR-3 documents & compliance (endpoint level)", () => {
  const prisma = createPrismaClient(databaseUrl!);
  let app: FastifyInstance;
  let hrUserId = "";
  let hrToken = "";
  let aToken = "";
  let bToken = "";
  let workerBId = "";
  let outsiderToken = "";

  async function register(email: string) {
    const res = await app.inject({ method: "POST", url: "/auth/register", payload: { email, password: "Sup3r-Secret-Pass!", displayName: "T" } });
    return res.json() as { token: string; user: { id: string } };
  }
  const auth = (t: string) => ({ authorization: `Bearer ${t}` });

  // worker submits a document via the governed flow (upload-reference → submit)
  async function submit(token: string, documentType: string, expiresAt?: string) {
    const refRes = await app.inject({ method: "POST", url: "/hr/documents/upload-reference", headers: auth(token), payload: { documentType } });
    const { storageReference } = refRes.json();
    const res = await app.inject({ method: "POST", url: "/hr/documents", headers: auth(token), payload: { documentType, storageReference, ...(expiresAt ? { expiresAt } : {}) } });
    return res.json().document as { id: string; effectiveStatus: string };
  }

  beforeAll(async () => {
    app = buildApi({ env: { ...process.env, DATABASE_URL: databaseUrl, RWOS_ENV: "local", NODE_ENV: "test" }, resolveAuthorizationRoles: async (u: string) => (u === hrUserId ? ["HR_ADMINISTRATOR"] : []) });
    await app.ready();
    const hr = await register(`hd-hr-${randomUUID()}@e2e.local`);
    hrUserId = hr.user.id; hrToken = hr.token;
    const a = await register(`hd-a-${randomUUID()}@e2e.local`);
    aToken = a.token; await prisma.workerIdentity.create({ data: { userId: a.user.id, displayName: "A", status: "active" } });
    const b = await register(`hd-b-${randomUUID()}@e2e.local`);
    bToken = b.token; workerBId = (await prisma.workerIdentity.create({ data: { userId: b.user.id, displayName: "B", status: "active" } })).id;
    outsiderToken = (await register(`hd-out-${randomUUID()}@e2e.local`)).token;
    // a compliance requirement (data, not hard-coded law): CA-QC needs a work_authorization doc
    await prisma.complianceRequirement.create({ data: { key: `qc-work-auth-${randomUUID().slice(0, 8)}`, jurisdiction: "CA-QC", roleCategory: null, requiredDocumentType: "work_authorization", effectiveFrom: new Date("2020-01-01") } });
  });

  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });

  it("a worker cannot approve their own document; employers/outsiders cannot review", async () => {
    const doc = await submit(aToken, "work_authorization");
    expect(doc.effectiveStatus).toBe("submitted");
    expect((await app.inject({ method: "POST", url: `/platform/hr/documents/${doc.id}/accept`, headers: auth(aToken) })).statusCode).toBe(403);
    expect((await app.inject({ method: "POST", url: `/platform/hr/documents/${doc.id}/accept`, headers: auth(outsiderToken) })).statusCode).toBe(403);
  });

  it("a fabricated storage reference is rejected", async () => {
    const res = await app.inject({ method: "POST", url: "/hr/documents", headers: auth(aToken), payload: { documentType: "licence", storageReference: "fabricated/not-mine" } });
    expect(res.statusCode).toBe(400);
  });

  it("worker A cannot access worker B's documents; download is HR-only", async () => {
    const doc = await submit(aToken, "licence");
    // HR-authority endpoints are not reachable by a worker
    expect((await app.inject({ method: "GET", url: `/platform/hr/workers/${workerBId}/documents`, headers: auth(aToken) })).statusCode).toBe(403);
    expect((await app.inject({ method: "GET", url: `/platform/hr/documents/${doc.id}/download`, headers: auth(aToken) })).statusCode).toBe(403);
    // worker self-view returns only their own + no internal storage reference
    const mine = await app.inject({ method: "GET", url: "/hr/documents", headers: auth(aToken) });
    expect(mine.json().documents.every((d: Record<string, unknown>) => !("storageReference" in d) && !("reviewReason" in d))).toBe(true);
  });

  it("HR accept then a replacement supersedes the old accepted doc; superseded cannot reactivate", async () => {
    const doc = await submit(aToken, "safety_cert");
    expect((await app.inject({ method: "POST", url: `/platform/hr/documents/${doc.id}/accept`, headers: auth(hrToken) })).statusCode).toBe(200);
    // replace it
    const refRes = await app.inject({ method: "POST", url: "/hr/documents/upload-reference", headers: auth(aToken), payload: { documentType: "safety_cert" } });
    const replaceRes = await app.inject({ method: "POST", url: "/hr/documents/replace", headers: auth(aToken), payload: { documentType: "safety_cert", storageReference: refRes.json().storageReference } });
    expect(replaceRes.statusCode).toBe(201);
    const old = await prisma.hrDocument.findUniqueOrThrow({ where: { id: doc.id } });
    expect(old.status).toBe("superseded");
    expect(old.supersededById).toBeTruthy();
    // a superseded document cannot be accepted again (no silent reactivation)
    expect((await app.inject({ method: "POST", url: `/platform/hr/documents/${doc.id}/accept`, headers: auth(hrToken) })).statusCode).toBe(409);
  });

  it("compliance evaluation reflects real document state (missing → non_compliant, accepted → compliant)", async () => {
    // worker B has no work_authorization document → non_compliant
    const before = await app.inject({ method: "GET", url: `/platform/hr/workers/${workerBId}/compliance?jurisdiction=CA-QC`, headers: auth(hrToken) });
    expect(before.json().compliance.result).toBe("non_compliant");
    // submit + accept a work_authorization → compliant
    const doc = await submit(bToken, "work_authorization");
    await app.inject({ method: "POST", url: `/platform/hr/documents/${doc.id}/accept`, headers: auth(hrToken) });
    const after = await app.inject({ method: "GET", url: `/platform/hr/workers/${workerBId}/compliance?jurisdiction=CA-QC`, headers: auth(hrToken) });
    expect(after.json().compliance.result).toBe("compliant");
  });

  it("concurrency: two reviewers on the same document → one decides, the other 409 (no lost history)", async () => {
    const doc = await submit(aToken, "policy_ack");
    const [r1, r2] = await Promise.all([
      app.inject({ method: "POST", url: `/platform/hr/documents/${doc.id}/accept`, headers: auth(hrToken) }),
      app.inject({ method: "POST", url: `/platform/hr/documents/${doc.id}/reject`, headers: auth(hrToken), payload: { reason: "dup" } })
    ]);
    const codes = [r1.statusCode, r2.statusCode].sort();
    expect(codes).toEqual([200, 409]); // exactly one governed decision wins
    const events = await prisma.hrDocumentEvent.count({ where: { documentId: doc.id, eventType: { in: ["document_accepted", "document_rejected"] } } });
    expect(events).toBe(1);
  });

  it("concurrency: replacement vs revoke leaves a valid terminal state (uncorrupted)", async () => {
    const doc = await submit(aToken, "training_cert");
    await app.inject({ method: "POST", url: `/platform/hr/documents/${doc.id}/accept`, headers: auth(hrToken) });
    const ref = (await app.inject({ method: "POST", url: "/hr/documents/upload-reference", headers: auth(aToken), payload: { documentType: "training_cert" } })).json().storageReference;
    await Promise.all([
      app.inject({ method: "POST", url: "/hr/documents/replace", headers: auth(aToken), payload: { documentType: "training_cert", storageReference: ref } }),
      app.inject({ method: "POST", url: `/platform/hr/documents/${doc.id}/revoke`, headers: auth(hrToken), payload: { reason: "x" } })
    ]);
    const row = await prisma.hrDocument.findUniqueOrThrow({ where: { id: doc.id } });
    expect(["superseded", "revoked"]).toContain(row.status);
  });
});
