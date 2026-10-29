import { describe, expect, it, vi } from "vitest";
import {
  createVolatileSessionVault,
  createMobileSessionTransport,
  tryCreateMobileSessionTransport,
  type SecureSessionVault
} from "./secureSession";

describe("volatile browser session vault", () => {
  it("retains a token only inside one vault instance and clears it", async () => {
    const first = createVolatileSessionVault();
    const second = createVolatileSessionVault();

    await first.write("synthetic-session-token");
    expect(await first.read()).toBe("synthetic-session-token");
    expect(await second.read()).toBeNull();

    await first.clear();
    expect(await first.read()).toBeNull();
  });
});

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

describe("worker payout ledger transport", () => {
  const origin = "https://api.example.com";

  it("projects the real /worker/payouts summary (currency + minor totals + counts)", async () => {
    const secureVault = vault();
    secureVault.stored = "session-token-aaaaaaaaaaaa";
    const transport = createMobileSessionTransport({
      apiOrigin: origin,
      vault: secureVault,
      fetch: vi.fn(async () =>
        response(200, {
          toPay: [{ id: "p1" }, { id: "p2" }],
          paid: [{ id: "p3" }],
          summary: { currency: "CAD", toPayMinor: 60000, paidMinor: 48000 },
          synthetic: true
        })
      )
    });
    const result = await transport.workerPayouts();
    expect(result).toEqual({
      status: "ready",
      data: { currency: "CAD", toPayMinor: 60000, paidMinor: 48000, toPayCount: 2, paidCount: 1 }
    });
  });

  it("reports empty when the worker has no payouts, denied without a session, and error on a 500", async () => {
    const withToken = vault();
    withToken.stored = "session-token-bbbbbbbbbbbb";
    const emptyTransport = createMobileSessionTransport({
      apiOrigin: origin,
      vault: withToken,
      fetch: vi.fn(async () => response(200, { toPay: [], paid: [], summary: { currency: "CAD", toPayMinor: 0, paidMinor: 0 } }))
    });
    expect(await emptyTransport.workerPayouts()).toEqual({ status: "empty" });

    const noToken = vault();
    const deniedTransport = createMobileSessionTransport({
      apiOrigin: origin,
      vault: noToken,
      fetch: vi.fn(async () => response(200, {}))
    });
    expect(await deniedTransport.workerPayouts()).toEqual({ status: "denied" });

    const errorVault = vault();
    errorVault.stored = "session-token-cccccccccccc";
    const errorTransport = createMobileSessionTransport({
      apiOrigin: origin,
      vault: errorVault,
      fetch: vi.fn(async () => response(500, {}))
    });
    expect(await errorTransport.workerPayouts()).toEqual({ status: "error" });
  });

  it("never sends money — it only issues a GET to /worker/payouts with the bearer token", async () => {
    const secureVault = vault();
    secureVault.stored = "session-token-dddddddddddd";
    const fetchMock = vi.fn(async () => response(200, { toPay: [], paid: [], summary: {} }));
    const transport = createMobileSessionTransport({ apiOrigin: origin, vault: secureVault, fetch: fetchMock });
    await transport.workerPayouts();
    expect(fetchMock).toHaveBeenCalledWith(
      `${origin}/worker/payouts`,
      expect.objectContaining({ method: "GET", headers: expect.objectContaining({ authorization: "Bearer session-token-dddddddddddd" }) })
    );
  });
});

describe("open marketplace transport", () => {
  const origin = "https://api.example.com";
  function withSession() {
    const v = vault();
    v.stored = "session-token-eeeeeeeeeeee";
    return v;
  }

  it("searches open shifts and projects the safe job list (role, employer, area, window, openings)", async () => {
    const fetchMock = vi.fn(async () =>
      response(200, {
        origin: { province: "QC", city: "Montreal", postalCode: "H2X1Y4" },
        total: 1,
        nextCursor: null,
        jobs: [
          {
            jobRequestId: "11111111-1111-4111-8111-111111111111",
            role: "Dishwasher",
            employerName: "Residence Care",
            verifiedEmployer: true,
            city: "Montreal",
            province: "QC",
            latitude: 45.5,
            longitude: -73.6,
            startAt: "2026-07-01T12:00:00.000Z",
            endAt: "2026-07-01T20:00:00.000Z",
            openings: 3,
            workerRateMinor: null,
            currency: "CAD",
            saved: false
          }
        ]
      })
    );
    const transport = createMobileSessionTransport({ apiOrigin: origin, vault: withSession(), fetch: fetchMock });
    const result = await transport.marketplaceSearch({ postalCode: "H2X 1Y4", verifiedOnly: true });
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.data.jobs).toHaveLength(1);
      expect(result.data.jobs[0]).toMatchObject({ role: "Dishwasher", employerName: "Residence Care", verifiedEmployer: true, openings: 3, workerRateMinor: null });
    }
    expect(fetchMock).toHaveBeenCalledWith(
      `${origin}/marketplace/jobs/search`,
      expect.objectContaining({ method: "POST", headers: expect.objectContaining({ authorization: "Bearer session-token-eeeeeeeeeeee" }) })
    );
  });

  it("maps marketplace states: empty jobs → empty, bad location → invalid_location, no session → denied", async () => {
    const emptyT = createMobileSessionTransport({ apiOrigin: origin, vault: withSession(), fetch: vi.fn(async () => response(200, { jobs: [], total: 0 })) });
    expect((await emptyT.marketplaceSearch({ postalCode: "H2X 1Y4" })).status).toBe("empty");

    const badLocT = createMobileSessionTransport({ apiOrigin: origin, vault: withSession(), fetch: vi.fn(async () => response(422, { error: "RWOS_ORIGIN_UNRESOLVED" })) });
    expect((await badLocT.marketplaceSearch({ postalCode: "ZZZ" })).status).toBe("invalid_location");

    const deniedT = createMobileSessionTransport({ apiOrigin: origin, vault: vault(), fetch: vi.fn(async () => response(200, { jobs: [] })) });
    expect((await deniedT.marketplaceSearch({ postalCode: "H2X 1Y4" })).status).toBe("denied");
  });

  it("loads a job detail and 404 → not_found", async () => {
    const okT = createMobileSessionTransport({
      apiOrigin: origin,
      vault: withSession(),
      fetch: vi.fn(async () =>
        response(200, {
          job: {
            jobRequestId: "22222222-2222-4222-8222-222222222222",
            role: "Cook",
            title: "Evening line cook",
            employerId: "org-1",
            employerName: "Villa Kitchen",
            verifiedEmployer: false,
            city: "Laval",
            province: "QC",
            startAt: "2026-07-02T16:00:00.000Z",
            endAt: "2026-07-02T23:00:00.000Z",
            openings: 1,
            workerRateMinor: null,
            currency: "CAD",
            description: "Line cook for dinner service.",
            duties: "Prep, plating, cleanup.",
            qualifications: ["Food-safe"],
            saved: false
          }
        })
      )
    });
    const ok = await okT.marketplaceJob("22222222-2222-4222-8222-222222222222");
    expect(ok.status).toBe("ready");
    if (ok.status === "ready") expect(ok.data).toMatchObject({ title: "Evening line cook", qualifications: ["Food-safe"], workerRateMinor: null });

    const missT = createMobileSessionTransport({ apiOrigin: origin, vault: withSession(), fetch: vi.fn(async () => response(404, {})) });
    expect((await missT.marketplaceJob("22222222-2222-4222-8222-222222222222")).status).toBe("not_found");
  });

  it("applies by expressing interest (idempotent alreadyInterested) and 404 → not_found", async () => {
    const applyT = createMobileSessionTransport({
      apiOrigin: origin,
      vault: withSession(),
      fetch: vi.fn(async () => response(200, { interest: { status: "submitted", jobRequestId: "x", createdAt: "2026-07-01T00:00:00.000Z" }, alreadyInterested: false }))
    });
    const res = await applyT.expressInterest("33333333-3333-4333-8333-333333333333");
    expect(res).toMatchObject({ status: "ready", interestStatus: "submitted", alreadyInterested: false });

    const dupT = createMobileSessionTransport({ apiOrigin: origin, vault: withSession(), fetch: vi.fn(async () => response(200, { interest: { status: "submitted" }, alreadyInterested: true })) });
    expect((await dupT.expressInterest("33333333-3333-4333-8333-333333333333"))).toMatchObject({ status: "ready", alreadyInterested: true });

    const missT = createMobileSessionTransport({ apiOrigin: origin, vault: withSession(), fetch: vi.fn(async () => response(404, {})) });
    expect((await missT.expressInterest("33333333-3333-4333-8333-333333333333")).status).toBe("not_found");
  });
});

describe("my applications (interests) transport", () => {
  const origin = "https://api.example.com";
  function withSession() {
    const v = vault();
    v.stored = "session-token-ffffffffffff";
    return v;
  }

  it("projects my interests with the privacy-safe job summary + linked offer status", async () => {
    const fetchMock = vi.fn(async () =>
      response(200, {
        count: 1,
        interests: [
          {
            jobRequestId: "44444444-4444-4444-8444-444444444444",
            status: "offer_created",
            createdAt: "2026-07-01T00:00:00.000Z",
            offerStatus: "sent",
            summary: {
              role: "Cook",
              title: "Dinner cook",
              employer: { id: "org-9", name: "Maple Residence" },
              areaLabel: "Laval, QC",
              startAt: "2026-07-05T16:00:00.000Z",
              endAt: "2026-07-05T23:00:00.000Z"
            }
          }
        ]
      })
    );
    const transport = createMobileSessionTransport({ apiOrigin: origin, vault: withSession(), fetch: fetchMock });
    const result = await transport.myInterests();
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.data[0]).toMatchObject({ status: "offer_created", offerStatus: "sent" });
      expect(result.data[0]!.summary).toMatchObject({ title: "Dinner cook", employerName: "Maple Residence", areaLabel: "Laval, QC" });
    }
    expect(fetchMock).toHaveBeenCalledWith(
      `${origin}/marketplace/my-interests`,
      expect.objectContaining({ method: "GET", headers: expect.objectContaining({ authorization: "Bearer session-token-ffffffffffff" }) })
    );
  });

  it("maps empty → empty and no session → denied", async () => {
    const emptyT = createMobileSessionTransport({ apiOrigin: origin, vault: withSession(), fetch: vi.fn(async () => response(200, { count: 0, interests: [] })) });
    expect((await emptyT.myInterests()).status).toBe("empty");
    const deniedT = createMobileSessionTransport({ apiOrigin: origin, vault: vault(), fetch: vi.fn(async () => response(200, { interests: [] })) });
    expect((await deniedT.myInterests()).status).toBe("denied");
  });
});
