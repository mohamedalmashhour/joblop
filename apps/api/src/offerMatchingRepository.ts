import type { PrismaClient } from "@rwos/database";
import {
  optimizeOffers,
  type ClientContext,
  type JobContext,
  type OfferDecision,
  type WorkerFeatures
} from "./offerEngine";

// Dynamic offer engine P2 — signal capture. Loads worker features (preferences + reliability derived
// from the offer log), runs the optimizer, and APPENDS each proposal to offer_decision_events (the
// training set). Outcomes are recorded as they happen. See docs/matching/DYNAMIC_OFFER_ENGINE_DESIGN.md.

export const OFFER_OUTCOMES = ["proposed", "offered", "accepted", "declined", "ignored", "expired"] as const;
export type OfferOutcome = (typeof OFFER_OUTCOMES)[number];

// Reliability from the worker's own history: Laplace-smoothed accept rate over decided offers.
// Cold-start (no history) lands at 0.5; it moves toward the worker's realized accept rate with data.
export function reliabilityFrom(accepted: number, declinedOrMissed: number): number {
  return (accepted + 1) / (accepted + declinedOrMissed + 2);
}

async function loadWorkerFeatures(prisma: PrismaClient, workerIdentityId: string): Promise<WorkerFeatures> {
  const pref = await prisma.workerOfferPreference.findUnique({ where: { workerIdentityId } });
  const [accepted, declinedOrMissed] = await Promise.all([
    prisma.offerDecisionEvent.count({ where: { workerIdentityId, outcome: "accepted" } }),
    prisma.offerDecisionEvent.count({ where: { workerIdentityId, outcome: { in: ["declined", "ignored", "expired"] } } })
  ]);
  return {
    workerIdentityId,
    minRatePerHourMinor: pref?.minRatePerHourMinor ?? 0,
    requiresTransport: pref?.requiresTransport ?? false,
    maxDistanceKm: pref?.maxDistanceKm ?? 100,
    reliability: reliabilityFrom(accepted, declinedOrMissed)
  };
}

export type ProposeInput = Readonly<{
  jobRequestId?: string | null;
  job: JobContext;
  client: ClientContext;
  workerIdentityIds: readonly string[];
  baseRatePerHourMinor: number;
  marginFloorMinor: number;
}>;

export type LoggedDecision = OfferDecision & Readonly<{ eventId: string }>;

// Run the optimizer over the candidate workers and append each resulting proposal to the log.
export async function proposeAndLogOffers(prisma: PrismaClient, input: ProposeInput): Promise<LoggedDecision[]> {
  const workers = await Promise.all(input.workerIdentityIds.map((id) => loadWorkerFeatures(prisma, id)));
  const featureById = new Map(workers.map((w) => [w.workerIdentityId, w]));
  const decisions = optimizeOffers({
    job: input.job,
    client: input.client,
    workers,
    baseRatePerHourMinor: input.baseRatePerHourMinor,
    marginFloorMinor: input.marginFloorMinor
  });
  const logged: LoggedDecision[] = [];
  for (const d of decisions) {
    const f = featureById.get(d.workerIdentityId)!;
    const event = await prisma.offerDecisionEvent.create({
      data: {
        jobRequestId: input.jobRequestId ?? null,
        workerIdentityId: d.workerIdentityId,
        baseRateMinor: d.terms.baseRatePerHourMinor,
        transportAllowanceMinor: d.terms.transportAllowanceMinor,
        bonusMinor: d.terms.bonusMinor,
        clientPriceMinor: d.clientPriceMinor,
        workerCostMinor: d.workerCostMinor,
        marginMinor: d.marginMinor,
        acceptanceProbability: d.acceptanceProbability,
        modelKind: "cold-start-prior",
        hours: input.job.hours,
        distanceKm: input.job.distanceKm,
        hoursUntilShift: input.job.hoursUntilShift,
        willingnessToPayPerHourMinor: input.client.willingnessToPayPerHourMinor,
        featReliability: f.reliability,
        featRequiresTransport: f.requiresTransport,
        featMinRatePerHourMinor: f.minRatePerHourMinor,
        outcome: "proposed"
      },
      select: { id: true }
    });
    logged.push({ ...d, eventId: event.id });
  }
  return logged;
}

export async function recordOfferOutcome(
  prisma: PrismaClient,
  eventId: string,
  outcome: OfferOutcome
): Promise<boolean> {
  const res = await prisma.offerDecisionEvent.updateMany({
    where: { id: eventId },
    data: { outcome, outcomeAt: new Date() }
  });
  return res.count === 1;
}
