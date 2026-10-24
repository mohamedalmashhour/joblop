import { describe, expect, it } from "vitest";
import { acceptanceFeatures, createLearnedAcceptanceModel, logLoss, trainLogistic, type TrainingSample } from "./offerLearning";

function sample(over: { transport?: boolean; overMinPos?: boolean; reliability?: number }, y: 0 | 1): TrainingSample {
  return {
    x: acceptanceFeatures({
      baseRatePerHourMinor: over.overMinPos ? 2800 : 2500,
      minRatePerHourMinor: 2500,
      transportAllowanceMinor: over.transport ? 2500 : 0,
      bonusMinor: 0,
      requiresTransport: false,
      reliability: over.reliability ?? 0.5,
      hoursUntilShift: 48,
      distanceKm: 10
    }),
    y
  };
}

describe("learned acceptance model", () => {
  it("learns a pattern from the log (transport drives acceptance) and predicts accordingly", () => {
    // Market history: workers accept when transport is offered, decline otherwise.
    const data: TrainingSample[] = [];
    for (let i = 0; i < 40; i++) {
      data.push(sample({ transport: true }, 1));
      data.push(sample({ transport: false }, 0));
    }
    const weights = trainLogistic(data, { iterations: 800 });
    const model = createLearnedAcceptanceModel(weights);
    const worker = { workerIdentityId: "w", minRatePerHourMinor: 2500, requiresTransport: false, maxDistanceKm: 100, reliability: 0.5 };
    const job = { hours: 8, distanceKm: 10, hoursUntilShift: 48 };
    const withTransport = model.predict(worker, { baseRatePerHourMinor: 2500, transportAllowanceMinor: 2500, bonusMinor: 0 }, job);
    const withoutTransport = model.predict(worker, { baseRatePerHourMinor: 2500, transportAllowanceMinor: 0, bonusMinor: 0 }, job);
    expect(withTransport).toBeGreaterThan(0.8);
    expect(withoutTransport).toBeLessThan(0.2);
    // The fit improves on an uninformed (zero-weight) baseline.
    expect(logLoss(weights, data)).toBeLessThan(logLoss(new Array(weights.length).fill(0), data));
  });

  it("returns zero weights (no learning) on an empty log", () => {
    expect(trainLogistic([])).toEqual(new Array(8).fill(0));
  });
});
