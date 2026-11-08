import type { PrismaClient } from "@rwos/database";
import { afterEach, describe, expect, it } from "vitest";
import {
  cancelEmployerPlan,
  effectivePlanFromRow,
  isEmployerPlansEnabled,
  startEmployerPlanTrial
} from "./employerPlanRepository";

const NOW = new Date("2026-11-08T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function row(overrides: Partial<Parameters<typeof effectivePlanFromRow>[1] & object> = {}) {
  return {
    track: "short_term",
    plan: "shift_pro",
    status: "active",
    source: "purchase",
    trialEndsAt: null,
    currentPeriodEnd: new Date(NOW.getTime() + 10 * DAY),
    cancelAtPeriodEnd: false,
    trialUsedAt: null,
    ...overrides
  };
}

describe("employer plans flag", () => {
  afterEach(() => {
    delete process.env.EMPLOYER_PLANS_ENABLED;
  });
  it("is off unless exactly 'enabled'", () => {
    delete process.env.EMPLOYER_PLANS_ENABLED;
    expect(isEmployerPlansEnabled()).toBe(false);
    process.env.EMPLOYER_PLANS_ENABLED = "true";
    expect(isEmployerPlansEnabled()).toBe(false);
    process.env.EMPLOYER_PLANS_ENABLED = "enabled";
    expect(isEmployerPlansEnabled()).toBe(true);
  });
});

describe("effectivePlanFromRow — expiry evaluated at read time", () => {
  it("no row → the track's free plan, trial available", () => {
    expect(effectivePlanFromRow("short_term", null, NOW)).toMatchObject({ plan: "pay_per_shift", status: "none", trialAvailable: true });
    expect(effectivePlanFromRow("long_term", null, NOW)).toMatchObject({ plan: "pay_per_contract", status: "none" });
  });

  it("an active paid plan inside its period applies", () => {
    expect(effectivePlanFromRow("short_term", row(), NOW)).toMatchObject({ plan: "shift_pro", status: "active" });
  });

  it("a paid plan past its period end falls back to free", () => {
    const past = row({ currentPeriodEnd: new Date(NOW.getTime() - 1) });
    expect(effectivePlanFromRow("short_term", past, NOW)).toMatchObject({ plan: "pay_per_shift", status: "expired" });
  });

  it("a canceled plan stays until its period end", () => {
    const canceled = row({ cancelAtPeriodEnd: true });
    expect(effectivePlanFromRow("short_term", canceled, NOW)).toMatchObject({ plan: "shift_pro", cancelAtPeriodEnd: true });
  });

  it("a trial applies until trialEndsAt, then expires; trial no longer available", () => {
    const trial = row({ status: "trialing", source: "trial", currentPeriodEnd: null, trialEndsAt: new Date(NOW.getTime() + DAY), trialUsedAt: NOW });
    expect(effectivePlanFromRow("short_term", trial, NOW)).toMatchObject({ plan: "shift_pro", status: "trialing", trialAvailable: false });
    expect(effectivePlanFromRow("short_term", trial, new Date(NOW.getTime() + 2 * DAY))).toMatchObject({ plan: "pay_per_shift", status: "expired", trialAvailable: false });
  });

  it("a plan stored under the wrong track never applies", () => {
    expect(effectivePlanFromRow("long_term", row(), NOW).plan).toBe("pay_per_contract");
  });
});

type Stored = Record<string, unknown> & { organizationId: string; track: string };

function fakePrisma(initial: Stored[] = []) {
  const rows = [...initial];
  const find = (where: { organizationId_track: { organizationId: string; track: string } }) =>
    rows.find((r) => r.organizationId === where.organizationId_track.organizationId && r.track === where.organizationId_track.track) ?? null;
  return {
    rows,
    prisma: {
      employerPlan: {
        async findUnique(args: { where: { organizationId_track: { organizationId: string; track: string } } }) {
          return find(args.where);
        },
        async create(args: { data: Stored }) {
          if (rows.some((r) => r.organizationId === args.data.organizationId && r.track === args.data.track)) throw new Error("unique");
          rows.push({ ...args.data });
          return args.data;
        },
        async updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }) {
          const hit = rows.filter((r) => Object.entries(args.where).every(([k, v]) => r[k] === v));
          hit.forEach((r) => Object.assign(r, args.data));
          return { count: hit.length };
        },
        async update(args: { where: { organizationId_track: { organizationId: string; track: string } }; data: Record<string, unknown> }) {
          const r = find(args.where);
          if (!r) throw new Error("missing");
          Object.assign(r, args.data);
          return r;
        }
      }
    } as unknown as PrismaClient
  };
}

const ORG = "11111111-1111-4111-8111-111111111111";

describe("startEmployerPlanTrial — 14 days, once per org per track", () => {
  it("starts a 14-day trial on the plan's track", async () => {
    const { prisma, rows } = fakePrisma();
    const result = await startEmployerPlanTrial(prisma, ORG, "shift_business", NOW);
    expect(result).toMatchObject({ ok: true, plan: { plan: "shift_business", status: "trialing", trialAvailable: false } });
    expect(rows[0]).toMatchObject({ track: "short_term", status: "trialing", source: "trial" });
    expect((rows[0]!.trialEndsAt as Date).getTime() - NOW.getTime()).toBe(14 * DAY);
  });

  it("refuses a second trial on the same track, even after the first expired", async () => {
    const { prisma } = fakePrisma();
    await startEmployerPlanTrial(prisma, ORG, "shift_pro", NOW);
    expect(await startEmployerPlanTrial(prisma, ORG, "shift_business", NOW)).toEqual({ ok: false, reason: "already_active" });
    expect(await startEmployerPlanTrial(prisma, ORG, "shift_pro", new Date(NOW.getTime() + 20 * DAY))).toEqual({ ok: false, reason: "trial_used" });
  });

  it("allows one trial per track: a long-term trial while a short-term one runs", async () => {
    const { prisma } = fakePrisma();
    await startEmployerPlanTrial(prisma, ORG, "shift_pro", NOW);
    expect(await startEmployerPlanTrial(prisma, ORG, "contract_plus", NOW)).toMatchObject({ ok: true, plan: { track: "long_term", plan: "contract_plus" } });
  });

  it("rejects free or unknown plans", async () => {
    const { prisma } = fakePrisma();
    expect(await startEmployerPlanTrial(prisma, ORG, "pay_per_shift", NOW)).toEqual({ ok: false, reason: "invalid_plan" });
    expect(await startEmployerPlanTrial(prisma, ORG, "gold", NOW)).toEqual({ ok: false, reason: "invalid_plan" });
  });
});

describe("cancelEmployerPlan", () => {
  it("keeps the plan until its end and marks it not to renew", async () => {
    const { prisma } = fakePrisma([{ organizationId: ORG, ...row() }]);
    const result = await cancelEmployerPlan(prisma, ORG, "short_term", NOW);
    expect(result).toMatchObject({ ok: true, plan: { plan: "shift_pro", status: "active", cancelAtPeriodEnd: true } });
  });

  it("refuses when nothing paid is in force or the track is unknown", async () => {
    const { prisma } = fakePrisma();
    expect(await cancelEmployerPlan(prisma, ORG, "short_term", NOW)).toEqual({ ok: false, reason: "no_paid_plan" });
    expect(await cancelEmployerPlan(prisma, ORG, "weekly", NOW)).toEqual({ ok: false, reason: "invalid_track" });
  });
});
