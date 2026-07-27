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
    expect(await stale.request("/platform/calendar/requests/one", "PUT", "server-session-token-123456789")).toEqual({ status: "stale" });
    expect(await unavailable.validate("server-session-token-123456789")).toEqual({ status: "unavailable" });
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
