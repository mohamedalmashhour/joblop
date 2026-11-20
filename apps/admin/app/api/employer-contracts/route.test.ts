import { beforeEach, describe, expect, it, vi } from "vitest";

const { boundary, request } = vi.hoisted(() => ({
  boundary: { sameOrigin: true, token: "t" as string | null },
  request: vi.fn()
}));
vi.mock("../sessionBoundary", () => ({
  isSameOriginMutation: () => boundary.sameOrigin,
  sessionBoundary: async () => ({ gateway: { request }, token: boundary.token }),
  sessionFailure: (status: string) => Response.json({ status }, { status: status === "denied" ? 403 : status === "not_found" ? 404 : 500 })
}));

import { contractVersion, readPublishRequest } from "./contractRequest";
import { GET, POST } from "./route";

const org = "11111111-1111-4111-8111-111111111111";
const rate = {
  workGroupId: "22222222-2222-4222-8222-222222222222",
  roleDefinitionId: "33333333-3333-4333-8333-333333333333",
  hourlyRateMinor: 200
};
const post = (body: unknown) => new Request("http://admin.test/x", { method: "POST", body: JSON.stringify(body) });
const get = (id = org) => new Request(`http://admin.test/x?organizationId=${id}`);

describe("readPublishRequest", () => {
  it("accepts valid rates and drops anything else", () => {
    expect(readPublishRequest({ organizationId: org, roleRates: [{ ...rate, extra: 1 }], status: "x" })).toEqual({
      organizationId: org,
      roleRates: [rate]
    });
  });

  it("refuses empty, zero, fractional, huge or malformed rates", () => {
    expect(readPublishRequest({ organizationId: org, roleRates: [] })).toBeNull();
    for (const hourlyRateMinor of [0, -5, 1.5, 100_001, "200"]) {
      expect(readPublishRequest({ organizationId: org, roleRates: [{ ...rate, hourlyRateMinor }] })).toBeNull();
    }
    expect(readPublishRequest({ organizationId: "nope", roleRates: [rate] })).toBeNull();
  });

  it("builds a version label within the API limit", () => {
    expect(contractVersion(new Date("2026-11-07T05:06:00Z"))).toBe("v-202611070506");
  });
});

describe("employer contracts proxy", () => {
  beforeEach(() => {
    request.mockReset().mockResolvedValue({ status: "ok", payload: { contract: null, roleDefinitions: [{ id: "r" }], workGroups: [{ id: "g" }] } });
    boundary.sameOrigin = true;
    boundary.token = "t";
  });

  it("reads the rate card through the staff route", async () => {
    const response = await GET(get());
    expect(request).toHaveBeenCalledWith(`/platform/organizations/${org}/contract`, "GET", "t");
    expect(await response.json()).toEqual({ contract: null, roleDefinitions: [{ id: "r" }], workGroups: [{ id: "g" }] });
  });

  it("publishes only the checked rates with a server-made version", async () => {
    expect((await POST(post({ organizationId: org, roleRates: [rate], version: "mine" }))).status).toBe(200);
    expect(request).toHaveBeenCalledWith(`/organizations/${org}/contract`, "POST", "t", {
      version: expect.stringMatching(/^v-\d{12}$/),
      roleRates: [rate]
    });
  });

  it("refuses a cross-site, invalid or signed-out request without calling the API", async () => {
    boundary.sameOrigin = false;
    expect((await POST(post({ organizationId: org, roleRates: [rate] }))).status).toBe(403);
    boundary.sameOrigin = true;
    expect((await POST(post({ organizationId: org, roleRates: [] }))).status).toBe(400);
    expect((await GET(get("nope"))).status).toBe(404);
    boundary.token = null;
    expect((await GET(get())).status).toBe(403);
    expect(request).not.toHaveBeenCalled();
  });
});
