// Phase 1 of the dynamic offer + matching engine (docs/matching/DYNAMIC_OFFER_ENGINE_DESIGN.md).
// The brain: given a job, candidate workers, and the client's willingness-to-pay, choose the offer
// (worker base + incentives) that maximizes expected margin — P(accept) × margin — within a hard
// platform-margin floor and the client's price ceiling. Pure and deterministic. No money moves here;
// this only decides WHAT offer to make.
//
// The ML lives behind a model seam (AcceptanceModel, WillingnessToPayModel). Day one they are
// transparent COLD-START priors from worker preferences and client intake answers; a learned model
// (trained from the offer/outcome log) swaps in later with no change to the optimizer.

export type OfferTerms = Readonly<{
  baseRatePerHourMinor: number; // the worker's governed base ($25/hr)
  transportAllowanceMinor: number; // per shift, 0 if none
  bonusMinor: number; // urgency/scarcity bonus per shift, 0 if none
}>;

export type WorkerFeatures = Readonly<{
  workerIdentityId: string;
  minRatePerHourMinor: number; // will not accept a base below this
  requiresTransport: boolean; // won't take it without a transport allowance
  maxDistanceKm: number;
  reliability: number; // 0..1 from history (cold-start: 0.5)
  pro?: boolean; // Worker Pro — gets priority access to jobs (offered first) when proPriority is on
}>;

export type JobContext = Readonly<{
  hours: number;
  distanceKm: number; // site distance from the worker / city
  hoursUntilShift: number; // time-to-shift, drives escalation
}>;

export type ClientContext = Readonly<{
  billPerHourMinor: number; // what the client is charged for labour ($50/hr)
  extrasMinor: number; // client-side transport/gas already billed (passed through), per shift
  willingnessToPayPerHourMinor: number; // ceiling from intake answers
}>;

// ── model seam ──
export interface AcceptanceModel {
  readonly kind: string;
  predict(worker: WorkerFeatures, offer: OfferTerms, job: JobContext): number; // 0..1
}
export interface WillingnessToPayModel {
  readonly kind: string;
  ceilingMinor(client: ClientContext, job: JobContext): number; // max client price for the job
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

// Cold-start acceptance prior: transparent logistic over the few things we know before any data.
export function createPriorAcceptanceModel(): AcceptanceModel {
  return {
    kind: "cold-start-prior",
    predict(worker, offer, job) {
      if (offer.baseRatePerHourMinor < worker.minRatePerHourMinor) return 0.03; // below their floor
      if (job.distanceKm > worker.maxDistanceKm) return 0.02; // too far
      if (worker.requiresTransport && offer.transportAllowanceMinor <= 0) return 0.08; // needs transport
      // Score: how far the base clears their minimum, plus sweeteners, reliability, and urgency pull.
      const overMin = (offer.baseRatePerHourMinor - worker.minRatePerHourMinor) / Math.max(1, worker.minRatePerHourMinor);
      const sweetener = (offer.transportAllowanceMinor > 0 ? 0.6 : 0) + (offer.bonusMinor > 0 ? 0.5 : 0);
      const reliabilityPull = (worker.reliability - 0.5) * 0.8; // reliable workers accept a bit more readily
      const urgencyPull = job.hoursUntilShift <= 24 ? 0.3 : 0; // last-minute shifts get taken slightly more
      const score = 0.2 + overMin * 2.2 + sweetener + reliabilityPull + urgencyPull;
      return clamp01(sigmoid(score));
    }
  };
}

// Cold-start willingness-to-pay: the client's stated ceiling (from intake) applied to the job.
export function createPriorWillingnessModel(): WillingnessToPayModel {
  return {
    kind: "cold-start-prior",
    ceilingMinor(client, job) {
      return client.willingnessToPayPerHourMinor * job.hours + client.extrasMinor;
    }
  };
}

export type OfferDecision = Readonly<{
  workerIdentityId: string;
  terms: OfferTerms;
  acceptanceProbability: number;
  clientPriceMinor: number;
  workerCostMinor: number;
  marginMinor: number;
  expectedMarginMinor: number; // acceptanceProbability × marginMinor
  reason: string;
}>;

export type OptimizeInput = Readonly<{
  job: JobContext;
  client: ClientContext;
  workers: readonly WorkerFeatures[];
  baseRatePerHourMinor: number; // governed worker base ($25/hr)
  marginFloorMinor: number; // never offer below this platform margin
  incentiveLadder?: readonly Omit<OfferTerms, "baseRatePerHourMinor">[]; // escalation steps (default: time-aware)
  acceptanceModel?: AcceptanceModel;
  willingnessModel?: WillingnessToPayModel;
  // "expected_margin" maximizes P(accept) × margin; "fill_first" prioritizes getting it filled. Default
  // is fill_first within 6h of the shift (fill matters more than margin at the last minute).
  objective?: "expected_margin" | "fill_first";
  // Worker Pro benefit: when true, Pro workers are offered FIRST (ranked ahead of free workers),
  // preserving the objective order within each group. The offer economics are unchanged — this only
  // affects who gets the offer first, which matters most for the best / most urgent jobs.
  proPriority?: boolean;
}>;

function isBetter(c: OfferDecision, best: OfferDecision, objective: "expected_margin" | "fill_first"): boolean {
  if (objective === "fill_first") {
    return c.acceptanceProbability > best.acceptanceProbability || (c.acceptanceProbability === best.acceptanceProbability && c.marginMinor > best.marginMinor);
  }
  return c.expectedMarginMinor > best.expectedMarginMinor;
}

const T = 2500; // ~1h transport allowance

// Time-aware escalation: with lots of runway, offer few sweeteners (protect margin); as the shift
// nears and the job is still unfilled, make bigger incentives available so acceptance can be bought.
// The optimizer still only picks a step if it beats the others on the chosen objective.
export function escalationLadder(hoursUntilShift: number): readonly Omit<OfferTerms, "baseRatePerHourMinor">[] {
  if (hoursUntilShift > 72) return [{ transportAllowanceMinor: 0, bonusMinor: 0 }, { transportAllowanceMinor: T, bonusMinor: 0 }];
  if (hoursUntilShift > 48) return [{ transportAllowanceMinor: 0, bonusMinor: 0 }, { transportAllowanceMinor: T, bonusMinor: 0 }, { transportAllowanceMinor: T, bonusMinor: 1500 }];
  if (hoursUntilShift > 24) return [{ transportAllowanceMinor: 0, bonusMinor: 0 }, { transportAllowanceMinor: T, bonusMinor: 0 }, { transportAllowanceMinor: T, bonusMinor: 2000 }, { transportAllowanceMinor: T, bonusMinor: 3500 }];
  return [{ transportAllowanceMinor: 0, bonusMinor: 0 }, { transportAllowanceMinor: T, bonusMinor: 0 }, { transportAllowanceMinor: T, bonusMinor: 3000 }, { transportAllowanceMinor: T, bonusMinor: 5000 }, { transportAllowanceMinor: T, bonusMinor: 8000 }];
}

// For each candidate worker, pick the offer on the escalation ladder with the highest EXPECTED margin
// that stays within the margin floor and the client's willingness-to-pay ceiling. Ranked best-first.
export function optimizeOffers(input: OptimizeInput): OfferDecision[] {
  const acceptance = input.acceptanceModel ?? createPriorAcceptanceModel();
  const willingness = input.willingnessModel ?? createPriorWillingnessModel();
  const ladder = input.incentiveLadder ?? escalationLadder(input.job.hoursUntilShift);
  const objective = input.objective ?? (input.job.hoursUntilShift <= 6 ? "fill_first" : "expected_margin");
  const ceiling = willingness.ceilingMinor(input.client, input.job);
  const clientPriceMinor = input.client.billPerHourMinor * input.job.hours + input.client.extrasMinor;

  const decisions: OfferDecision[] = [];
  for (const worker of input.workers) {
    let best: OfferDecision | null = null;
    for (const step of ladder) {
      const terms: OfferTerms = { baseRatePerHourMinor: input.baseRatePerHourMinor, ...step };
      const workerCostMinor = terms.baseRatePerHourMinor * input.job.hours + terms.transportAllowanceMinor + terms.bonusMinor;
      const marginMinor = clientPriceMinor - workerCostMinor;
      if (marginMinor < input.marginFloorMinor) continue; // margin floor
      if (clientPriceMinor > ceiling) continue; // willingness-to-pay ceiling
      const p = Number(acceptance.predict(worker, terms, input.job).toFixed(4));
      const expectedMarginMinor = Math.round(p * marginMinor);
      const candidate: OfferDecision = {
        workerIdentityId: worker.workerIdentityId,
        terms,
        acceptanceProbability: p,
        clientPriceMinor,
        workerCostMinor,
        marginMinor,
        expectedMarginMinor,
        reason:
          step.transportAllowanceMinor > 0 || step.bonusMinor > 0
            ? `sweetened (transport ${step.transportAllowanceMinor > 0 ? "yes" : "no"}, bonus ${step.bonusMinor > 0 ? "yes" : "no"}) — expected margin maximized`
            : "base offer — expected margin maximized"
      };
      if (!best || isBetter(candidate, best, objective)) best = candidate;
    }
    if (best) decisions.push(best);
  }
  const proById = new Map(input.workers.map((w) => [w.workerIdentityId, w.pro ? 1 : 0]));
  return decisions.sort((a, b) => {
    if (input.proPriority) {
      const pa = proById.get(a.workerIdentityId) ?? 0;
      const pb = proById.get(b.workerIdentityId) ?? 0;
      if (pb !== pa) return pb - pa; // Pro workers first
    }
    return objective === "fill_first"
      ? b.acceptanceProbability - a.acceptanceProbability || b.expectedMarginMinor - a.expectedMarginMinor
      : b.expectedMarginMinor - a.expectedMarginMinor;
  });
}
