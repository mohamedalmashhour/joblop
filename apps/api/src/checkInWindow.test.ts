import { describe, expect, it, vi } from "vitest";
import { CHECK_IN_TOO_EARLY_ERROR, checkInOpensAt, checkInTooEarly, checkInTooEarlyBody } from "./checkInWindow";

const ATT = "00000000-0000-4000-8000-0000000000d1";
const USER = "00000000-0000-4000-8000-0000000000e1";
const OTHER_USER = "00000000-0000-4000-8000-0000000000e2";
const START = new Date("2026-11-12T12:30:00.000Z");

function fakePrisma(scheduledStartAt: Date | null, ownerUserId: string = USER) {
  const findUnique = vi.fn(async () => (scheduledStartAt ? { scheduledStartAt, workerIdentity: { userId: ownerUserId } } : null));
  const prisma = { attendanceRecord: { findUnique } } as unknown as Parameters<typeof checkInTooEarly>[0];
  return { prisma, findUnique };
}

describe("check-in opens 30 minutes before the shift", () => {
  it("opens exactly 30 minutes before the start", () => {
    expect(checkInOpensAt(START).toISOString()).toBe("2026-11-12T12:00:00.000Z");
  });

  it("refuses a check-in days before the shift and says when it opens", async () => {
    const { prisma, findUnique } = fakePrisma(START);
    const opensAt = await checkInTooEarly(prisma, ATT, USER, new Date("2026-11-09T15:00:00.000Z"));
    expect(opensAt?.toISOString()).toBe("2026-11-12T12:00:00.000Z");
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: ATT },
      select: { scheduledStartAt: true, workerIdentity: { select: { userId: true } } }
    });
    const body = checkInTooEarlyBody(opensAt!);
    expect(body.error).toBe(CHECK_IN_TOO_EARLY_ERROR);
    expect(body.opensAt).toBe("2026-11-12T12:00:00.000Z");
  });

  it("refuses one minute before the window opens", async () => {
    const { prisma } = fakePrisma(START);
    expect(await checkInTooEarly(prisma, ATT, USER, new Date("2026-11-12T11:59:00.000Z"))).not.toBeNull();
  });

  it("allows from 30 minutes before, at the start and after it", async () => {
    const { prisma } = fakePrisma(START);
    expect(await checkInTooEarly(prisma, ATT, USER, new Date("2026-11-12T12:00:00.000Z"))).toBeNull();
    expect(await checkInTooEarly(prisma, ATT, USER, START)).toBeNull();
    expect(await checkInTooEarly(prisma, ATT, USER, new Date("2026-11-12T13:15:00.000Z"))).toBeNull();
  });

  it("never answers for another worker's shift (the normal path refuses it)", async () => {
    const { prisma } = fakePrisma(START, OTHER_USER);
    expect(await checkInTooEarly(prisma, ATT, USER, new Date("2026-11-09T15:00:00.000Z"))).toBeNull();
  });

  it("leaves unknown records, non-UUID ids and database-less builds to the normal path", async () => {
    const early = new Date("2026-11-01T00:00:00.000Z");
    expect(await checkInTooEarly(fakePrisma(null).prisma, ATT, USER, early)).toBeNull();
    const { prisma, findUnique } = fakePrisma(START);
    expect(await checkInTooEarly(prisma, "attendance-1", USER, early)).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
    expect(await checkInTooEarly(null, ATT, USER, early)).toBeNull();
  });
});
