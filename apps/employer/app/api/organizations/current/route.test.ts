import { beforeEach, describe, expect, it, vi } from "vitest";

const request = vi.fn();
const boundary = vi.hoisted(() => ({
  context: { status: "ok", organizationId: "org/1" } as Record<string, unknown>,
  sameOrigin: true
}));
vi.mock("../../sessionBoundary", () => ({
  isSameOriginMutation: () => boundary.sameOrigin,
  resolveClientOrganizationId: async () => boundary.context,
  sessionBoundary: async () => ({ gateway: { request }, organizationId: null, token: "t" }),
  sessionFailure: (status: string) => Response.json({ status }, { status: status === "stale" ? 409 : status === "denied" ? 401 : 500 })
}));

import { readCompanyUpdate } from "./companyDetails";
import { GET, PATCH } from "./route";

const organization = {
  legalName: "Legal Inc.",
  displayName: "Public",
  publicId: "ORG-1",
  version: "2026-11-07T00:00:00.000Z",
  status: "active",
  createdByUserId: "hidden"
};
const body = { legalName: " New Legal ", displayName: "New Public", expectedVersion: "v1", status: "closed" };
const patch = (input: unknown = body) => new Request("http://employer.test/x", { method: "PATCH", body: JSON.stringify(input) });

describe("readCompanyUpdate", () => {
  it("keeps only the names and version", () => {
    expect(readCompanyUpdate(body)).toEqual({ legalName: "New Legal", displayName: "New Public", expectedVersion: "v1" });
  });

  it("refuses blank or oversized names and a missing version", () => {
    expect(readCompanyUpdate({ ...body, legalName: "  " })).toBeNull();
    expect(readCompanyUpdate({ ...body, displayName: "x".repeat(201) })).toBeNull();
    expect(readCompanyUpdate({ ...body, expectedVersion: "" })).toBeNull();
    expect(readCompanyUpdate(null)).toBeNull();
  });
});

describe("current company route", () => {
  beforeEach(() => {
    request.mockReset().mockResolvedValue({ status: "ok", payload: { organization } });
    boundary.context = { status: "ok", organizationId: "org/1" };
    boundary.sameOrigin = true;
  });

  it("returns only the fields the page needs", async () => {
    const response = await GET();
    expect(request).toHaveBeenCalledWith("/organizations/org%2F1", "GET", "t");
    expect((await response.json()).company).toEqual({
      legalName: "Legal Inc.",
      displayName: "Public",
      publicId: "ORG-1",
      version: "2026-11-07T00:00:00.000Z"
    });
  });

  it("forwards a save with only the allowed fields", async () => {
    expect((await PATCH(patch())).status).toBe(200);
    expect(request).toHaveBeenCalledWith("/organizations/org%2F1", "PATCH", "t", {
      legalName: "New Legal",
      displayName: "New Public",
      expectedVersion: "v1"
    });
  });

  it("refuses a cross-site or invalid save without calling the API", async () => {
    boundary.sameOrigin = false;
    expect((await PATCH(patch())).status).toBe(401);
    boundary.sameOrigin = true;
    expect((await PATCH(patch({ legalName: "" }))).status).toBe(400);
    expect(request).not.toHaveBeenCalled();
  });

  it("reports when someone else changed the company first", async () => {
    request.mockResolvedValue({ status: "stale" });
    expect((await PATCH(patch())).status).toBe(409);
  });

  it("sends an account with no company to setup", async () => {
    boundary.context = { status: "context_required", organizations: [] };
    const response = await GET();
    expect(response.status).toBe(409);
    expect((await response.json()).organizations).toEqual([]);
  });
});
