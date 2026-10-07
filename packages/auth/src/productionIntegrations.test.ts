import { describe, expect, it, vi } from "vitest";

import {
  ProductionIntegrationError,
  createHttpCandidateSource,
  createHttpWorkerOfferDeliveryProvider,
  createResendWorkerOfferDeliveryProvider
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
  it("preserves application authorization while adding trusted identity headers", async () => {
    const fetch: typeof globalThis.fetch = vi.fn(async (_url, init) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("authorization")).toBe("Bearer synthetic-google-token");
      expect(headers.get("x-rwos-app-authorization")).toBe("Bearer application-token");
      return jsonResponse({ status: "ready" });
    });
    const source = createHttpCandidateSource({
      origin: "https://candidate.example",
      token: "application-token",
      fetch,
      trustedIdentityHeaders: async () => ({
        authorization: "Bearer synthetic-google-token"
      })
    });

    await expect(source.getStatus()).resolves.toEqual({ status: "available" });
    expect(fetch).toHaveBeenCalledOnce();
  });

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
    expect(observedRequest?.headers).toMatchObject({
      "x-rwos-service-id": "rwos-api",
      "x-rwos-tenant-id": dispatchReview.organizationId,
      "x-rwos-operation": "candidates:search"
    });
  });

  it("uses dependency-aware readiness for candidate-source availability", async () => {
    let observedUrl = "";
    const source = createHttpCandidateSource({
      origin: "https://candidate.example",
      token: "token",
      fetch: async (url) => {
        observedUrl = String(url);
        return jsonResponse({ ready: true });
      }
    });
    await expect(source.getStatus()).resolves.toEqual({ status: "available" });
    expect(observedUrl).toBe("https://candidate.example/ready");
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
      organizationId: "00000000-0000-4000-8000-000000000303",
      workerOfferId: "00000000-0000-4000-8000-000000000301",
      workerIdentityId: "00000000-0000-4000-8000-000000000302",
      idempotencyKey:
        "worker-offer:00000000-0000-4000-8000-000000000301:terms:00000000-0000-4000-8000-000000000304"
    });

    expect(first).toEqual({
      status: "sent",
      providerReference: "opaque-provider-reference",
      retryable: false
    });
    expect(observedRequest?.headers).toMatchObject({
      "idempotency-key":
        "worker-offer:00000000-0000-4000-8000-000000000301:terms:00000000-0000-4000-8000-000000000304",
      "x-rwos-service-id": "rwos-api",
      "x-rwos-tenant-id": "00000000-0000-4000-8000-000000000303",
      "x-rwos-operation": "worker-offers:deliver"
    });
    expect(String(observedRequest?.body)).toContain(
      '"organizationId":"00000000-0000-4000-8000-000000000303"'
    );
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
        organizationId: "00000000-0000-4000-8000-000000000303",
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
          organizationId: "00000000-0000-4000-8000-000000000303",
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


describe("Resend worker offer delivery", () => {
  const RESEND_URL = "https://api.resend.com/emails";
  const API_KEY = "re_testkey_1234567890";
  const FROM = "JobLop <no-reply@notifications.example>";
  const deliverInput = {
    organizationId: "00000000-0000-4000-8000-0000000003a1",
    workerOfferId: "00000000-0000-4000-8000-0000000003a2",
    workerIdentityId: "00000000-0000-4000-8000-0000000003a3",
    idempotencyKey: "worker-offer:offer-a2:terms:t1"
  };
  const recipient = (over: Record<string, unknown> = {}) => ({
    email: "worker@example.com",
    name: "Alex",
    language: "en" as const,
    title: "Personal Support Worker (PSW)",
    summary: "Evening coverage on the care floor.",
    compensation: "$24.00/h",
    whenLabel: "Oct 20, 2026, 9:00 a.m. – 5:00 p.m.",
    areaLabel: "Laval, QC",
    ctaUrl: "https://work.joblop.example/offers/abc",
    ...over
  });

  it("POSTs a bilingual offer email to Resend with bearer auth, idempotency key, and worker-safe fields", async () => {
    let captured: { url: unknown; init: RequestInit | undefined } | null = null;
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      captured = { url, init };
      return jsonResponse({ id: "resend-msg-123" });
    }) as unknown as typeof fetch;

    const provider = createResendWorkerOfferDeliveryProvider({
      apiKey: API_KEY,
      fromAddress: FROM,
      fetch: fetchImpl,
      resolveRecipient: async () => recipient()
    });

    const result = await provider.deliver(deliverInput);

    expect(result).toEqual({ status: "sent", providerReference: "resend-msg-123", retryable: false });
    expect(String(captured!.url)).toBe(RESEND_URL);
    expect(captured!.init?.method).toBe("POST");
    const headers = captured!.init?.headers as Record<string, string>;
    expect(headers.authorization).toBe(`Bearer ${API_KEY}`);
    expect(headers["idempotency-key"]).toBe(deliverInput.idempotencyKey);
    const body = JSON.parse(String(captured!.init?.body));
    expect(body.from).toBe(FROM);
    expect(body.to).toEqual(["worker@example.com"]);
    expect(body.subject).toContain("New shift offer");
    expect(body.subject).toContain("Personal Support Worker");
    // worker-safe: shows area label, never an exact street address
    expect(body.text).toContain("Laval, QC");
    expect(body.html).toContain("JobLop");
    expect(body.text).toContain("JobLop");
  });

  it("composes the French subject for fr recipients", async () => {
    let body: Record<string, unknown> = {};
    const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
      body = JSON.parse(String(init?.body));
      return jsonResponse({ id: "resend-msg-fr" });
    }) as unknown as typeof fetch;
    const provider = createResendWorkerOfferDeliveryProvider({
      apiKey: API_KEY,
      fromAddress: FROM,
      fetch: fetchImpl,
      resolveRecipient: async () => recipient({ language: "fr", name: "Alex" })
    });
    await provider.deliver(deliverInput);
    expect(String(body.subject)).toContain("Nouvelle offre de quart");
  });

  it("fails closed without sending when there is no deliverable recipient", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ id: "should-not-send" })) as unknown as typeof fetch;
    const provider = createResendWorkerOfferDeliveryProvider({
      apiKey: API_KEY,
      fromAddress: FROM,
      fetch: fetchImpl,
      resolveRecipient: async () => null
    });
    const result = await provider.deliver(deliverInput);
    expect(result).toEqual({ status: "failed", providerReference: null, retryable: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("refuses to send with a missing or too-short API key", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ id: "nope" })) as unknown as typeof fetch;
    const provider = createResendWorkerOfferDeliveryProvider({
      apiKey: "short",
      fromAddress: FROM,
      fetch: fetchImpl,
      resolveRecipient: async () => recipient()
    });
    const result = await provider.deliver(deliverInput);
    expect(result).toEqual({ status: "failed", providerReference: null, retryable: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    [500, true],
    [429, true],
    [422, false],
    [401, false]
  ])("maps HTTP %i to the right retryable flag without fabricating delivery", async (status, retryable) => {
    const provider = createResendWorkerOfferDeliveryProvider({
      apiKey: API_KEY,
      fromAddress: FROM,
      fetch: (async () => jsonResponse({ message: "x" }, status)) as unknown as typeof fetch,
      resolveRecipient: async () => recipient()
    });
    await expect(provider.deliver(deliverInput)).resolves.toEqual({
      status: "failed",
      providerReference: null,
      retryable
    });
  });
});
