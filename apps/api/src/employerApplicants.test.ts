import type { PrismaClient } from "@rwos/database";
import { describe, expect, it, vi } from "vitest";
import { firstNameOf, listEmployerApplicants, listLongTermApplicants, setEmployerFavorite } from "./employerApplicants";

const ids = { organizationId: "org", jobRequestId: "job" };

function prismaWith(row: Record<string, unknown>) {
  return {
    workerJobInterest: { findMany: vi.fn(async () => [row]), updateMany: vi.fn(async () => ({ count: 1 })) },
    attendanceRecord: { groupBy: vi.fn(async () => [{ workerIdentityId: "w", _count: { _all: 3 } }]) }
  };
}
const row = {
  id: "i",
  status: "under_review",
  workerIdentityId: "w",
  employerFavoritedAt: new Date(),
  worker: { displayName: "Sara Haddad", verifications: [{ id: "v" }] }
};

describe("employer applicants", () => {
  it("shows the first name only", () => {
    expect(firstNameOf(" Sara  Haddad ")).toBe("Sara");
    expect(firstNameOf(null)).toBeNull();
    expect(firstNameOf("  ")).toBeNull();
  });

  it("returns limited details, with no way to identify or reach the worker", async () => {
    const prisma = prismaWith(row);
    const [applicant] = await listEmployerApplicants(prisma as unknown as PrismaClient, ids);
    expect(applicant).toEqual({
      interestId: "i",
      firstName: "Sara",
      verified: true,
      completedShifts: 3,
      status: "interested",
      favorite: true
    });
    expect(JSON.stringify(applicant)).not.toContain("Haddad");
    expect(JSON.stringify(applicant)).not.toContain('"w"');
  });

  it("reads only this employer's job and leaves out withdrawn workers", async () => {
    const prisma = prismaWith(row);
    await listEmployerApplicants(prisma as unknown as PrismaClient, ids);
    expect(prisma.workerJobInterest.findMany.mock.calls[0]).toMatchObject([
      { where: { organizationId: "org", jobRequestId: "job", status: { not: "withdrawn" } } }
    ]);
  });

  it("scopes a favourite to this employer's job and never changes the status", async () => {
    const prisma = prismaWith(row);
    const saved = await setEmployerFavorite(prisma as unknown as PrismaClient, {
      ...ids,
      interestId: "i",
      favorite: true,
      actorUserId: "u"
    });
    expect(saved).toBe(true);
    const [call] = prisma.workerJobInterest.updateMany.mock.calls as unknown as [[{ where: Record<string, unknown>; data: Record<string, unknown> }]];
    expect(call[0].where).toMatchObject({ id: "i", organizationId: "org", jobRequestId: "job" });
    expect(call[0].data).not.toHaveProperty("status");
    expect(call[0].data).toMatchObject({ employerFavoritedByUserId: "u" });
  });

  it("reports when nothing was changed", async () => {
    const prisma = prismaWith(row);
    prisma.workerJobInterest.updateMany.mockResolvedValue({ count: 0 });
    expect(
      await setEmployerFavorite(prisma as unknown as PrismaClient, { ...ids, interestId: "x", favorite: false, actorUserId: "u" })
    ).toBe(false);
  });
});

describe("long-term applicants (the employer chooses)", () => {
  const ltRow = (revealed: Date | null) => ({
    id: "i",
    workerIdentityId: "w",
    employerDecision: revealed ? "hired" : null,
    employerContactRevealedAt: revealed,
    createdAt: new Date("2026-11-01T00:00:00.000Z"),
    worker: {
      displayName: "Sara Haddad",
      userId: "u",
      verifications: [],
      hrIntake: { city: "Laval", phone: "+15145550000" },
      user: { emailNormalized: "sara@example.com", phone: null }
    }
  });
  const ltPrisma = (revealed: Date | null) => ({
    workerJobInterest: { findMany: vi.fn(async () => [ltRow(revealed)]) },
    hrDocument: { findMany: vi.fn(async () => [{ workerIdentityId: "w", documentType: "cert_pab", verifiedCertificateKey: null, status: "accepted", expiresAt: null }]) },
    workerCv: { findMany: vi.fn(async () => [{ workerRef: "u", headline: "PAB, 5 years in CHSLD" }]) }
  });

  it("shows first name, city, verified certificates and summary, but no contact before Contact or Hire", async () => {
    const [applicant] = await listLongTermApplicants(ltPrisma(null) as unknown as PrismaClient, ids);
    expect(applicant).toMatchObject({ firstName: "Sara", city: "Laval", certificates: ["pab"], profileSummary: "PAB, 5 years in CHSLD", contact: null, decision: null });
    expect(JSON.stringify(applicant)).not.toContain("sara@example.com");
    expect(JSON.stringify(applicant)).not.toContain("5550000");
  });

  it("shows the contact details once the employer chose Contact or Hire", async () => {
    const [applicant] = await listLongTermApplicants(ltPrisma(new Date()) as unknown as PrismaClient, ids);
    expect(applicant?.contact).toEqual({ email: "sara@example.com", phone: "+15145550000" });
    expect(applicant?.decision).toBe("hired");
  });
});
