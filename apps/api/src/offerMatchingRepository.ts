import type { PrismaClient } from "@rwos/database";
import {
  optimizeOffers,
  type AcceptanceModel,
  type ClientContext,
  type JobContext,
  type OfferDecision,
  type WorkerFeatures
} from "./offerEngine";
import {
  ACCEPTANCE_FEATURE_DIM,
  acceptanceFeatures,
  createLearnedAcceptanceModel,
  logLoss,
  trainLogistic,
  type TrainingSample
} from "./offerLearning";

// Below this many labelled offers, the learned model isn't trusted and the optimizer uses the prior.
export const MIN_SAMPLES_FOR_LEARNED_MODEL = 20;

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

// ── the learning loop ──

const LABELLED_OUTCOMES = ["accepted", "declined", "ignored", "expired"] as const;

export type RetrainResult = Readonly<{ sampleSize: number; logLoss: number; trained: boolean }>;

// Fit the acceptance model on the WHOLE offer/outcome history and store it as the active version.
// This is the loop: call it on a schedule (or after a batch of outcomes) and the optimizer gets smarter.
export async function retrainAcceptanceModel(prisma: PrismaClient): Promise<RetrainResult> {
  const rows = await prisma.offerDecisionEvent.findMany({
    where: { outcome: { in: [...LABELLED_OUTCOMES] } },
    select: {
      baseRateMinor: true, featMinRatePerHourMinor: true, transportAllowanceMinor: true, bonusMinor: true,
      featRequiresTransport: true, featReliability: true, hoursUntilShift: true, distanceKm: true, outcome: true
    }
  });
  if (rows.length < MIN_SAMPLES_FOR_LEARNED_MODEL) {
    return { sampleSize: rows.length, logLoss: 0, trained: false };
  }
  const samples: TrainingSample[] = rows.map((r) => ({
    x: acceptanceFeatures({
      baseRatePerHourMinor: r.baseRateMinor,
      minRatePerHourMinor: r.featMinRatePerHourMinor,
      transportAllowanceMinor: r.transportAllowanceMinor,
      bonusMinor: r.bonusMinor,
      requiresTransport: r.featRequiresTransport,
      reliability: r.featReliability,
      hoursUntilShift: r.hoursUntilShift,
      distanceKm: r.distanceKm
    }),
    y: r.outcome === "accepted" ? 1 : 0
  }));
  const weights = trainLogistic(samples);
  const loss = logLoss(weights, samples);
  await prisma.$transaction(async (tx) => {
    await tx.matchingModelVersion.updateMany({ where: { modelType: "acceptance", isActive: true }, data: { isActive: false } });
    await tx.matchingModelVersion.create({
      data: { modelType: "acceptance", weights: weights as unknown as object, featureDim: ACCEPTANCE_FEATURE_DIM, sampleSize: samples.length, logLoss: loss, isActive: true }
    });
  });
  return { sampleSize: samples.length, logLoss: loss, trained: true };
}

// Load the active learned acceptance model, or null to fall back to the cold-start prior.
export async function loadActiveAcceptanceModel(prisma: PrismaClient): Promise<AcceptanceModel | null> {
  const active = await prisma.matchingModelVersion.findFirst({ where: { modelType: "acceptance", isActive: true } });
  if (!active || active.sampleSize < MIN_SAMPLES_FOR_LEARNED_MODEL) return null;
  const weights = active.weights as unknown as number[];
  if (!Array.isArray(weights)) return null;
  return createLearnedAcceptanceModel(weights);
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
  // Use the learned model when the loop has trained one on enough history; otherwise the prior.
  const learned = await loadActiveAcceptanceModel(prisma);
  const modelKind = learned?.kind ?? "cold-start-prior";
  const decisions = optimizeOffers({
    job: input.job,
    client: input.client,
    workers,
    baseRatePerHourMinor: input.baseRatePerHourMinor,
    marginFloorMinor: input.marginFloorMinor,
    ...(learned ? { acceptanceModel: learned } : {})
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
        modelKind,
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
