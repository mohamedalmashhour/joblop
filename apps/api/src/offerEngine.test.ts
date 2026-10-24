import { describe, expect, it } from "vitest";
import { createPriorAcceptanceModel, escalationLadder, optimizeOffers, type WorkerFeatures } from "./offerEngine";

// Client charged $50/hr, worker base $25/hr, 8-hour shift in Montréal (no client extras).
const job = { hours: 8, distanceKm: 10, hoursUntilShift: 72 };
const client = { billPerHourMinor: 5000, extrasMinor: 0, willingnessToPayPerHourMinor: 6000 };
const base = {
  job,
  client,
  baseRatePerHourMinor: 2500,
  marginFloorMinor: 1000
};
const worker = (over: Partial<WorkerFeatures> = {}): WorkerFeatures => ({
  workerIdentityId: "w1",
  minRatePerHourMinor: 2500,
  requiresTransport: false,
  maxDistanceKm: 100,
  reliability: 0.6,
  ...over
});

describe("dynamic offer optimizer", () => {
  it("sweetens the offer for a worker who requires transport", () => {
    const d = optimizeOffers({ ...base, workers: [worker({ requiresTransport: true })] })[0]!;
    expect(d.terms.transportAllowanceMinor).toBeGreaterThan(0); // base-only would barely be accepted
    expect(d.marginMinor).toBe(d.clientPriceMinor - d.workerCostMinor);
    expect(d.expectedMarginMinor).toBe(Math.round(d.acceptanceProbability * d.marginMinor));
  });

  it("respects the margin floor — won't add incentives that breach it", () => {
    // Client price = 5000*8 = 40000. Base worker cost = 20000 (margin 20000). A transport step costs
    // 2500 more (margin 17500). With a floor of 18000, only the base offer qualifies.
    const d = optimizeOffers({ ...base, marginFloorMinor: 18000, workers: [worker({ requiresTransport: true })] })[0]!;
    expect(d.terms.transportAllowanceMinor).toBe(0);
    expect(d.marginMinor).toBeGreaterThanOrEqual(18000);
  });

  it("makes no offer above the client's willingness-to-pay", () => {
    // WTP $40/hr → ceiling 32000, but the labour price alone is 40000. No offer is viable.
    const decisions = optimizeOffers({ ...base, client: { ...client, willingnessToPayPerHourMinor: 4000 }, workers: [worker()] });
    expect(decisions).toHaveLength(0);
  });

  it("flags a worker whose minimum is above the base as unlikely to accept", () => {
    const d = optimizeOffers({ ...base, workers: [worker({ minRatePerHourMinor: 3000 })] })[0]!;
    expect(d.acceptanceProbability).toBeLessThan(0.1);
  });

  it("ranks candidates by expected margin, best first", () => {
    const ds = optimizeOffers({
      ...base,
      workers: [worker({ workerIdentityId: "reliable", reliability: 0.9 }), worker({ workerIdentityId: "far", maxDistanceKm: 1 })]
    });
    expect(ds[0]!.expectedMarginMinor).toBeGreaterThanOrEqual(ds[ds.length - 1]!.expectedMarginMinor);
    // the far worker (distance 10 > max 1) is near-unacceptable
    expect(ds.find((d) => d.workerIdentityId === "far")!.acceptanceProbability).toBeLessThan(0.1);
  });

  it("offers bigger incentives as the shift nears (escalation)", () => {
    expect(escalationLadder(100).length).toBeLessThan(escalationLadder(30).length);
    expect(escalationLadder(30).length).toBeLessThan(escalationLadder(3).length);
    const maxBonus = (h: number) => Math.max(...escalationLadder(h).map((s) => s.bonusMinor));
    expect(maxBonus(3)).toBeGreaterThan(maxBonus(100));
  });

  it("prioritizes fill over margin at the last minute", () => {
    const urgent = { ...job, hoursUntilShift: 3 };
    const fillFirst = optimizeOffers({ ...base, job: urgent, workers: [worker({ requiresTransport: true })] })[0]!;
    const marginFirst = optimizeOffers({ ...base, job: urgent, objective: "expected_margin", workers: [worker({ requiresTransport: true })] })[0]!;
    expect(fillFirst.acceptanceProbability).toBeGreaterThanOrEqual(marginFirst.acceptanceProbability);
  });

  it("Worker Pro: proPriority offers Pro workers first, without changing the margin", () => {
    // Free worker is slightly more attractive (higher reliability) so would normally rank first.
    const freeBetter = worker({ workerIdentityId: "free", reliability: 0.95, pro: false });
    const proWorker = worker({ workerIdentityId: "pro", reliability: 0.6, pro: true });
    const withoutPriority = optimizeOffers({ ...base, workers: [freeBetter, proWorker] });
    expect(withoutPriority[0]!.workerIdentityId).toBe("free"); // margin order
    const withPriority = optimizeOffers({ ...base, proPriority: true, workers: [freeBetter, proWorker] });
    expect(withPriority[0]!.workerIdentityId).toBe("pro"); // Pro offered first
    // Same offer economics for the Pro worker either way (priority reorders, doesn't distort margin).
    const proDecision = withPriority.find((d) => d.workerIdentityId === "pro")!;
    const proDecisionNoPrio = withoutPriority.find((d) => d.workerIdentityId === "pro")!;
    expect(proDecision.marginMinor).toBe(proDecisionNoPrio.marginMinor);
  });

  it("acceptance model: below-minimum base is rejected outright", () => {
    const m = createPriorAcceptanceModel();
    const p = m.predict(worker({ minRatePerHourMinor: 3000 }), { baseRatePerHourMinor: 2500, transportAllowanceMinor: 0, bonusMinor: 0 }, job);
    expect(p).toBeLessThan(0.05);
  });
});
