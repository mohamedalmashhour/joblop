import { describe, expect, it, vi } from "vitest";
import {
  createFrontendSessionGateway,
  localAdminSessionCookieName,
  localEmployerSessionCookieName,
  localFrontendSessionCookieName,
  secureAdminSessionCookieName,
  secureEmployerSessionCookieName,
  secureFrontendSessionCookieName
} from "./frontendSession";

const apiResponse = (status: number, payload: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => payload
});

describe("secure frontend session gateway", () => {
  it("persists a token server-side without returning it to the frontend", async () => {
    const fetch = vi.fn(async () =>
      apiResponse(200, {
        token: "server-session-token-123456789",
        user: { id: "user-1" },
        session: { expiresAt: "2026-08-01T00:00:00.000Z" }
      })
    );
    const persistToken = vi.fn();
    const result = await createFrontendSessionGateway({
      apiOrigin: "https://api.example.test",
      fetch
    }).signIn({ email: "owner@example.test", password: "correct horse" }, persistToken);
    expect(persistToken).toHaveBeenCalledWith("server-session-token-123456789");
    expect(JSON.stringify(result)).not.toContain("server-session-token");
  });

  it("runtime-whitelists nested session DTOs", async () => {
    const gateway = createFrontendSessionGateway({
      apiOrigin: "https://api.example.test",
      fetch: async () =>
        apiResponse(200, {
          authenticated: true,
          token: "never-return",
          credentials: { passwordHash: "never-return" },
          user: {
            id: "user-1",
            publicId: "USR-1",
            emailNormalized: "person@example.test",
            displayName: "Person",
            status: "active",
            passwordHash: "never-return"
          },
          session: {
            id: "session-1",
            userId: "user-1",
            expiresAt: "2026-08-01T00:00:00.000Z",
            sessionHash: "never-return",
            nested: { secret: "never-return" }
          }
        })
    });
    const result = await gateway.validate("server-session-token-123456789");
    expect(result).toEqual({
      status: "ok",
      payload: {
        authenticated: true,
        user: {
          id: "user-1",
          publicId: "USR-1",
          emailNormalized: "person@example.test",
          displayName: "Person",
          status: "active"
        },
        session: {
          id: "session-1",
          userId: "user-1",
          expiresAt: "2026-08-01T00:00:00.000Z"
        }
      }
    });
    expect(JSON.stringify(result)).not.toMatch(/token|password|secret|credentials/i);
  });

  it("uses bearer auth and no-store only inside the server gateway", async () => {
    const fetch = vi.fn(async () => apiResponse(200, { requests: [] }));
    await createFrontendSessionGateway({
      apiOrigin: "https://api.example.test",
      fetch
    }).request("/platform/calendar/requests", "GET", "server-session-token-123456789");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/platform/calendar/requests",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({
          authorization: "Bearer server-session-token-123456789"
        })
      })
    );
  });

  it("forwards versioned PATCH mutations through the server-only gateway", async () => {
    const fetch = vi.fn(async () => apiResponse(200, { jobRequest: { versionToken: 2 } }));
    await createFrontendSessionGateway({
      apiOrigin: "https://api.example.test",
      fetch
    }).request(
      "/organizations/org-1/job-requests/request-1",
      "PATCH",
      "server-session-token-123456789",
      { expectedVersion: 1, title: "Updated request" }
    );
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/organizations/org-1/job-requests/request-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ expectedVersion: 1, title: "Updated request" }),
        headers: expect.objectContaining({
          authorization: "Bearer server-session-token-123456789",
          "content-type": "application/json"
        })
      })
    );
  });

  it("returns generic denied and error states", async () => {
    const gateway = createFrontendSessionGateway({
      apiOrigin: "https://api.example.test",
      fetch: async () => apiResponse(403, { privateReason: "wrong role" })
    });
    expect(await gateway.validate("server-session-token-123456789")).toEqual({ status: "denied" });
    expect(await gateway.validate(null)).toEqual({ status: "denied" });
  });

  it("preserves stale and unavailable categories without exposing upstream details", async () => {
    const stale = createFrontendSessionGateway({
      apiOrigin: "https://api.example.test",
      fetch: async () => apiResponse(409, { privateReason: "version mismatch" })
    });
    const unavailable = createFrontendSessionGateway({
      apiOrigin: "https://api.example.test",
      fetch: async () => apiResponse(503, { privateReason: "database offline" })
    });
    expect(
      await stale.request(
        "/platform/calendar/requests/one",
        "PUT",
        "server-session-token-123456789"
      )
    ).toEqual({ status: "stale" });
    expect(await unavailable.validate("server-session-token-123456789")).toEqual({
      status: "unavailable"
    });
  });

  it("classifies network failures as unavailable across session operations", async () => {
    const gateway = createFrontendSessionGateway({
      apiOrigin: "https://api.example.test",
      fetch: async () => {
        throw new TypeError("synthetic network failure");
      }
    });

    await expect(gateway.validate("server-session-token-123456789")).resolves.toEqual({
      status: "unavailable"
    });
    await expect(gateway.signIn({ email: "user@example.test", password: "synthetic" }, vi.fn()))
      .resolves.toEqual({ status: "unavailable" });
    await expect(
      gateway.register({ email: "user@example.test", password: "synthetic" }, vi.fn())
    ).resolves.toEqual({ status: "unavailable" });
  });

  it("preserves a bounded not-found category without exposing upstream details", async () => {
    const gateway = createFrontendSessionGateway({
      apiOrigin: "https://api.example.test",
      fetch: async () =>
        apiResponse(404, {
          error: "RWOS_ASSIGNMENT_SOURCE_UNAVAILABLE",
          privateReason: "source_chain_mismatch:worker-private-id"
        })
    });

    const result = await gateway.request(
      "/platform/assignments",
      "POST",
      "server-session-token-123456789",
      {
        workerOfferId: "00000000-0000-4000-8000-000000000101",
        dispatchReviewId: "00000000-0000-4000-8000-000000000102",
        expectedOfferVersion: 1
      }
    );

    expect(result).toEqual({ status: "not_found" });
    expect(JSON.stringify(result)).not.toContain("worker-private-id");
  });

  it("preserves only a bounded retry interval for rate-limited sign-in", async () => {
    const gateway = createFrontendSessionGateway({
      apiOrigin: "https://api.example.test",
      fetch: async () => ({
        ...apiResponse(429, { privateBucket: "never-return" }),
        headers: { get: (name: string) => (name === "retry-after" ? "75" : null) }
      })
    });

    expect(
      await gateway.signIn(
        { email: "person@example.test", password: "not-returned" },
        () => undefined
      )
    ).toEqual({ status: "rate_limited", retryAfterSeconds: 75 });
  });

  it("registers, persisting the token server-side without returning it to the frontend", async () => {
    const fetch = vi.fn(async () =>
      apiResponse(201, {
        token: "server-session-token-register-1",
        user: { id: "user-2" },
        session: { expiresAt: "2026-08-01T00:00:00.000Z" }
      })
    );
    const persistToken = vi.fn();
    const result = await createFrontendSessionGateway({
      apiOrigin: "https://api.example.test",
      fetch
    }).register(
      { email: "owner@example.test", password: "correct horse battery", displayName: "Owner" },
      persistToken
    );
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/auth/register",
      expect.objectContaining({ method: "POST" })
    );
    expect(persistToken).toHaveBeenCalledWith("server-session-token-register-1");
    expect(result.status).toBe("ok");
    expect(JSON.stringify(result)).not.toContain("server-session-token");
  });

  it("maps the registration gate and rejection states to bounded categories", async () => {
    const gatewayFor = (status: number, retryAfter?: string) =>
      createFrontendSessionGateway({
        apiOrigin: "https://api.example.test",
        fetch: async () => ({
          ...apiResponse(status, { privateReason: "never-return" }),
          headers: { get: (name: string) => (name === "retry-after" ? retryAfter ?? null : null) }
        })
      });
    const register = (status: number, retryAfter?: string) =>
      gatewayFor(status, retryAfter).register(
        { email: "person@example.test", password: "not-returned" },
        () => undefined
      );

    expect(await register(404)).toEqual({ status: "registration_closed" });
    expect(await register(409)).toEqual({ status: "conflict" });
    expect(await register(400)).toEqual({ status: "invalid" });
    expect(await register(429, "75")).toEqual({ status: "rate_limited", retryAfterSeconds: 75 });
  });

  it("rejects insecure non-local origins", () => {
    expect(() =>
      createFrontendSessionGateway({
        apiOrigin: "http://api.example.test",
        fetch: async () => apiResponse(200, {})
      })
    ).toThrow("RWOS_UNTRUSTED_INTERNAL_API_ORIGIN");
  });

  it("uses a host-prefixed production cookie and a distinct localhost cookie", () => {
    expect(secureFrontendSessionCookieName).toBe("__Host-rwos_frontend_session");
    expect(localFrontendSessionCookieName).toBe("rwos_local_frontend_session");
    expect(secureEmployerSessionCookieName).toBe("__Host-rwos_employer_session");
    expect(secureAdminSessionCookieName).toBe("__Host-rwos_admin_session");
    expect(localEmployerSessionCookieName).toBe("rwos_local_employer_session");
    expect(localAdminSessionCookieName).toBe("rwos_local_admin_session");
    expect(secureEmployerSessionCookieName).not.toBe(secureAdminSessionCookieName);
    expect(localEmployerSessionCookieName).not.toBe(localAdminSessionCookieName);
  });
});
