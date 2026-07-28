import { describe, expect, it, vi } from "vitest";

import {
  ProductionIntegrationError,
  createHttpCandidateSource,
  createHttpWorkerOfferDeliveryProvider
} from "./productionIntegrations";

const dispatchReview = {
  id: "00000000-0000-4000-8000-000000000101",
  jobRequestId: "00000000-0000-4000-8000-000000000102",
  organizationId: "00000000-0000-4000-8000-000000000103",
  residenceId: "00000000-0000-4000-8000-000000000104",
  departmentId: "00000000-0000-4000-8000-000000000105",
  workGroupId: "00000000-0000-4000-8000-000000000106",
  roleDefinitionId: "00000000-0000-4000-8000-000000000107",
  dispatchType: "initial" as const,
  state: "candidate_review" as const,
  operationalOwnerUserId: null,
  priority: "normal" as const,
  urgency: "normal" as const,
  requiredWorkerCount: 1,
  shortlistedCandidateCount: 0,
  preparedOfferCount: 0,
  startedAt: new Date("2026-07-27T12:00:00.000Z"),
  pausedAt: null,
  cancelledAt: null,
  closedAt: null,
  createdByUserId: "00000000-0000-4000-8000-000000000108",
  updatedByUserId: null,
  createdAt: new Date("2026-07-27T12:00:00.000Z"),
  updatedAt: new Date("2026-07-27T12:00:00.000Z"),
  version: 1,
  remainingWorkerCount: 1,
  versionToken: 1
};
const staffingWindow = {
  startAt: new Date("2026-08-04T12:00:00.000Z"),
  endAt: new Date("2026-08-04T20:00:00.000Z"),
  timezone: "America/Toronto"
};

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: dispatchReview.organizationId,
    workerIdentityId: "00000000-0000-4000-8000-000000000201",
    candidateSourceType: "internal_worker_profile",
    candidateSourceReference: "opaque-worker-201",
    approvedDisplayName: "Approved worker",
    workGroupMatch: "match",
    roleDefinitionMatch: "match",
    qualificationSummaryState: "meets_requirements",
    verificationSummaryState: "meets_requirements",
    availabilityState: "available",
    scheduleConflictState: "conflict_free",
    serviceAreaState: "inside_service_area",
    travelSuitabilityState: "suitable",
    transportConstraintState: "available",
    recommendationState: "recommended",
    sourceFreshnessAt: "2026-07-27T12:00:00.000Z",
    evaluationVersion: 1,
    ...overrides
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("production candidate-source boundary", () => {
  it("requires HTTPS and never sends a raw tenant name or worker contact data", async () => {
    expect(() =>
      createHttpCandidateSource({ origin: "http://candidate.example", token: "token" })
    ).toThrow(ProductionIntegrationError);

    let observedRequest: RequestInit | undefined;
    const fetch: typeof globalThis.fetch = vi.fn(async (_url, init) => {
      observedRequest = init;
      return jsonResponse({ candidates: [candidate()] });
    });
    const source = createHttpCandidateSource({
      origin: "https://candidate.example",
      token: "token",
      fetch
    });

    const result = await source.searchCandidates({
      dispatchReview,
      staffingWindow,
      requestedAt: new Date("2026-07-27T12:01:00.000Z")
    });

    expect(result.status).toBe("available");
    expect(String(observedRequest?.body)).toContain(dispatchReview.organizationId);
    expect(String(observedRequest?.body)).toContain(staffingWindow.startAt.toISOString());
    expect(String(observedRequest?.body)).toContain(staffingWindow.endAt.toISOString());
    expect(String(observedRequest?.body)).toContain(staffingWindow.timezone);
    expect(String(observedRequest?.body)).not.toMatch(/email|phone|address|displayName/i);
  });

  it.each([
    ["cross-tenant", { organizationId: "00000000-0000-4000-8000-000000000999" }],
    ["missing worker identity", { workerIdentityId: null }],
    ["invalid worker identity", { workerIdentityId: "not-a-uuid" }],
    ["stale source", { sourceFreshnessAt: "2026-07-25T12:00:00.000Z" }]
  ])("fails closed for %s candidate records", async (_label, override) => {
    const source = createHttpCandidateSource({
      origin: "https://candidate.example",
      token: "token",
      fetch: async () => jsonResponse({ candidates: [candidate(override)] }),
      maxCandidateAgeMs: 60 * 60 * 1000
    });

    await expect(
      source.searchCandidates({
        dispatchReview,
        staffingWindow,
        requestedAt: new Date("2026-07-27T12:01:00.000Z")
      })
    ).rejects.toBeInstanceOf(ProductionIntegrationError);
  });

  it("rejects duplicate source references and duplicate worker identities", async () => {
    const source = createHttpCandidateSource({
      origin: "https://candidate.example",
      token: "token",
      fetch: async () =>
        jsonResponse({
          candidates: [candidate(), candidate({ candidateSourceReference: "opaque-worker-202" })]
        })
    });

    await expect(
      source.searchCandidates({
        dispatchReview,
        staffingWindow,
        requestedAt: new Date("2026-07-27T12:01:00.000Z")
      })
    ).rejects.toBeInstanceOf(ProductionIntegrationError);
  });

  it("rejects an evaluation response for a different candidate reference", async () => {
    const source = createHttpCandidateSource({
      origin: "https://candidate.example",
      token: "token",
      fetch: async () =>
        jsonResponse({ candidate: candidate({ candidateSourceReference: "different-worker" }) })
    });

    await expect(
      source.evaluateCandidate({
        dispatchReview,
        staffingWindow,
        candidateSourceReference: "opaque-worker-201",
        requestedAt: new Date("2026-07-27T12:01:00.000Z")
      })
    ).rejects.toBeInstanceOf(ProductionIntegrationError);
  });

  it("returns unavailable on timeout without leaking provider response detail", async () => {
    const source = createHttpCandidateSource({
      origin: "https://candidate.example",
      token: "token",
      timeoutMs: 5,
      fetch: async (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new Error("provider secret detail"))
          );
        })
    });

    await expect(source.getStatus()).resolves.toEqual({
      status: "candidate_source_unavailable"
    });
  });
});

describe("production offer-delivery boundary", () => {
  it("uses an idempotency key and preserves truthful provider outcomes", async () => {
    let observedRequest: RequestInit | undefined;
    const fetch: typeof globalThis.fetch = vi.fn(async (_url, init) => {
      observedRequest = init;
      return jsonResponse({ status: "sent", providerReference: "opaque-provider-reference" });
    });
    const provider = createHttpWorkerOfferDeliveryProvider({
      origin: "https://delivery.example",
      token: "token",
      fetch
    });

    const first = await provider.deliver({
      workerOfferId: "00000000-0000-4000-8000-000000000301",
      workerIdentityId: "00000000-0000-4000-8000-000000000302",
      idempotencyKey: "worker-offer:00000000-0000-4000-8000-000000000301:v2"
    });

    expect(first).toEqual({
      status: "sent",
      providerReference: "opaque-provider-reference",
      retryable: false
    });
    expect(observedRequest?.headers).toMatchObject({
      "idempotency-key": "worker-offer:00000000-0000-4000-8000-000000000301:v2"
    });
  });

  it.each([
    [
      { status: "failed", retryable: true },
      { status: "failed", retryable: true }
    ],
    [{ status: "delivered" }, { status: "delivered", retryable: false }]
  ])("maps provider outcome %j without fabricating delivery", async (body, expected) => {
    const provider = createHttpWorkerOfferDeliveryProvider({
      origin: "https://delivery.example",
      token: "token",
      fetch: async () => jsonResponse(body)
    });

    await expect(
      provider.deliver({
        workerOfferId: "00000000-0000-4000-8000-000000000301",
        workerIdentityId: "00000000-0000-4000-8000-000000000302",
        idempotencyKey: "stable-key"
      })
    ).resolves.toMatchObject(expected);
  });

  it("returns a retryable failure for timeout, malformed response, and unavailable provider", async () => {
    for (const fetch of [
      async () => jsonResponse({ status: "success" }),
      async () => jsonResponse({}, 503),
      async (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("timeout detail")));
        })
    ]) {
      const provider = createHttpWorkerOfferDeliveryProvider({
        origin: "https://delivery.example",
        token: "token",
        timeoutMs: 5,
        fetch
      });
      await expect(
        provider.deliver({
          workerOfferId: "00000000-0000-4000-8000-000000000301",
          workerIdentityId: "00000000-0000-4000-8000-000000000302",
          idempotencyKey: "stable-key"
        })
      ).resolves.toEqual({
        status: "failed",
        providerReference: null,
        retryable: true
      });
    }
  });
});
