import type { PrismaClient } from "@rwos/database";
import { describe, expect, it, vi } from "vitest";
import { runUnfilledShiftSweep, unfilledShiftsEmail, unfilledThreshold } from "./unfilledShiftAlerts";

const NOW = new Date("2026-11-20T12:00:00.000Z");
const at = (hours: number) => new Date(NOW.getTime() + hours * 3_600_000);

describe("unfilled shift thresholds", () => {
  it("is 24 under 24 h, 4 under 4 h, none later or after the start", () => {
    expect(unfilledThreshold(at(30), NOW)).toBeNull();
    expect(unfilledThreshold(at(20), NOW)).toBe(24);
    expect(unfilledThreshold(at(3), NOW)).toBe(4);
    expect(unfilledThreshold(at(-1), NOW)).toBeNull();
  });
});

function job(id: string, hours: number, numberOfWorkers = 2) {
  return {
    id,
    jobRequestNumber: `JR-${id}`,
    title: "PAB",
    startAt: at(hours),
    timezone: "America/Toronto",
    numberOfWorkers,
    roleDefinition: { displayLabel: "Préposé" },
    organization: { displayName: "Résidence A" },
    residence: { city: "Laval" }
  };
}

function setup(jobs: ReturnType<typeof job>[], taken: Record<string, number>, existing: { jobRequestId: string; thresholdHours: number }[] = []) {
  const rows: { id: string; jobRequestId: string; thresholdHours: number; startAt: Date; emailedAt: Date | null }[] = existing.map((e, i) => ({
    id: `old${i}`,
    ...e,
    startAt: jobs.find((j) => j.id === e.jobRequestId)!.startAt,
    emailedAt: NOW
  }));
  const prisma = {
    jobRequest: { findMany: vi.fn(async () => jobs) },
    unfilledShiftAlert: {
      createMany: vi.fn(async ({ data }: { data: { jobRequestId: string; thresholdHours: number; startAt: Date }[] }) => {
        const d = data[0]!;
        if (rows.some((r) => r.jobRequestId === d.jobRequestId && r.thresholdHours === d.thresholdHours && r.startAt.getTime() === d.startAt.getTime())) return { count: 0 };
        rows.push({ id: `n${rows.length}`, ...d, emailedAt: null });
        return { count: 1 };
      }),
      findMany: vi.fn(async () => rows.filter((r) => r.emailedAt === null)),
      updateMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) => {
        for (const r of rows) if (where.id.in.includes(r.id)) r.emailedAt = NOW;
        return { count: where.id.in.length };
      })
    }
  };
  const remaining = async (list: readonly { id: string; numberOfWorkers: number }[]) =>
    new Map(list.map((j) => [j.id, j.numberOfWorkers - (taken[j.id] ?? 0)]));
  const emailSender = { configured: true, send: vi.fn(async () => ({ status: "sent" as const })) };
  return { prisma, remaining, emailSender, rows };
}

describe("unfilled shift sweep", () => {
  it("warns once per threshold, skips filled shifts, and is idempotent across sweeps", async () => {
    const { prisma, remaining, emailSender, rows } = setup([job("a", 20), job("b", 3), job("c", 10)], { c: 2 });
    const deps = { prisma: prisma as unknown as PrismaClient, emailSender: emailSender as never, remaining, staffEmail: "staff@joblop.test", now: () => NOW };
    const first = await runUnfilledShiftSweep(deps);
    expect(first).toEqual({ unfilled: 2, newAlerts: 2, emailed: 2 });
    expect(rows.map((r) => [r.jobRequestId, r.thresholdHours])).toEqual([["a", 24], ["b", 4]]);
    expect(emailSender.send).toHaveBeenCalledTimes(1);
    const second = await runUnfilledShiftSweep(deps);
    expect(second).toEqual({ unfilled: 2, newAlerts: 0, emailed: 0 });
    expect(emailSender.send).toHaveBeenCalledTimes(1);
  });

  it("warns again under 4 h after the 24 h warning", async () => {
    const { prisma, remaining, emailSender } = setup([job("a", 3)], {}, [{ jobRequestId: "a", thresholdHours: 24 }]);
    const result = await runUnfilledShiftSweep({ prisma: prisma as unknown as PrismaClient, emailSender: emailSender as never, remaining, staffEmail: "s@x.y", now: () => NOW });
    expect(result.newAlerts).toBe(1);
    expect(result.emailed).toBe(1);
  });

  it("keeps the warning for the list but retries the email later when there is no staff inbox", async () => {
    const { prisma, remaining, emailSender, rows } = setup([job("a", 20)], {});
    const result = await runUnfilledShiftSweep({ prisma: prisma as unknown as PrismaClient, emailSender: emailSender as never, remaining, staffEmail: null, now: () => NOW });
    expect(result).toEqual({ unfilled: 1, newAlerts: 1, emailed: 0 });
    expect(rows[0]!.emailedAt).toBeNull();
    expect(emailSender.send).not.toHaveBeenCalled();
  });

  it("writes the staff email in English, French and Arabic", () => {
    const email = unfilledShiftsEmail({
      to: "s@x.y",
      items: [{ jobRequestId: "a", jobRequestNumber: "JR-1", title: "PAB", role: "Préposé", employer: "Résidence A", city: "Laval", startAt: at(3), timezone: "America/Toronto", openings: 2, filled: 1, thresholdHours: 4 }],
      adminWebOrigin: null,
      now: NOW
    });
    expect(email.subject).toContain("1 unfilled shift");
    expect(email.text).toContain("1/2 filled");
    expect(email.text).toContain("1/2 pourvus");
    expect(email.text).toContain("مشغولة");
    expect(email.text).toContain("/unfilled-shifts");
  });
});
