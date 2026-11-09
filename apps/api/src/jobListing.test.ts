import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { adminConfirmEmployerPlanOrder, createPendingEmployerPlanOrder } from "./employerPlanRepository";
import { registerEmployerPlanRoutes } from "./employerPlanRoutes";
import {
  adminConfirmJobListingOrder,
  adminRejectJobListingOrder,
  claimJobListingETransfer,
  createPendingJobListingOrder,
  getJobListingOverview,
  listJobListingOrdersForReview,
  startJobListingTrial
} from "./jobListingRepository";
import { isListedForWorkers, listedCondition, listedJobWhere, listingVisibilitySelect } from "./jobListingVisibility";
import { createPaymentTestPrisma } from "./paymentTestPrisma";

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

const USER = "88888888-8888-4888-8888-888888888888";
const LONG_JOB_3 = "99999999-9999-4999-8999-999999999999";

function fakePrisma() {
  const { prisma, tables } = createPaymentTestPrisma({
    organizations: [
      { id: ORG, displayName: "Acme", legalName: "Acme Care Inc.", createdByUserId: USER, jobListingTrialUsedAt: null, jobListingFirstMonthUsedAt: null }
    ],
    users: [{ id: USER, emailNormalized: "owner@acme.test", phone: "+15145550000", primaryLanguage: "en" }],
    jobs: [
      { id: LONG_JOB, organizationId: ORG, title: "Night caretaker", jobLength: "long_term", status: "approved_for_dispatch", startAt: NOW, createdAt: NOW },
      { id: LONG_JOB_2, organizationId: ORG, title: "Cook", jobLength: "long_term", status: "submitted", startAt: NOW, createdAt: NOW },
      { id: LONG_JOB_3, organizationId: ORG, title: "Driver", jobLength: "long_term", status: "submitted", startAt: NOW, createdAt: NOW },
      { id: SHORT_JOB, organizationId: ORG, title: "Shift", jobLength: "short_term", status: "submitted", startAt: NOW, createdAt: NOW }
    ]
  });
  return { prisma, tables, org: tables.organizations[0] as Record<string, unknown>, listings: tables.listings, orders: tables.listingOrders };
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
    expect(pay.json()).toMatchObject({ order: { totalMinor: 5_692 }, eTransfer: { amount: "$56.92", breakdown: "$49.50 + GST $2.48 + QST $4.94" } });
    expect(pay.json().eTransfer.reference).toMatch(/^JL-[2-9A-HJ-NP-Z]{5}$/);
    expect((await app.inject({ method: "GET", url: "/platform/job-listing-orders", headers: { authorization: "Bearer x" } })).statusCode).toBe(403);
    expect((await app.inject({ method: "GET", url: "/platform/job-listing-orders", headers: { authorization: "Bearer staff" } })).statusCode).toBe(200);
  });
});

describe("half-price first month is used once per company (S5)", () => {
  it("three orders opened at the same moment: only one gets 50% off", async () => {
    const { prisma, orders } = fakePrisma();
    const results = await Promise.all(
      [LONG_JOB, LONG_JOB_2, LONG_JOB_3].map((job) => createPendingJobListingOrder(prisma, ORG, job, "e_transfer"))
    );
    expect(results.every((r) => r.ok)).toBe(true);
    const kinds = orders.map((o) => o.discountKind).sort();
    expect(kinds).toEqual(["first_month_half", "none", "none"]);
    expect(orders.filter((o) => o.discountKind === "none").every((o) => o.totalMinor === 11_383)).toBe(true);
    // The overview no longer offers half price to the next job either.
    expect(await getJobListingOverview(prisma, ORG, NOW)).toMatchObject({ firstMonthHalf: false, nextMonthPrice: { totalMinor: 11_383 } });
  });

  it("a rejected half-price order frees the discount for the next order", async () => {
    const { prisma } = fakePrisma();
    const first = await createPendingJobListingOrder(prisma, ORG, LONG_JOB, "e_transfer");
    expect(first).toMatchObject({ ok: true, order: { discountKind: "first_month_half" } });
    expect(await adminRejectJobListingOrder(prisma, first.ok ? first.order.id : "", NOW)).toBe(true);
    expect(await createPendingJobListingOrder(prisma, ORG, LONG_JOB_2, "e_transfer")).toMatchObject({ ok: true, order: { discountKind: "first_month_half" } });
  });

  it("older half-price orders: staff can confirm only the first; the others are blocked and list nothing", async () => {
    const { prisma, tables, org } = fakePrisma();
    // Three half-price orders created before the fix (one per job), all claimed sent.
    for (const [index, job] of [LONG_JOB, LONG_JOB_2, LONG_JOB_3].entries()) {
      tables.listings.push({ id: `old-listing-${index}`, jobRequestId: job, organizationId: ORG, status: "unlisted", listedUntil: null, trialEndsAt: null });
      tables.listingOrders.push({
        id: `old-order-${index}`, jobListingId: `old-listing-${index}`, organizationId: ORG, months: 1,
        subtotalMinor: 4_950, gstMinor: 248, qstMinor: 494, totalMinor: 5_692, currency: "CAD",
        discountKind: "first_month_half", method: "e_transfer", status: "payment_claimed", paymentRef: null, shortRef: null,
        paidAt: null, createdAt: NOW, updatedAt: NOW
      });
    }
    expect(await adminConfirmJobListingOrder(prisma, "old-order-0", NOW)).toMatchObject({ ok: true, order: { status: "paid" } });
    expect(org.jobListingFirstMonthUsedAt).toEqual(NOW);
    expect(await adminConfirmJobListingOrder(prisma, "old-order-1", NOW)).toEqual({ ok: false, reason: "discount_already_used" });
    expect(await adminConfirmJobListingOrder(prisma, "old-order-2", NOW)).toEqual({ ok: false, reason: "discount_already_used" });
    expect(tables.listingOrders.find((o) => o.id === "old-order-1")?.status).toBe("payment_claimed");
    expect(tables.listings.find((l) => l.id === "old-listing-1")?.listedUntil).toBeNull();
    expect(tables.receipts).toHaveLength(1);
    expect(await adminRejectJobListingOrder(prisma, "old-order-1", NOW)).toBe(true);
  });
});

describe("listing receipts and staff confirm details (B6, S9, S19)", () => {
  it("confirming writes one numbered receipt with the issuer, the company, the job, the period and the taxes", async () => {
    const { prisma, tables } = fakePrisma();
    await startJobListingTrial(prisma, ORG, LONG_JOB, NOW);
    const created = await createPendingJobListingOrder(prisma, ORG, LONG_JOB, "e_transfer");
    const id = created.ok ? created.order.id : "";
    expect(created.ok && created.order.reference).toMatch(/^JL-[2-9A-HJ-NP-Z]{5}$/);
    const claimed = await claimJobListingETransfer(prisma, ORG, id, NOW);
    expect(claimed).toMatchObject({ ok: true, order: { status: "payment_claimed", claimedAt: NOW.toISOString() } });
    const result = await adminConfirmJobListingOrder(prisma, id, NOW, { interacReference: "CA1234XYZ", amountReceivedMinor: 5_692 });
    expect(result.ok && result.receiptId).toBeTruthy();
    const receipt = tables.receipts[0]!;
    const trialEnd = new Date(NOW.getTime() + 14 * DAY);
    const end = new Date(trialEnd);
    end.setMonth(end.getMonth() + 1);
    expect(receipt).toMatchObject({
      receiptNumber: "RCPT-2026-000001",
      kind: "job_listing",
      itemLabel: "Night caretaker",
      discountKind: "first_month_half",
      subtotalMinor: 4_950,
      gstMinor: 248,
      qstMinor: 494,
      totalMinor: 5_692,
      paymentMethod: "e_transfer",
      paymentRef: "CA1234XYZ",
      billedToName: "Acme",
      billedToLegalName: "Acme Care Inc.",
      issuerLegalName: "9375-7649 Québec Inc.",
      issuerGstNumber: "762614485RT0001",
      issuerQstNumber: "1225519125TQ0002"
    });
    expect(receipt.issuerAddress).toContain("Laval");
    expect(receipt.periodStart).toEqual(trialEnd);
    expect(receipt.periodEnd).toEqual(end);
    const order = tables.listingOrders[0]!;
    expect(order).toMatchObject({ paymentRef: "CA1234XYZ", amountReceivedMinor: 5_692, staffNote: "Amount received: $56.92" });
    // A second confirm writes no second receipt.
    expect(await adminConfirmJobListingOrder(prisma, id, NOW)).toEqual({ ok: false, reason: "not_pending" });
    expect(tables.receipts).toHaveLength(1);
  });

  it("refuses to confirm when less money arrived than the total", async () => {
    const { prisma, tables } = fakePrisma();
    const created = await createPendingJobListingOrder(prisma, ORG, LONG_JOB, "e_transfer");
    const id = created.ok ? created.order.id : "";
    expect(await adminConfirmJobListingOrder(prisma, id, NOW, { amountReceivedMinor: 4_950 })).toEqual({ ok: false, reason: "amount_short" });
    expect(tables.listingOrders[0]?.status).toBe("pending_payment");
    expect(tables.receipts).toHaveLength(0);
  });

  it("the done list keeps confirmed and rejected orders with their dates", async () => {
    const { prisma } = fakePrisma();
    const a = await createPendingJobListingOrder(prisma, ORG, LONG_JOB, "e_transfer");
    const b = await createPendingJobListingOrder(prisma, ORG, LONG_JOB_2, "e_transfer");
    await adminConfirmJobListingOrder(prisma, a.ok ? a.order.id : "", NOW);
    await adminRejectJobListingOrder(prisma, b.ok ? b.order.id : "", NOW);
    const done = await listJobListingOrdersForReview(prisma, "done");
    expect(done.map((o) => o.status).sort()).toEqual(["canceled", "paid"]);
    expect(done.find((o) => o.status === "paid")).toMatchObject({ receiptNumber: "RCPT-2026-000001", jobTitle: "Night caretaker" });
    expect(done.find((o) => o.status === "canceled")).toMatchObject({ cancelReason: "staff_rejected", canceledAt: NOW.toISOString() });
    expect(await listJobListingOrdersForReview(prisma, "open")).toHaveLength(0);
  });
});

describe("one receipt sequence for plans and listings", () => {
  it("numbers follow each other across plan and listing payments; the lock is taken when ordering", async () => {
    const { prisma, tables } = fakePrisma();
    let locks = 0;
    const raw = prisma as unknown as { $queryRaw: () => Promise<unknown[]> };
    raw.$queryRaw = async () => {
      locks += 1;
      return [];
    };
    const listingOrder = await createPendingJobListingOrder(prisma, ORG, LONG_JOB, "e_transfer");
    expect(locks).toBe(1);
    const planOrder = await createPendingEmployerPlanOrder(prisma, ORG, "shift_pro", "e_transfer");
    await adminConfirmEmployerPlanOrder(prisma, planOrder.id, NOW);
    await adminConfirmJobListingOrder(prisma, listingOrder.ok ? listingOrder.order.id : "", NOW);
    expect(tables.receipts.map((r) => [r.receiptNumber, r.kind])).toEqual([
      ["RCPT-2026-000001", "employer_plan"],
      ["RCPT-2026-000002", "job_listing"]
    ]);
  });
});
