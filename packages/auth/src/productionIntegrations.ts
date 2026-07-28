import type {
  CandidateSourceSearchResult,
  DispatchCandidateSource,
  PublicDispatchCandidate,
  PublicDispatchReview
} from "./index";

type Fetch = typeof fetch;

export class ProductionIntegrationError extends Error {
  constructor() {
    super("Production integration unavailable.");
    this.name = "ProductionIntegrationError";
  }
}

export type WorkerOfferDeliveryResult = Readonly<{
  status: "sent" | "delivered" | "failed";
  providerReference: string | null;
  retryable: boolean;
}>;

export interface WorkerOfferDeliveryProvider {
  deliver(input: {
    workerOfferId: string;
    workerIdentityId: string;
    idempotencyKey: string;
  }): Promise<WorkerOfferDeliveryResult>;
}

type HttpOptions = {
  origin: string;
  token: string;
  timeoutMs?: number;
  fetch?: Fetch;
};

export function createHttpCandidateSource(
  options: HttpOptions & { maxCandidateAgeMs?: number }
): DispatchCandidateSource {
  const boundary = createHttpBoundary(options);
  const maxCandidateAgeMs = options.maxCandidateAgeMs ?? 15 * 60 * 1000;

  return {
    async getStatus() {
      try {
        const response = await boundary("/health", { method: "GET" });
        return {
          status: response.ok ? ("available" as const) : ("candidate_source_unavailable" as const)
        };
      } catch {
        return { status: "candidate_source_unavailable" as const };
      }
    },
    async searchCandidates(input) {
      const payload = await requestCandidates(boundary, "/v1/candidates/search", input);
      return {
        status: "available",
        candidates: parseCandidateList(
          payload,
          input.dispatchReview,
          input.requestedAt,
          maxCandidateAgeMs,
          undefined
        )
      } satisfies CandidateSourceSearchResult;
    },
    async evaluateCandidate(input) {
      const response = await boundary("/v1/candidates/evaluate", {
        method: "POST",
        body: JSON.stringify({
          dispatchReviewId: input.dispatchReview.id,
          organizationId: input.dispatchReview.organizationId,
          workGroupId: input.dispatchReview.workGroupId,
          roleDefinitionId: input.dispatchReview.roleDefinitionId,
          candidateSourceReference: input.candidateSourceReference,
          startAt: input.staffingWindow.startAt.toISOString(),
          endAt: input.staffingWindow.endAt.toISOString(),
          timezone: input.staffingWindow.timezone
        })
      });
      if (!response.ok) throw new ProductionIntegrationError();
      const payload: unknown = await response.json().catch(() => null);
      const record = asRecord(payload);
      return {
        status: "available",
        candidate: parseCandidate(
          record.candidate,
          input.dispatchReview,
          input.requestedAt,
          maxCandidateAgeMs,
          input.candidateSourceReference
        )
      };
    }
  };
}

export function createHttpWorkerOfferDeliveryProvider(
  options: HttpOptions
): WorkerOfferDeliveryProvider {
  const boundary = createHttpBoundary(options);
  return {
    async deliver(input) {
      try {
        const response = await boundary("/v1/worker-offers/deliver", {
          method: "POST",
          headers: { "idempotency-key": input.idempotencyKey },
          body: JSON.stringify({
            workerOfferId: input.workerOfferId,
            workerIdentityId: input.workerIdentityId
          })
        });
        if (!response.ok) return failedDelivery();
        const record = asRecord(await response.json().catch(() => null));
        if (!["sent", "delivered", "failed"].includes(String(record.status))) {
          return failedDelivery();
        }
        const status = record.status as WorkerOfferDeliveryResult["status"];
        const providerReference =
          typeof record.providerReference === "string" && record.providerReference.length <= 200
            ? record.providerReference
            : null;
        return {
          status,
          providerReference,
          retryable: status === "failed" ? record.retryable === true : false
        };
      } catch {
        return failedDelivery();
      }
    }
  };
}

async function requestCandidates(
  boundary: ReturnType<typeof createHttpBoundary>,
  path: string,
  input: {
    dispatchReview: PublicDispatchReview;
    staffingWindow: { startAt: Date; endAt: Date; timezone: string };
    requestedAt: Date;
  }
) {
  const response = await boundary(path, {
    method: "POST",
    body: JSON.stringify({
      dispatchReviewId: input.dispatchReview.id,
      organizationId: input.dispatchReview.organizationId,
      workGroupId: input.dispatchReview.workGroupId,
      roleDefinitionId: input.dispatchReview.roleDefinitionId,
      startAt: input.staffingWindow.startAt.toISOString(),
      endAt: input.staffingWindow.endAt.toISOString(),
      timezone: input.staffingWindow.timezone,
      requestedAt: input.requestedAt.toISOString()
    })
  });
  if (!response.ok) throw new ProductionIntegrationError();
  return response.json().catch(() => {
    throw new ProductionIntegrationError();
  });
}

function parseCandidateList(
  input: unknown,
  dispatchReview: PublicDispatchReview,
  requestedAt: Date,
  maxCandidateAgeMs: number,
  expectedCandidateSourceReference: string | undefined
) {
  const candidates = asRecord(input).candidates;
  if (!Array.isArray(candidates) || candidates.length > 100) throw new ProductionIntegrationError();
  const parsed = candidates.map((candidate) =>
    parseCandidate(
      candidate,
      dispatchReview,
      requestedAt,
      maxCandidateAgeMs,
      expectedCandidateSourceReference
    )
  );
  if (
    new Set(parsed.map((candidate) => candidate.candidateSourceReference)).size !== parsed.length ||
    new Set(parsed.map((candidate) => candidate.workerIdentityId)).size !== parsed.length
  ) {
    throw new ProductionIntegrationError();
  }
  return parsed;
}

function parseCandidate(
  input: unknown,
  dispatchReview: PublicDispatchReview,
  requestedAt: Date,
  maxCandidateAgeMs: number,
  expectedCandidateSourceReference: string | undefined
): PublicDispatchCandidate {
  const record = asRecord(input);
  if (record.organizationId !== dispatchReview.organizationId)
    throw new ProductionIntegrationError();
  const workerIdentityId = requiredUuid(record.workerIdentityId);
  const candidateSourceReference = requiredString(record.candidateSourceReference, 200);
  if (
    expectedCandidateSourceReference !== undefined &&
    candidateSourceReference !== expectedCandidateSourceReference
  ) {
    throw new ProductionIntegrationError();
  }
  const approvedDisplayName = requiredString(record.approvedDisplayName, 160);
  const sourceFreshnessAt = new Date(requiredString(record.sourceFreshnessAt, 40));
  if (
    !Number.isFinite(sourceFreshnessAt.getTime()) ||
    sourceFreshnessAt > requestedAt ||
    requestedAt.getTime() - sourceFreshnessAt.getTime() > maxCandidateAgeMs
  ) {
    throw new ProductionIntegrationError();
  }
  const now = requestedAt;
  return {
    id: `external:${candidateSourceReference}`,
    dispatchReviewId: dispatchReview.id,
    workerIdentityId,
    candidateSourceType: enumValue(record.candidateSourceType, [
      "internal_worker_profile",
      "invited_worker",
      "staffing_partner",
      "enterprise_employee_pool",
      "external_integration"
    ]),
    candidateSourceReference,
    approvedDisplayName,
    workGroupMatch: enumValue(record.workGroupMatch, [
      "match",
      "partial_match",
      "no_match",
      "not_evaluated"
    ]),
    roleDefinitionMatch: enumValue(record.roleDefinitionMatch, [
      "match",
      "partial_match",
      "no_match",
      "not_evaluated"
    ]),
    qualificationSummaryState: summaryState(record.qualificationSummaryState),
    verificationSummaryState: summaryState(record.verificationSummaryState),
    availabilityState: enumValue(record.availabilityState, [
      "available",
      "partially_available",
      "unavailable",
      "not_evaluated",
      "source_unavailable"
    ]),
    scheduleConflictState: enumValue(record.scheduleConflictState, [
      "conflict_free",
      "conflict_detected",
      "not_evaluated",
      "source_unavailable"
    ]),
    serviceAreaState: enumValue(record.serviceAreaState, [
      "inside_service_area",
      "outside_service_area",
      "not_evaluated",
      "source_unavailable"
    ]),
    travelSuitabilityState: enumValue(record.travelSuitabilityState, [
      "suitable",
      "unsuitable",
      "unknown",
      "not_evaluated",
      "source_unavailable"
    ]),
    transportConstraintState: enumValue(record.transportConstraintState, [
      "available",
      "unavailable",
      "unknown",
      "not_evaluated",
      "source_unavailable"
    ]),
    recommendationState: enumValue(record.recommendationState, [
      "not_evaluated",
      "recommended",
      "not_recommended",
      "alternative",
      "unavailable"
    ]),
    shortlistState: "not_shortlisted",
    shortlistOrder: null,
    sourceFreshnessAt,
    lastEvaluatedAt: now,
    evaluationVersion:
      Number.isInteger(record.evaluationVersion) && Number(record.evaluationVersion) > 0
        ? Number(record.evaluationVersion)
        : 1,
    addedByUserId: null,
    removedByUserId: null,
    createdAt: now,
    updatedAt: now,
    version: 1,
    versionToken: 1
  };
}

function createHttpBoundary(options: HttpOptions) {
  const origin = new URL(options.origin);
  if (origin.protocol !== "https:" || !options.token.trim()) throw new ProductionIntegrationError();
  const fetcher = options.fetch ?? fetch;
  const timeoutMs = Math.min(10_000, Math.max(100, options.timeoutMs ?? 3_000));
  return async (path: string, init: RequestInit) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetcher(new URL(path, origin), {
        ...init,
        signal: controller.signal,
        headers: {
          authorization: `Bearer ${options.token}`,
          "cache-control": "no-store",
          "content-type": "application/json",
          ...init.headers
        }
      });
    } finally {
      clearTimeout(timeout);
    }
  };
}

function failedDelivery(): WorkerOfferDeliveryResult {
  return { status: "failed", providerReference: null, retryable: true };
}

function asRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ProductionIntegrationError();
  }
  return input as Record<string, unknown>;
}

function requiredString(input: unknown, max: number) {
  if (typeof input !== "string" || !input.trim() || input.length > max) {
    throw new ProductionIntegrationError();
  }
  return input;
}

function requiredUuid(input: unknown) {
  const value = requiredString(input, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ProductionIntegrationError();
  }
  return value;
}

function enumValue<const T extends string>(input: unknown, values: readonly T[]): T {
  if (typeof input !== "string" || !values.includes(input as T))
    throw new ProductionIntegrationError();
  return input as T;
}

function summaryState(input: unknown) {
  return enumValue(input, [
    "meets_requirements",
    "partially_meets",
    "missing_required",
    "verification_pending",
    "expired",
    "not_evaluated"
  ]);
}
