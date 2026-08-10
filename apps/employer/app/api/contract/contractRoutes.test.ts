import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as SessionBoundaryModule from "../sessionBoundary";

// Fake only the network boundary. isSameOriginMutation (CSRF) and sessionFailure
// (status mapping) stay real, so the route's own guards are exercised.
const { gatewayRequest, sessionBoundaryMock, resolveOrganizationMock } = vi.hoisted(() => ({
  gatewayRequest: vi.fn(),
  sessionBoundaryMock: vi.fn(),
  resolveOrganizationMock: vi.fn()
}));

vi.mock("../sessionBoundary", async (importOriginal) => {
  const actual = await importOriginal<typeof SessionBoundaryModule>();
  return {
    ...actual,
    sessionBoundary: sessionBoundaryMock,
    resolveClientOrganizationId: resolveOrganizationMock
  };
});

import { GET as contractGET } from "./route";
import { POST as signPOST } from "./sign/route";

const activeUnsigned = {
  id: "c1",
  organizationId: "org-1",
  version: "2026-Q3",
  status: "active",
  currency: "CAD",
  signedAt: null,
  activatedAt: "2026-08-01T00:00:00.000Z",
  effectiveFrom: "2026-08-01T00:00:00.000Z",
  roleRates: [
    { workGroupId: "wg-1", roleDefinitionId: "role-chef", hourlyRateMinor: 3000, currency: "CAD" }
  ],
  // Fields the API serializer also holds — must never reach the client.
  createdByUserId: "admin-secret",
  signedByUserId: null
};

function sameOriginPost(body: unknown) {
  return new Request("http://localhost:3000/api/contract/sign", {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      "sec-fetch-site": "same-origin",
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

beforeEach(() => {
  gatewayRequest.mockReset();
  sessionBoundaryMock.mockReset();
  resolveOrganizationMock.mockReset();
  sessionBoundaryMock.mockResolvedValue({
    gateway: { request: gatewayRequest },
    organizationId: null,
    token: "session-token",
    cookieStore: {}
  });
  resolveOrganizationMock.mockResolvedValue({ status: "ok", organizationId: "org-1" });
});

describe("employer contract GET BFF route", () => {
  it("returns the whitelisted contract, dropping internal identity fields", async () => {
    gatewayRequest.mockResolvedValue({ status: "ok", payload: { contract: activeUnsigned } });
    const response = await contractGET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.contract.version).toBe("2026-Q3");
    expect(body.contract.signedAt).toBeNull();
    expect(body.contract.roleRates[0].hourlyRateMinor).toBe(3000);
    expect(body.contract).not.toHaveProperty("createdByUserId");
    expect(body.contract).not.toHaveProperty("signedByUserId");
    expect(gatewayRequest).toHaveBeenCalledWith("/organizations/org-1/contract", "GET", "session-token");
  });

  it("returns { contract: null } when the organization has no contract", async () => {
    gatewayRequest.mockResolvedValue({ status: "ok", payload: { contract: null } });
    const response = await contractGET();
    expect(response.status).toBe(200);
    expect((await response.json()).contract).toBeNull();
  });

  it("maps an upstream failure to its status (503 unavailable)", async () => {
    gatewayRequest.mockResolvedValue({ status: "unavailable" });
    const response = await contractGET();
    expect(response.status).toBe(503);
  });
});

describe("employer contract sign BFF route", () => {
  it("forwards the acknowledgment with NO rates in the body (rate integrity)", async () => {
    const signed = { ...activeUnsigned, signedAt: "2026-08-10T12:00:00.000Z" };
    gatewayRequest.mockResolvedValue({ status: "ok", payload: { contract: signed } });

    // Even if a tampered client posts rates, the route must not forward them.
    const response = await signPOST(sameOriginPost({ roleRates: [{ hourlyRateMinor: 1 }] }));
    expect(response.status).toBe(200);
    expect((await response.json()).contract.signedAt).not.toBeNull();

    expect(gatewayRequest).toHaveBeenCalledTimes(1);
    const [path, method, token, forwardedBody] = gatewayRequest.mock.calls[0];
    expect(path).toBe("/organizations/org-1/contract/sign");
    expect(method).toBe("POST");
    expect(token).toBe("session-token");
    expect(forwardedBody).toEqual({}); // no rates ever reach the API
  });

  it("rejects a cross-site sign before any network call (CSRF)", async () => {
    const request = new Request("http://localhost:3000/api/contract/sign", {
      method: "POST",
      headers: { origin: "https://attacker.example", "sec-fetch-site": "cross-site" },
      body: JSON.stringify({})
    });
    const response = await signPOST(request);
    expect(response.status).toBe(401);
    expect(gatewayRequest).not.toHaveBeenCalled();
  });

  it("maps an upstream already-signed conflict to 409", async () => {
    gatewayRequest.mockResolvedValue({ status: "stale" });
    const response = await signPOST(sameOriginPost({}));
    expect(response.status).toBe(409);
  });
});
