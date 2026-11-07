import type { PrismaClient } from "@rwos/database";
import { describe, expect, it, vi } from "vitest";
import { firstNameOf, listEmployerApplicants, setEmployerFavorite } from "./employerApplicants";

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
