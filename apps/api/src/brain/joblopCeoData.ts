import type { PrismaClient } from "@rwos/database";
import type { JoblopCeoData, KpiSegment, KpiSnapshot } from "./joblopCeoRules";

// Read-only Prisma adapter for the Joblop "CEO" persona: platform-level KPIs and week-over-week trends.
// The CEO rules do the deciding; this only reads bounded, aggregate counts. NOTHING here reads money
// amounts (no pay, invoice totals or payouts): the CEO persona is strategy advice, never a money view.
//
// A single platformKpis() snapshot is memoised for a short TTL so the CEO rules in one sweep share one
// set of aggregate queries instead of repeating them.

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const WINDOW_DAYS = 7;
const SNAPSHOT_TTL_MS = 60_000;
const SEGMENT_CAP = 40;

const APPROVED = "approved_for_dispatch";
const LIVE_ASSIGNMENT = ["confirmed", "worker_acknowledged", "ready_for_attendance", "in_attendance_window", "attendance_handoff", "closed"] as const;

const ratio = (num: number, den: number): number => (den > 0 ? num / den : 0);

/** ISO-8601 week key ("2026-W46"): one strategy card per signal per week. */
export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7; // Monday=1..Sunday=7
  d.setUTCDate(d.getUTCDate() + 4 - day); // nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function createPrismaJoblopCeoData(prisma: PrismaClient): JoblopCeoData {
  let cached: { at: number; snapshot: KpiSnapshot } | null = null;

  async function compute(now: Date): Promise<KpiSnapshot> {
    const windowStart = new Date(now.getTime() - WINDOW_DAYS * DAY_MS);
    const priorStart = new Date(now.getTime() - 2 * WINDOW_DAYS * DAY_MS);

    const [
      workersThis,
      workersPrior,
      employersThis,
      employersPrior,
      offersSentThis,
      offersAcceptedThis,
      offersSentPrior,
      offersAcceptedPrior,
      ordersThis,
      ordersPrior,
      requestsSubmitted,
      requestsApproved,
      caslConsentedContacts,
      openRequests
    ] = await Promise.all([
      prisma.assignment.findMany({ where: { confirmedStartAt: { gte: windowStart, lt: now } }, select: { workerIdentityId: true }, take: 5000 }),
      prisma.assignment.findMany({ where: { confirmedStartAt: { gte: priorStart, lt: windowStart } }, select: { workerIdentityId: true }, take: 5000 }),
      prisma.jobRequest.findMany({ where: { createdAt: { gte: windowStart, lt: now } }, select: { organizationId: true }, take: 5000 }),
      prisma.jobRequest.findMany({ where: { createdAt: { gte: priorStart, lt: windowStart } }, select: { organizationId: true }, take: 5000 }),
      prisma.workerOffer.count({ where: { sentAt: { gte: windowStart, lt: now } } }),
      prisma.workerOffer.count({ where: { status: "accepted", respondedAt: { gte: windowStart, lt: now } } }),
      prisma.workerOffer.count({ where: { sentAt: { gte: priorStart, lt: windowStart } } }),
      prisma.workerOffer.count({ where: { status: "accepted", respondedAt: { gte: priorStart, lt: windowStart } } }),
      prisma.assignment.count({ where: { status: { in: [...LIVE_ASSIGNMENT] }, confirmedEndAt: { gte: windowStart, lt: now } } }),
      prisma.assignment.count({ where: { status: { in: [...LIVE_ASSIGNMENT] }, confirmedEndAt: { gte: priorStart, lt: windowStart } } }),
      prisma.jobRequest.count({ where: { submittedAt: { gte: windowStart, lt: now } } }),
      prisma.jobRequest.count({ where: { status: APPROVED, updatedAt: { gte: windowStart, lt: now } } }),
      // CASL marketing consent lives on the worker HR intake row (marketing_email_opt_in_at).
      prisma.workerHrIntake.count({ where: { marketingEmailOptInAt: { not: null } } }),
      prisma.jobRequest.findMany({
        where: { status: APPROVED, startAt: { gte: now } },
        select: {
          numberOfWorkers: true,
          residence: { select: { city: true } },
          assignments: { where: { status: { in: [...LIVE_ASSIGNMENT] } }, select: { id: true } }
        },
        take: 5000
      })
    ]);

    const distinct = (rows: readonly { workerIdentityId?: string | null; organizationId?: string | null }[], key: "workerIdentityId" | "organizationId") =>
      new Set(rows.map((r) => r[key]).filter((v): v is string => typeof v === "string"));
    const employersThisSet = distinct(employersThis, "organizationId");
    const employersPriorSet = distinct(employersPrior, "organizationId");
    // Dormant: an employer that created work in the prior week but nothing this week.
    const dormantEmployers = [...employersPriorSet].filter((id) => !employersThisSet.has(id)).length;

    // Supply/demand segments by region (worksite city). openPlaces = places still open; filledPlaces = booked.
    const byCity = new Map<string, { openPlaces: number; filledPlaces: number }>();
    for (const r of openRequests) {
      const city = (r.residence?.city ?? "").trim() || "Unknown";
      const filled = r.assignments.length;
      const open = Math.max(0, r.numberOfWorkers - filled);
      const seg = byCity.get(city) ?? { openPlaces: 0, filledPlaces: 0 };
      seg.openPlaces += open;
      seg.filledPlaces += filled;
      byCity.set(city, seg);
    }
    const allOpenPlaces = [...byCity.values()].reduce((a, s) => a + s.openPlaces, 0);
    const allFilledPlaces = [...byCity.values()].reduce((a, s) => a + s.filledPlaces, 0);
    const segments: KpiSegment[] = [...byCity.entries()]
      .map(([city, v]) => ({ key: `region:${city.toLowerCase()}`, label: city, dimension: "region" as const, openPlaces: v.openPlaces, filledPlaces: v.filledPlaces }))
      .sort((a, b) => b.openPlaces - a.openPlaces)
      .slice(0, SEGMENT_CAP);

    return {
      periodKey: isoWeekKey(now),
      activeWorkers: distinct(workersThis, "workerIdentityId").size,
      priorActiveWorkers: distinct(workersPrior, "workerIdentityId").size,
      activeEmployers: employersThisSet.size,
      priorActiveEmployers: employersPriorSet.size,
      openJobs: openRequests.length,
      openPlaces: allOpenPlaces,
      filledPlaces: allFilledPlaces,
      fillRate: ratio(allFilledPlaces, allFilledPlaces + allOpenPlaces),
      offersSent: offersSentThis,
      offersAccepted: offersAcceptedThis,
      acceptanceRate: ratio(offersAcceptedThis, offersSentThis),
      priorAcceptanceRate: ratio(offersAcceptedPrior, offersSentPrior),
      ordersCompleted: ordersThis,
      priorOrdersCompleted: ordersPrior,
      requestsSubmitted,
      requestsApproved,
      dormantEmployers,
      caslConsentedContacts,
      // No campaign table exists before the CASL-marketing phase, so every consented contact is
      // "no recent campaign". The marketing phase replaces this with a real last-campaign lookup.
      caslConsentedNoRecentCampaign: caslConsentedContacts,
      segments
    };
  }

  return {
    async platformKpis(now) {
      if (cached && now.getTime() - cached.at < SNAPSHOT_TTL_MS) return cached.snapshot;
      const snapshot = await compute(now);
      cached = { at: now.getTime(), snapshot };
      return snapshot;
    }
  };
}
