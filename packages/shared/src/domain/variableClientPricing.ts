// Variable client-side pricing capsule (dynamic offer engine — client money).
//
// The base money model (platformPricing.ts) is margin-NEUTRAL: the urgent premium and the funded
// allowances pass through to the worker, so the platform's cut is unchanged. This capsule adds the
// three ways Joblop charges the CLIENT more and KEEPS it as platform revenue, per the owner model
// ("some clients will pay more — emergency, far from our place"):
//
//   1. Emergency surcharge — an urgent/immediate job costs the client a % of labour that the worker
//      does NOT see. (The worker still gets the separate +$5/hr pass-through incentive to take it.)
//   2. Distance surcharge — a job outside the home-base free radius bills gas + travel-time by km.
//   3. Demand uplift — when a job is hard to fill, raise the client price toward their willingness-to-
//      pay ceiling, capped so it never exceeds what intake said they'd pay.
//
// All amounts are integer minor units (cents); all rates are parts-per-million (1_000_000 = 100%).
// Pure and deterministic. No money moves here — this only computes what to quote. The quote is still
// subject to the FINANCE_LIVE gate downstream like every other number.

const PPM = 1_000_000;
const roundHalfUp = (v: number): number => Math.floor(v + 0.5);
const nonNegInt = (v: number): number => (Number.isFinite(v) && v > 0 ? Math.trunc(v) : 0);

// ── owner-configurable constants (admin override is a later slice) ──────────────────────────────

/** Home base = greater Montréal. Jobs within this radius incur no distance surcharge. */
export const DISTANCE_FREE_RADIUS_KM = 25;
/** Fuel reimbursement billed to the client per surcharged km: C$0.25/km. */
export const GAS_RATE_PER_KM_MINOR = 25;
/** Assumed driving time per km, to price the worker's travel duration. */
export const TRAVEL_TIME_MINUTES_PER_KM = 1;
/** Rate the client is billed for travel time, per hour: C$25.00/hr. */
export const TRAVEL_TIME_RATE_PER_HOUR_MINOR = 2500;

/** Emergency client surcharge as a % of the client labour bill, by urgency (platform keeps it). */
export const URGENT_CLIENT_SURCHARGE_PPM = 150_000; // +15% for an urgent job
export const IMMEDIATE_CLIENT_SURCHARGE_PPM = 300_000; // +30% for an immediate job

/** Ceiling on demand-based uplift: at most +25% over the base client price, and never past WTP. */
export const MAX_DEMAND_UPLIFT_PPM = 250_000;

// ── 1. emergency surcharge (client-only, platform-kept) ─────────────────────────────────────────

export function emergencyClientSurchargePpm(urgency: string | null | undefined): number {
  if (urgency === "immediate") return IMMEDIATE_CLIENT_SURCHARGE_PPM;
  if (urgency === "urgent") return URGENT_CLIENT_SURCHARGE_PPM;
  return 0;
}

/** The emergency fee the client pays on top of labour; the worker never sees it. */
export function emergencyClientSurchargeMinor(input: {
  labourClientMinor: number;
  urgency: string | null | undefined;
}): number {
  const labour = nonNegInt(input.labourClientMinor);
  if (labour === 0) return 0;
  return roundHalfUp((labour * emergencyClientSurchargePpm(input.urgency)) / PPM);
}

// ── 2. distance surcharge (gas + travel time, client-billed) ────────────────────────────────────

export type DistanceSurcharge = Readonly<{
  billableKm: number; // km beyond the free radius, times the trip multiplier
  gasMinor: number;
  travelTimeMinor: number;
  totalMinor: number;
}>;

/**
 * Gas + travel-time billed to the client for a worksite beyond the free radius. Round trip by default
 * (the worker drives there and back). Returns all-zero inside the free radius.
 */
export function distanceSurchargeMinor(input: {
  distanceKm: number;
  roundTrip?: boolean;
  freeRadiusKm?: number;
}): DistanceSurcharge {
  const distance = Number.isFinite(input.distanceKm) && input.distanceKm > 0 ? input.distanceKm : 0;
  const freeRadius = input.freeRadiusKm ?? DISTANCE_FREE_RADIUS_KM;
  const tripMultiplier = (input.roundTrip ?? true) ? 2 : 1;
  const billableKm = Math.max(0, distance - freeRadius) * tripMultiplier;
  if (billableKm <= 0) return { billableKm: 0, gasMinor: 0, travelTimeMinor: 0, totalMinor: 0 };
  const gasMinor = roundHalfUp(billableKm * GAS_RATE_PER_KM_MINOR);
  const travelMinutes = billableKm * TRAVEL_TIME_MINUTES_PER_KM;
  const travelTimeMinor = roundHalfUp((travelMinutes / 60) * TRAVEL_TIME_RATE_PER_HOUR_MINOR);
  return { billableKm, gasMinor, travelTimeMinor, totalMinor: gasMinor + travelTimeMinor };
}

// ── 3. demand uplift toward the willingness-to-pay ceiling (client-only, platform-kept) ──────────

/**
 * Raise the client price toward their stated ceiling when a job is hard to fill. `demandSignal` is
 * 0..1 (0 = easy to fill, 1 = very hard — e.g. derived from how far up the escalation ladder the
 * optimizer had to go). The uplift is capped at MAX_DEMAND_UPLIFT_PPM of base AND never pushes the
 * total client price past the ceiling. Returns 0 when there is no headroom.
 */
export function demandClientUpliftMinor(input: {
  baseClientMinor: number;
  ceilingMinor: number;
  demandSignal: number;
  maxUpliftPpm?: number;
}): number {
  const base = nonNegInt(input.baseClientMinor);
  const ceiling = nonNegInt(input.ceilingMinor);
  const signal = Math.max(0, Math.min(1, Number.isFinite(input.demandSignal) ? input.demandSignal : 0));
  const headroom = Math.max(0, ceiling - base);
  if (base === 0 || headroom === 0 || signal === 0) return 0;
  const maxUpliftPpm = input.maxUpliftPpm ?? MAX_DEMAND_UPLIFT_PPM;
  const byRate = roundHalfUp((base * maxUpliftPpm * signal) / PPM);
  return Math.min(byRate, headroom);
}

// ── assembled client quote ───────────────────────────────────────────────────────────────────────

export type VariableClientQuote = Readonly<{
  labourClientMinor: number; // base labour the client pays (E × billable hours), already computed upstream
  allowancesClientMinor: number; // funded transport/meal/lodging the client funds, already computed upstream
  emergencySurchargeMinor: number; // (1) platform-kept
  distanceSurcharge: DistanceSurcharge; // (2) billed to client, split 50/50 below
  distanceWorkerMinor: number; // worker's half of the distance surcharge (travel reimbursement; odd cent to worker)
  distancePlatformMinor: number; // platform's half of the distance surcharge
  demandUpliftMinor: number; // (3) platform-kept
  /** Pre-tax client subtotal = labour + allowances + emergency + distance + demand uplift. */
  clientSubtotalMinor: number;
  /** What the platform keeps on top of the base margin (emergency + demand uplift + its distance half). */
  platformKeptExtrasMinor: number;
  /** What the worker receives on top of base pay from these extras (its distance half). */
  workerExtrasMinor: number;
}>;

/** Split the distance surcharge 50/50; the odd minor unit goes to the WORKER (travel reimbursement). */
export function splitDistanceSurchargeMinor(totalMinor: number): Readonly<{ workerMinor: number; platformMinor: number }> {
  const total = nonNegInt(totalMinor);
  const platformMinor = Math.floor(total / 2);
  return { workerMinor: total - platformMinor, platformMinor };
}

/**
 * Assemble the full variable client quote (pre-tax) from the base labour/allowance figures plus the
 * three variable components. GST/QST is applied downstream by the invoice engine on this subtotal.
 */
export function buildVariableClientQuote(input: {
  labourClientMinor: number;
  allowancesClientMinor?: number;
  urgency?: string | null;
  distanceKm?: number;
  roundTrip?: boolean;
  freeRadiusKm?: number;
  willingnessCeilingMinor?: number;
  demandSignal?: number;
  maxUpliftPpm?: number;
}): VariableClientQuote {
  const labour = nonNegInt(input.labourClientMinor);
  const allowances = nonNegInt(input.allowancesClientMinor ?? 0);
  const emergencySurchargeMinor = emergencyClientSurchargeMinor({
    labourClientMinor: labour,
    urgency: input.urgency
  });
  const distanceSurcharge = distanceSurchargeMinor({
    distanceKm: input.distanceKm ?? 0,
    ...(input.roundTrip !== undefined ? { roundTrip: input.roundTrip } : {}),
    ...(input.freeRadiusKm !== undefined ? { freeRadiusKm: input.freeRadiusKm } : {})
  });
  // The base used for the demand check is everything the client already owes before the demand uplift.
  const baseBeforeDemand = labour + allowances + emergencySurchargeMinor + distanceSurcharge.totalMinor;
  const demandUpliftMinor =
    input.willingnessCeilingMinor !== undefined && input.demandSignal !== undefined
      ? demandClientUpliftMinor({
          baseClientMinor: baseBeforeDemand,
          ceilingMinor: input.willingnessCeilingMinor,
          demandSignal: input.demandSignal,
          ...(input.maxUpliftPpm !== undefined ? { maxUpliftPpm: input.maxUpliftPpm } : {})
        })
      : 0;
  const clientSubtotalMinor = baseBeforeDemand + demandUpliftMinor;
  const distanceSplit = splitDistanceSurchargeMinor(distanceSurcharge.totalMinor);
  return {
    labourClientMinor: labour,
    allowancesClientMinor: allowances,
    emergencySurchargeMinor,
    distanceSurcharge,
    distanceWorkerMinor: distanceSplit.workerMinor,
    distancePlatformMinor: distanceSplit.platformMinor,
    demandUpliftMinor,
    clientSubtotalMinor,
    platformKeptExtrasMinor: emergencySurchargeMinor + demandUpliftMinor + distanceSplit.platformMinor,
    workerExtrasMinor: distanceSplit.workerMinor
  };
}
