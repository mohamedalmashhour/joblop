import type { PrismaClient } from "@rwos/database";
import { describe, expect, it, vi } from "vitest";
import {
  applyBlockingCertificates,
  certificateGapForJob,
  offerCertificateRefusal,
  readCertificateOverride,
  recordCertificateOverride,
  requiredCertificatesField
} from "./requiredCertificateCheck";

const START = new Date("2026-12-01T13:00:00.000Z");
const NOW = new Date("2026-11-20T12:00:00.000Z");
const OFFER = "00000000-0000-4000-8000-000000000001";

function prismaWithDocs(docs: unknown[]) {
  return { hrDocument: { findMany: vi.fn(async () => docs) } };
}

describe("required certificate check (server side)", () => {
  it("reads nothing when the job requires no certificate", async () => {
    const prisma = prismaWithDocs([]);
    const gap = await certificateGapForJob(prisma as unknown as PrismaClient, { workerIdentityId: "w", job: { startAt: START, requiredCertificates: [] }, now: NOW });
    expect(gap.missing).toEqual([]);
    expect(prisma.hrDocument.findMany).not.toHaveBeenCalled();
  });

  it("counts only accepted documents of this worker, valid at the job start", async () => {
    const prisma = prismaWithDocs([
      { documentType: "cert_pab", verifiedCertificateKey: null, status: "accepted", expiresAt: null },
      { documentType: "first_aid", verifiedCertificateKey: null, status: "accepted", expiresAt: new Date("2026-11-25T00:00:00.000Z") }
    ]);
    const gap = await certificateGapForJob(prisma as unknown as PrismaClient, {
      workerIdentityId: "w",
      job: { startAt: START, requiredCertificates: ["pab", "rcr_first_aid"] },
      now: NOW
    });
    // First aid expires before the shift starts, so it does not count.
    expect(gap.missing).toEqual(["rcr_first_aid"]);
    expect(prisma.hrDocument.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ workerIdentityId: "w", status: "accepted" }) }));
  });

  it("never lets Other block applying (a person checks it) but it blocks claiming", () => {
    expect(applyBlockingCertificates(["pab", "other"])).toEqual(["pab"]);
  });

  it("adds requiredCertificates to a worker payload only when there are some", () => {
    expect(requiredCertificatesField({ requiredCertificates: [] })).toEqual({});
    expect(requiredCertificatesField({ requiredCertificates: ["whmis"] })).toEqual({ requiredCertificates: { keys: ["whmis"], other: null } });
  });

  it("reads the staff override flag strictly", () => {
    expect(readCertificateOverride({ certificateOverride: "true" })).toEqual({ override: false, reason: null });
    expect(readCertificateOverride({ certificateOverride: true, certificateOverrideReason: " checked card " })).toEqual({ override: true, reason: "checked card" });
  });
});

describe("accepting an offer", () => {
  const offerPrisma = (offer: unknown, docs: unknown[] = []) => ({
    workerOffer: { findUnique: vi.fn(async () => offer) },
    hrDocument: { findMany: vi.fn(async () => docs) }
  });
  const offer = (extra: Record<string, unknown> = {}) => ({
    workerIdentityId: "w",
    certificateOverrideAt: null,
    workerIdentity: { userId: "u" },
    jobRequest: { startAt: START, requiredCertificates: ["pab"], requiredCertificateOther: null },
    ...extra
  });

  it("refuses with the missing certificates and a Documents hint", async () => {
    const refusal = await offerCertificateRefusal(offerPrisma(offer()) as unknown as PrismaClient, { workerOfferId: OFFER, userId: "u", now: NOW });
    expect(refusal).toMatchObject({ error: "RWOS_CERTIFICATE_REQUIRED", reasons: ["missing_certificate:pab"] });
  });

  it("lets it through with a staff override, when held, or when it is not this worker's offer", async () => {
    expect(await offerCertificateRefusal(offerPrisma(offer({ certificateOverrideAt: NOW })) as unknown as PrismaClient, { workerOfferId: OFFER, userId: "u", now: NOW })).toBeNull();
    expect(
      await offerCertificateRefusal(offerPrisma(offer(), [{ documentType: "cert_pab", verifiedCertificateKey: null, status: "accepted", expiresAt: null }]) as unknown as PrismaClient, { workerOfferId: OFFER, userId: "u", now: NOW })
    ).toBeNull();
    expect(await offerCertificateRefusal(offerPrisma(offer()) as unknown as PrismaClient, { workerOfferId: OFFER, userId: "someone-else", now: NOW })).toBeNull();
  });
});

describe("staff certificate override", () => {
  it("is stored on the offer and appended to the audit log", async () => {
    const tx = {
      workerOffer: { update: vi.fn(async () => ({})) },
      auditActorReference: { create: vi.fn(async () => ({ id: "actor" })) },
      auditEvent: { create: vi.fn(async () => ({})) }
    };
    const prisma = { $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<void>) => fn(tx)) };
    await recordCertificateOverride(prisma as unknown as PrismaClient, {
      workerOfferId: OFFER,
      organizationId: "org",
      jobRequestId: "job",
      actorUserId: "staff",
      missing: ["pab", "other"],
      reason: "Saw the card",
      source: "assignment_create",
      now: NOW
    });
    expect(tx.workerOffer.update).toHaveBeenCalledWith({
      where: { id: OFFER },
      data: expect.objectContaining({ certificateOverrideAt: NOW, certificateOverrideByUserId: "staff" })
    });
    expect(tx.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "certificate.override", entityType: "worker_offer", entityId: OFFER, reason: expect.stringContaining("missing: pab, other") })
    });
  });
});
