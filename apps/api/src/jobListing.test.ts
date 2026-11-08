import type { PrismaClient } from "@rwos/database";
import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { registerEmployerPlanRoutes } from "./employerPlanRoutes";
import {
  adminConfirmJobListingOrder,
  adminRejectJobListingOrder,
  claimJobListingETransfer,
  createPendingJobListingOrder,
  getJobListingOverview,
  startJobListingTrial
} from "./jobListingRepository";
import { isListedForWorkers, listedCondition, listedJobWhere, listingVisibilitySelect } from "./jobListingVisibility";

const ORG = "11111111-1111-4111-8111-111111111111";
const LONG_JOB = "44444444-4444-4444-8444-444444444444";
const LONG_JOB_2 = "55555555-5555-4555-8555-555555555555";
const SHORT_JOB = "66666666-6666-4666-8666-666666666666";
const ORDER = "33333333-3333-4333-8333-333333333333";
const NOW = new Date("2026-11-08T12:00:00.000Z");
const DAY = 86_400_000;

describe("worker visibility: a long-term job shows only while listed", () => {
  it("flag off: the where object is returned untouched (byte-identical queries)", () => {
    const where = { status: "approved_for_dispatch" as const, residence: { status: "active" as const } };
    expect(listedJobWhere(where, NOW, false)).toBe(where);
    expect(listingVisibilitySelect(false)).toEqual({});
  });

  it("flag on: adds 'not long-term OR listed now', keeping existing filters and AND clauses", () => {
    const where = { status: "approved_for_dispatch" as const, AND: [{ openClaim: true }] };
    expect(listedJobWhere(where, NOW, true)).toEqual({
      status: "approved_for_dispatch",
      AND: [{ openClaim: true }, listedCondition(NOW)]
    });
    expect(listedCondition(NOW)).toEqual({
      OR: [{ jobLength: { not: "long_term" } }, { jobListing: { is: { listedUntil: { gt: NOW } } } }]
    });
    expect(listingVisibilitySelect(true)).toEqual({ jobLength: true, jobListing: { select: { listedUntil: true } } });
  });

  it("in-code check matches: short-term always, long-term only before listedUntil, everything when off", () => {
    expect(isListedForWorkers({ jobLength: "short_term" }, NOW, true)).toBe(true);
    expect(isListedForWorkers({ jobLength: "long_term", jobListing: null }, NOW, true)).toBe(false);
    expect(isListedForWorkers({ jobLength: "long_term", jobListing: { listedUntil: new Date(NOW.getTime() + DAY) } }, NOW, true)).toBe(true);
    expect(isListedForWorkers({ jobLength: "long_term", jobListing: { listedUntil: NOW } }, NOW, true)).toBe(false);
    expect(isListedForWorkers({ jobLength: "long_term", jobListing: null }, NOW, false)).toBe(true);
  });
});

type Row = Record<string, unknown>;

function fakePrisma() {
  const org: Row = { id: ORG, jobListingTrialUsedAt: null, jobListingFirstMonthUsedAt: null };
  const jobs: Row[] = [
    { id: LONG_JOB, organizationId: ORG, title: "Night caretaker", jobLength: "long_term", status: "approved_for_dispatch", startAt: NOW, createdAt: NOW },
    { id: LONG_JOB_2, organizationId: ORG, title: "Cook", jobLength: "long_term", status: "submitted", startAt: NOW, createdAt: NOW },
    { id: SHORT_JOB, organizationId: ORG, title: "Shift", jobLength: "short_term", status: "submitted", startAt: NOW, createdAt: NOW }
  ];
  const listings: Row[] = [];
  const orders: Row[] = [];
  let seq = 0;
  const listingSelect = (l: Row | undefined) => (l ? { id: l.id, listedUntil: l.listedUntil ?? null, trialEndsAt: l.trialEndsAt ?? null } : null);
  const withListing = (o: Row) => {
    const jobRequestId = listings.find((l) => l.id === o.jobListingId)?.jobRequestId;
    const title = jobs.find((j) => j.id === jobRequestId)?.title;
    return { ...o, organization: { displayName: "Acme" }, jobListing: { jobRequestId, jobRequest: { title } } };
  };
  const statusIn = (value: unknown, where: unknown) => {
    if (where === undefined) return true;
    if (typeof where === "string") return value === where;
    return ((where as { in: string[] }).in ?? []).includes(value as string);
  };
  const prisma: Record<string, unknown> = {
    employerOrganization: {
      async findUnique() {
        return { ...org };
      },
      async updateMany(args: { where: Row; data: Row }) {
        const key = Object.keys(args.where).find((k) => k !== "id") as string;
        if (org[key] !== null) return { count: 0 };
        Object.assign(org, args.data);
        return { count: 1 };
      }
    },
    jobRequest: {
      async findFirst(args: { where: { id: string; organizationId: string } }) {
        const job = jobs.find((j) => j.id === args.where.id && j.organizationId === args.where.organizationId);
        return job ? { ...job, jobListing: listingSelect(listings.find((l) => l.jobRequestId === job.id)) } : null;
      },
      async findMany() {
        return jobs
          .filter((j) => j.jobLength === "long_term")
          .map((j) => ({ ...j, jobListing: listingSelect(listings.find((l) => l.jobRequestId === j.id)) }));
      }
    },
    jobListing: {
      async upsert(args: { where: { jobRequestId: string }; create: Row; update: Row }) {
        let l = listings.find((x) => x.jobRequestId === args.where.jobRequestId);
        if (l) Object.assign(l, args.update);
        else {
          l = { id: `listing-${++seq}`, ...args.create };
          listings.push(l);
        }
        return listingSelect(l);
      },
      async findUniqueOrThrow(args: { where: { id: string } }) {
        const l = listings.find((x) => x.id === args.where.id);
        if (!l) throw new Error("missing");
        return listingSelect(l);
      },
      async update(args: { where: { id: string }; data: Row }) {
        const l = listings.find((x) => x.id === args.where.id) as Row;
        Object.assign(l, args.data);
        return l;
      }
    },
    jobListingOrder: {
      async findFirst(args: { where: Row }) {
        const w = args.where;
        const o = orders
          .filter(
            (x) =>
              (w.id === undefined || x.id === w.id) &&
              (w.organizationId === undefined || x.organizationId === w.organizationId) &&
              (w.jobListingId === undefined || x.jobListingId === w.jobListingId) &&
              (w.method === undefined || x.method === w.method) &&
              statusIn(x.status, w.status)
          )
          .at(-1);
        return o ? withListing(o) : null;
      },
      async findMany(args: { where: Row }) {
        return orders.filter((x) => statusIn(x.status, args.where.status)).map(withListing);
      },
      async findUnique(args: { where: { id: string } }) {
        const o = orders.find((x) => x.id === args.where.id);
        return o ? withListing(o) : null;
      },
      async findUniqueOrThrow(args: { where: { id: string } }) {
        return withListing(orders.find((x) => x.id === args.where.id) as Row);
      },
      async create(args: { data: Row }) {
        const o = { id: seq === 0 ? ORDER : `order-${seq}`, paymentRef: null, paidAt: null, createdAt: NOW, ...args.data };
        seq += 1;
        orders.push(o);
        return withListing(o);
      },
      async update(args: { where: { id: string }; data: Row }) {
        const o = orders.find((x) => x.id === args.where.id) as Row;
        Object.assign(o, args.data);
        return withListing(o);
      },
      async updateMany(args: { where: { id: string; status: unknown }; data: Row }) {
        const o = orders.find((x) => x.id === args.where.id && statusIn(x.status, args.where.status));
        if (!o) return { count: 0 };
        Object.assign(o, args.data);
        return { count: 1 };
      }
    }
  };
  prisma.$transaction = async (fn: (tx: unknown) => unknown) => fn(prisma);
  return { prisma: prisma as unknown as PrismaClient, org, listings, orders };
}

describe("long-term listing: trial, half-price first month, renewals", () => {
  it("starts the org's one 14-day trial with no card; a second job cannot get another trial", async () => {
    const { prisma, org } = fakePrisma();
    const first = await startJobListingTrial(prisma, ORG, LONG_JOB, NOW);
    expect(first).toEqual({
      ok: true,
      listing: { status: "trial", listedUntil: new Date(NOW.getTime() + 14 * DAY).toISOString(), trialEndsAt: new Date(NOW.getTime() + 14 * DAY).toISOString() }
    });
    expect(org.jobListingTrialUsedAt).toEqual(NOW);
    expect(await startJobListingTrial(prisma, ORG, LONG_JOB, NOW)).toEqual({ ok: false, reason: "already_listed" });
    expect(await startJobListingTrial(prisma, ORG, LONG_JOB_2, NOW)).toEqual({ ok: false, reason: "trial_used" });
  });

  it("refuses short-term or foreign jobs", async () => {
    const { prisma } = fakePrisma();
    expect(await startJobListingTrial(prisma, ORG, SHORT_JOB, NOW)).toEqual({ ok: false, reason: "not_long_term" });
    expect(await startJobListingTrial(prisma, "77777777-7777-4777-8777-777777777777", LONG_JOB, NOW)).toEqual({ ok: false, reason: "job_not_found" });
    expect(await createPendingJobListingOrder(prisma, ORG, SHORT_JOB, "e_transfer")).toEqual({ ok: false, reason: "not_long_term" });
  });

  it("first paid month is half price with taxes; confirming lists the job for a month after the trial", async () => {
    const { prisma, org, listings } = fakePrisma();
    await startJobListingTrial(prisma, ORG, LONG_JOB, NOW);
    const created = await createPendingJobListingOrder(prisma, ORG, LONG_JOB, "e_transfer");
    expect(created).toMatchObject({
      ok: true,
      order: { subtotalMinor: 4_950, gstMinor: 248, qstMinor: 494, totalMinor: 5_692, currency: "CAD", discountKind: "first_month_half", status: "pending_payment" }
    });
    // Same method again → the same open order (no duplicates).
    const again = await createPendingJobListingOrder(prisma, ORG, LONG_JOB, "e_transfer");
    expect(again.ok && created.ok && again.order.id === created.order.id).toBe(true);
    const id = created.ok ? created.order.id : "";
    expect(await claimJobListingETransfer(prisma, ORG, id)).toMatchObject({ ok: true, order: { status: "payment_claimed" } });
    expect(await adminConfirmJobListingOrder(prisma, id, NOW)).toMatchObject({ ok: true, order: { status: "paid" } });
    // Trial ends at +14 days; the paid month extends from there.
    const until = new Date(NOW.getTime() + 14 * DAY);
    until.setMonth(until.getMonth() + 1);
    expect(listings[0]?.listedUntil).toEqual(until);
    expect(org.jobListingFirstMonthUsedAt).toEqual(NOW);
    // Double confirm adds nothing.
    expect(await adminConfirmJobListingOrder(prisma, id, NOW)).toEqual({ ok: false, reason: "not_pending" });
    expect(listings[0]?.listedUntil).toEqual(until);

    const overview = await getJobListingOverview(prisma, ORG, NOW);
    expect(overview).toMatchObject({ trialAvailable: false, firstMonthHalf: false, nextMonthPrice: { subtotalMinor: 9_900, totalMinor: 11_383 } });
    expect(overview.listings.find((l) => l.jobRequestId === LONG_JOB)).toMatchObject({ status: "listed", listedUntil: until.toISOString() });
    expect(overview.listings.find((l) => l.jobRequestId === LONG_JOB_2)).toMatchObject({ status: "not_listed", listedUntil: null });
  });

  it("renewal after the first month is full price; a rejected order lists nothing", async () => {
    const { prisma, listings } = fakePrisma();
    const first = await createPendingJobListingOrder(prisma, ORG, LONG_JOB_2, "e_transfer");
    expect(first).toMatchObject({ ok: true, order: { discountKind: "first_month_half", totalMinor: 5_692 } });
    await adminConfirmJobListingOrder(prisma, first.ok ? first.order.id : "", NOW);
    const renewal = await createPendingJobListingOrder(prisma, ORG, LONG_JOB_2, "e_transfer");
    expect(renewal).toMatchObject({ ok: true, order: { discountKind: "none", subtotalMinor: 9_900, gstMinor: 495, qstMinor: 988, totalMinor: 11_383 } });
    const before = listings[0]?.listedUntil;
    expect(await adminRejectJobListingOrder(prisma, renewal.ok ? renewal.order.id : "")).toBe(true);
    expect(listings[0]?.listedUntil).toEqual(before);
  });
});

describe("listing routes", () => {
  afterEach(() => {
    delete process.env.EMPLOYER_PLANS_ENABLED;
  });

  function build() {
    const app = Fastify();
    registerEmployerPlanRoutes(app, {
      prisma: fakePrisma().prisma,
      fallbackOrigin: "http://localhost",
      requireStaff: async (request, reply) => {
        if (request.headers.authorization !== "Bearer staff") {
          reply.code(403).send({ error: "denied" });
          return null;
        }
        return "staff-1";
      },
      requireUser: async (request, reply) => {
        if (!request.headers.authorization) {
          reply.code(401).send({ error: "denied" });
          return null;
        }
        return "user-1";
      },
      isOrganizationManager: async (_userId, organizationId) => organizationId === ORG,
      now: () => NOW
    });
    return app;
  }

  const routes: Array<{ method: "GET" | "POST"; url: string; payload?: Record<string, unknown> }> = [
    { method: "GET", url: `/employer/job-listings?organizationId=${ORG}` },
    { method: "POST", url: `/employer/job-listings/${LONG_JOB}/trial`, payload: { organizationId: ORG } },
    { method: "POST", url: `/employer/job-listings/${LONG_JOB}/pay`, payload: { organizationId: ORG, method: "e_transfer" } },
    { method: "POST", url: `/employer/job-listings/orders/${ORDER}/claim-etransfer`, payload: { organizationId: ORG } },
    { method: "POST", url: `/employer/job-listings/orders/${ORDER}/complete`, payload: { organizationId: ORG } },
    { method: "GET", url: "/platform/job-listing-orders" },
    { method: "POST", url: `/platform/job-listing-orders/${ORDER}/confirm`, payload: {} },
    { method: "POST", url: `/platform/job-listing-orders/${ORDER}/reject`, payload: {} }
  ];

  it("flag off: every listing route is 404, even for staff", async () => {
    const app = build();
    for (const route of routes) {
      const res = await app.inject({ method: route.method, url: route.url, headers: { authorization: "Bearer staff" }, ...(route.payload ? { payload: route.payload } : {}) });
      expect(res.statusCode, route.url).toBe(404);
    }
  });

  it("flag on: employer must manage the org; trial + e-transfer order work; staff route needs staff", async () => {
    process.env.EMPLOYER_PLANS_ENABLED = "enabled";
    const app = build();
    expect((await app.inject({ method: "GET", url: `/employer/job-listings?organizationId=${ORG}` })).statusCode).toBe(401);
    const trial = await app.inject({ method: "POST", url: `/employer/job-listings/${LONG_JOB}/trial`, headers: { authorization: "Bearer x" }, payload: { organizationId: ORG } });
    expect(trial.statusCode).toBe(200);
    expect(trial.json()).toMatchObject({ listing: { status: "trial" } });
    const pay = await app.inject({ method: "POST", url: `/employer/job-listings/${LONG_JOB}/pay`, headers: { authorization: "Bearer x" }, payload: { organizationId: ORG, method: "e_transfer" } });
    expect(pay.statusCode).toBe(201);
    expect(pay.json()).toMatchObject({ order: { totalMinor: 5_692 }, eTransfer: { amount: "56.92 CAD", breakdown: "49.50 CAD + GST 2.48 CAD + QST 4.94 CAD" } });
    expect((await app.inject({ method: "GET", url: "/platform/job-listing-orders", headers: { authorization: "Bearer x" } })).statusCode).toBe(403);
    expect((await app.inject({ method: "GET", url: "/platform/job-listing-orders", headers: { authorization: "Bearer staff" } })).statusCode).toBe(200);
  });
});
