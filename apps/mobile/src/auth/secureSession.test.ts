import { describe, expect, it, vi } from "vitest";
import {
  createMobileSessionTransport,
  tryCreateMobileSessionTransport,
  type SecureSessionVault
} from "./secureSession";

vi.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn()
}));

function vault(): SecureSessionVault & { stored: string | null } {
  return {
    stored: null,
    async read() {
      return this.stored;
    },
    async write(token) {
      this.stored = token;
    },
    async clear() {
      this.stored = null;
    }
  };
}

function response(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("mobile secure session transport", () => {
  it("writes the session only to the secure vault and returns no token", async () => {
    const secureVault = vault();
    const transport = createMobileSessionTransport({
      apiOrigin: "https://api.example.test",
      vault: secureVault,
      fetch: vi.fn(async () => response(200, { token: "native-session-token-123456789" }))
    });
    const result = await transport.signIn({
      email: "worker@example.test",
      password: "correct horse"
    });
    expect(result).toEqual({ status: "authenticated" });
    expect(JSON.stringify(result)).not.toContain("native-session-token");
    expect(secureVault.stored).toBe("native-session-token-123456789");
  });

  it("reads a worker-only reference without returning client economics", async () => {
    const secureVault = vault();
    secureVault.stored = "native-session-token-123456789";
    const transport = createMobileSessionTransport({
      apiOrigin: "https://api.example.test",
      vault: secureVault,
      fetch: vi.fn(async () =>
        response(200, {
          workerOffer: {
            workerOfferId: "offer-1",
            jobRequestId: "request-1",
            status: "sent",
            expiresAt: "2026-08-02T12:00:00.000Z",
            title: null,
            summary: null,
            startAt: null,
            endAt: null,
            timezone: null,
            compensationSummary: null,
            policySummary: null,
            termsVersionId: "terms-1",
            versionToken: 1,
            visibility: "worker_authorized_offer_reference",
            clientBillRate: 4500
          }
        })
      )
    });
    const result = await transport.workerOffer("offer-1");
    expect(result.status).toBe("ready");
    expect(result).not.toHaveProperty("data.clientBillRate");
  });

  it("rejects an offer response that does not match the worker-requested reference", async () => {
    const secureVault = vault();
    secureVault.stored = "native-session-token-123456789";
    const transport = createMobileSessionTransport({
      apiOrigin: "https://api.example.test",
      vault: secureVault,
      fetch: vi.fn(async () =>
        response(200, {
          workerOffer: workerOfferFixture({ workerOfferId: "offer-for-another-worker" })
        })
      )
    });

    await expect(transport.workerOffer("offer-1")).resolves.toEqual({ status: "error" });
  });

  it("rejects a mutation response that switches to another worker offer", async () => {
    const secureVault = vault();
    secureVault.stored = "native-session-token-123456789";
    const transport = createMobileSessionTransport({
      apiOrigin: "https://api.example.test",
      vault: secureVault,
      fetch: vi.fn(async () =>
        response(200, {
          workerOffer: workerOfferFixture({ workerOfferId: "offer-for-another-worker" })
        })
      )
    });

    await expect(
      transport.respondToWorkerOffer({
        offerId: "offer-1",
        decision: "accept",
        expectedVersion: 1,
        expectedTermsVersionId: "terms-1"
      })
    ).resolves.toEqual({ status: "error" });
  });

  it("rejects malformed worker references and stale mutation versions before network access", async () => {
    const secureVault = vault();
    secureVault.stored = "native-session-token-123456789";
    const network = vi.fn();
    const transport = createMobileSessionTransport({
      apiOrigin: "https://api.example.test",
      vault: secureVault,
      fetch: network
    });

    await expect(transport.workerOffer("../../another-worker")).resolves.toEqual({
      status: "error"
    });
    await expect(
      transport.respondToWorkerOffer({
        offerId: "offer-1",
        decision: "decline",
        expectedVersion: 0,
        expectedTermsVersionId: "terms-1"
      })
    ).resolves.toEqual({ status: "error" });
    expect(network).not.toHaveBeenCalled();
  });

  it("clears the vault even when remote sign-out fails", async () => {
    const secureVault = vault();
    secureVault.stored = "native-session-token-123456789";
    const transport = createMobileSessionTransport({
      apiOrigin: "https://api.example.test",
      vault: secureVault,
      fetch: vi.fn(async () => {
        throw new Error("offline");
      })
    });
    await expect(transport.signOut()).resolves.toEqual({
      status: "local_session_cleared",
      remoteRevocation: "unavailable"
    });
    expect(secureVault.stored).toBeNull();
  });

  it("lists only parsed worker assignment fields", async () => {
    const secureVault = vault();
    secureVault.stored = "native-session-token-123456789";
    const transport = createMobileSessionTransport({
      apiOrigin: "https://api.example.test",
      vault: secureVault,
      fetch: vi.fn(async () =>
        response(200, {
          assignments: [
            {
              assignmentId: "assignment-1",
              workerOfferId: "offer-1",
              status: "confirmed",
              title: "Dinner Chef Coverage",
              roleSummary: "Chef",
              worksiteSummary: "Main residence",
              departmentSummary: "Kitchen",
              startAt: "2026-08-02T12:00:00.000Z",
              endAt: "2026-08-02T16:00:00.000Z",
              timezone: "America/Toronto",
              attendanceBoundary: "not_started",
              versionToken: 0,
              updatedAt: "2026-07-27T12:00:00.000Z",
              visibility: "worker_authorized_assignment",
              validationSnapshot: { conflictCount: 0 },
              workerIdentityId: "private-worker-id"
            }
          ]
        })
      )
    });

    const result = await transport.workerAssignments();

    expect(result.status).toBe("ready");
    expect(result).not.toHaveProperty("data.0.validationSnapshot");
    expect(result).not.toHaveProperty("data.0.workerIdentityId");
  });

  it.each([
    ["unknown status", { status: "mystery" }],
    ["invalid timezone", { timezone: "Not/A_Timezone" }],
    ["reversed assignment window", { startAt: "2026-08-02T18:00:00.000Z" }],
    ["invalid update timestamp", { updatedAt: "not-a-date" }]
  ])("fails closed for %s in a worker assignment", async (_label, override) => {
    const secureVault = vault();
    secureVault.stored = "native-session-token-123456789";
    const transport = createMobileSessionTransport({
      apiOrigin: "https://api.example.test",
      vault: secureVault,
      fetch: vi.fn(async () =>
        response(200, {
          assignments: [
            {
              assignmentId: "assignment-1",
              workerOfferId: "offer-1",
              status: "confirmed",
              title: "Dinner Chef Coverage",
              roleSummary: "Chef",
              worksiteSummary: "Main residence",
              departmentSummary: "Kitchen",
              startAt: "2026-08-02T12:00:00.000Z",
              endAt: "2026-08-02T16:00:00.000Z",
              timezone: "America/Toronto",
              attendanceBoundary: "not_started",
              versionToken: 0,
              updatedAt: "2026-07-27T12:00:00.000Z",
              visibility: "worker_authorized_assignment",
              ...override
            }
          ]
        })
      )
    });

    await expect(transport.workerAssignments()).resolves.toEqual({ status: "error" });
  });

  it("requires sign-out before changing accounts", async () => {
    const secureVault = vault();
    secureVault.stored = "native-session-token-123456789";
    const network = vi.fn(async () => response(200, { token: "different-token-1234567890" }));
    const transport = createMobileSessionTransport({
      apiOrigin: "https://api.example.test",
      vault: secureVault,
      fetch: network
    });
    expect(
      await transport.signIn({
        email: "other@example.test",
        password: "different account"
      })
    ).toEqual({ status: "sign_out_required" });
    expect(network).not.toHaveBeenCalled();
    expect(secureVault.stored).toBe("native-session-token-123456789");
  });

  it("preserves empty and stale worker outcomes", async () => {
    const secureVault = vault();
    secureVault.stored = "native-session-token-123456789";
    const empty = createMobileSessionTransport({
      apiOrigin: "https://api.example.test",
      vault: secureVault,
      fetch: vi.fn(async () => response(404, {}))
    });
    const stale = createMobileSessionTransport({
      apiOrigin: "https://api.example.test",
      vault: secureVault,
      fetch: vi.fn(async () => response(409, {}))
    });
    expect(await empty.workerOffer("missing")).toEqual({ status: "empty" });
    expect(await stale.workerOffer("stale")).toEqual({ status: "stale" });
  });

  it("degrades unsafe or missing runtime origins to unavailable transport", () => {
    const secureVault = vault();
    expect(
      tryCreateMobileSessionTransport({ apiOrigin: undefined, vault: secureVault })
    ).toBeNull();
    expect(
      tryCreateMobileSessionTransport({ apiOrigin: "not a url", vault: secureVault })
    ).toBeNull();
    expect(
      tryCreateMobileSessionTransport({ apiOrigin: "http://api.example.test", vault: secureVault })
    ).toBeNull();
    expect(
      tryCreateMobileSessionTransport({ apiOrigin: "https://api.example.test", vault: secureVault })
    ).not.toBeNull();
    expect(
      tryCreateMobileSessionTransport({ apiOrigin: "http://localhost:4100", vault: secureVault })
    ).not.toBeNull();
  });

  it("registers, writing the session only to the secure vault and returning no token", async () => {
    const secureVault = vault();
    const transport = createMobileSessionTransport({
      apiOrigin: "https://api.example.test",
      vault: secureVault,
      fetch: vi.fn(async () => response(201, { token: "native-register-token-123456789" }))
    });
    const result = await transport.signUp({
      email: "worker@example.test",
      password: "correct horse battery",
      displayName: "Worker"
    });
    expect(result).toEqual({ status: "authenticated" });
    expect(JSON.stringify(result)).not.toContain("native-register-token");
    expect(secureVault.stored).toBe("native-register-token-123456789");
  });

  it("maps the registration gate and rejection states to bounded categories", async () => {
    const secureVault = vault();
    const transportFor = (status: number, retryAfter?: string) =>
      createMobileSessionTransport({
        apiOrigin: "https://api.example.test",
        vault: vault(),
        fetch: vi.fn(
          async () =>
            new Response(JSON.stringify({}), {
              status,
              headers: retryAfter
                ? { "content-type": "application/json", "retry-after": retryAfter }
                : { "content-type": "application/json" }
            })
        )
      });
    const signUp = (status: number, retryAfter?: string) =>
      transportFor(status, retryAfter).signUp({
        email: "person@example.test",
        password: "not-returned"
      });

    expect(await signUp(404)).toEqual({ status: "registration_closed" });
    expect(await signUp(409)).toEqual({ status: "conflict" });
    expect(await signUp(400)).toEqual({ status: "invalid" });
    expect(await signUp(429, "75")).toEqual({ status: "rate_limited", retryAfterSeconds: 75 });
    expect(secureVault.stored).toBeNull();
  });

  it("sends an email code, surfacing a dev code and mapping the not-enabled state", async () => {
    const secureVault = vault();
    secureVault.stored = "native-session-token-123456789";
    const sent = createMobileSessionTransport({
      apiOrigin: "https://api.example.test",
      vault: secureVault,
      fetch: vi.fn(async () => response(200, { code: "482913" }))
    });
    expect(await sent.sendEmailCode()).toEqual({ status: "sent", devCode: "482913" });

    const notEnabled = createMobileSessionTransport({
      apiOrigin: "https://api.example.test",
      vault: secureVault,
      fetch: vi.fn(async () => response(404, {}))
    });
    expect(await notEnabled.sendEmailCode()).toEqual({ status: "unavailable" });

    const durableStoreUnavailable = createMobileSessionTransport({
      apiOrigin: "https://api.example.test",
      vault: secureVault,
      fetch: vi.fn(async () => response(503, {}))
    });
    expect(await durableStoreUnavailable.sendEmailCode()).toEqual({ status: "unavailable" });
  });

  it("verifies an email code and rejects a malformed one before the network", async () => {
    const secureVault = vault();
    secureVault.stored = "native-session-token-123456789";
    const network = vi.fn(async () => response(200, {}));
    const transport = createMobileSessionTransport({
      apiOrigin: "https://api.example.test",
      vault: secureVault,
      fetch: network
    });
    expect(await transport.verifyEmailCode("123456")).toEqual({ status: "verified" });
    expect(await transport.verifyEmailCode("nope")).toEqual({ status: "invalid" });
    expect(network).toHaveBeenCalledTimes(1);

    const unavailable = createMobileSessionTransport({
      apiOrigin: "https://api.example.test",
      vault: secureVault,
      fetch: vi.fn(async () => response(503, {}))
    });
    expect(await unavailable.verifyEmailCode("123456")).toEqual({ status: "unavailable" });
  });

  it("denies email-code operations with no stored session", async () => {
    const transport = createMobileSessionTransport({
      apiOrigin: "https://api.example.test",
      vault: vault(),
      fetch: vi.fn()
    });
    expect(await transport.sendEmailCode()).toEqual({ status: "denied" });
    expect(await transport.verifyEmailCode("123456")).toEqual({ status: "denied" });
  });

  it("requires sign-out before registering another account", async () => {
    const secureVault = vault();
    secureVault.stored = "native-session-token-123456789";
    const network = vi.fn(async () => response(201, { token: "different-token-1234567890" }));
    const transport = createMobileSessionTransport({
      apiOrigin: "https://api.example.test",
      vault: secureVault,
      fetch: network
    });
    expect(
      await transport.signUp({ email: "other@example.test", password: "different account" })
    ).toEqual({ status: "sign_out_required" });
    expect(network).not.toHaveBeenCalled();
    expect(secureVault.stored).toBe("native-session-token-123456789");
  });
});

function workerOfferFixture(override: Record<string, unknown> = {}) {
  return {
    workerOfferId: "offer-1",
    jobRequestId: "request-1",
    status: "sent",
    expiresAt: "2026-08-02T12:00:00.000Z",
    title: null,
    summary: null,
    startAt: null,
    endAt: null,
    timezone: null,
    compensationSummary: null,
    policySummary: null,
    termsVersionId: "terms-1",
    versionToken: 1,
    visibility: "worker_authorized_offer_reference",
    ...override
  };
}
