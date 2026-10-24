import type { AcceptanceModel, JobContext, OfferTerms, WorkerFeatures } from "./offerEngine";

// Dynamic offer engine P3 — a LEARNED acceptance model. A small logistic regression fit (pure TS,
// deterministic gradient descent, L2-regularized) on the captured offer/outcome log. It uses the same
// feature space as the cold-start prior but with FITTED weights instead of hand-set ones. With too few
// labelled events the caller falls back to the prior — the model is honest about not having learned yet.
// No money flows here; this only informs which offer to make.

const sigmoid = (x: number) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, x))));
const dot = (a: readonly number[], b: readonly number[]) => a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);

// The shared feature vector (same at train time and predict time). First element is the bias.
export function acceptanceFeatures(input: {
  baseRatePerHourMinor: number;
  minRatePerHourMinor: number;
  transportAllowanceMinor: number;
  bonusMinor: number;
  requiresTransport: boolean;
  reliability: number;
  hoursUntilShift: number;
  distanceKm: number;
}): number[] {
  const overMin = (input.baseRatePerHourMinor - input.minRatePerHourMinor) / Math.max(1, input.minRatePerHourMinor);
  return [
    1, // bias
    Math.max(-1, Math.min(2, overMin)),
    input.transportAllowanceMinor > 0 ? 1 : 0,
    input.bonusMinor > 0 ? 1 : 0,
    input.requiresTransport ? 1 : 0,
    Math.max(0, Math.min(1, input.reliability)),
    input.hoursUntilShift <= 24 ? 1 : 0,
    Math.min(2, input.distanceKm / 50)
  ];
}

export const ACCEPTANCE_FEATURE_DIM = 8;

export type TrainingSample = Readonly<{ x: readonly number[]; y: 0 | 1 }>;

export type TrainOptions = Readonly<{ iterations?: number; learningRate?: number; l2?: number }>;

// Fit logistic-regression weights by deterministic full-batch gradient descent with L2. Deterministic
// (zero init, fixed iterations) so training is reproducible and testable.
export function trainLogistic(samples: readonly TrainingSample[], opts: TrainOptions = {}): number[] {
  const iterations = opts.iterations ?? 600;
  const lr = opts.learningRate ?? 0.3;
  const l2 = opts.l2 ?? 0.001;
  const dim = samples[0]?.x.length ?? ACCEPTANCE_FEATURE_DIM;
  const w = new Array<number>(dim).fill(0);
  if (samples.length === 0) return w;
  for (let it = 0; it < iterations; it++) {
    const grad = new Array<number>(dim).fill(0);
    for (const s of samples) {
      const p = sigmoid(dot(w, s.x));
      const err = p - s.y;
      for (let j = 0; j < dim; j++) grad[j] += err * (s.x[j] ?? 0);
    }
    for (let j = 0; j < dim; j++) {
      // No L2 on the bias term (index 0).
      const reg = j === 0 ? 0 : l2 * w[j]!;
      w[j] = w[j]! - lr * (grad[j]! / samples.length + reg);
    }
  }
  return w;
}

// Mean log-loss of the weights over the samples — the training-fit metric reported to operators.
export function logLoss(weights: readonly number[], samples: readonly TrainingSample[]): number {
  if (samples.length === 0) return 0;
  const eps = 1e-9;
  const total = samples.reduce((sum, s) => {
    const p = Math.min(1 - eps, Math.max(eps, sigmoid(dot(weights, s.x))));
    return sum - (s.y * Math.log(p) + (1 - s.y) * Math.log(1 - p));
  }, 0);
  return total / samples.length;
}

export function createLearnedAcceptanceModel(weights: readonly number[]): AcceptanceModel {
  return {
    kind: "learned-logistic",
    predict(worker: WorkerFeatures, offer: OfferTerms, job: JobContext) {
      const x = acceptanceFeatures({
        baseRatePerHourMinor: offer.baseRatePerHourMinor,
        minRatePerHourMinor: worker.minRatePerHourMinor,
        transportAllowanceMinor: offer.transportAllowanceMinor,
        bonusMinor: offer.bonusMinor,
        requiresTransport: worker.requiresTransport,
        reliability: worker.reliability,
        hoursUntilShift: job.hoursUntilShift,
        distanceKm: job.distanceKm
      });
      return sigmoid(dot(weights, x));
    }
  };
}
