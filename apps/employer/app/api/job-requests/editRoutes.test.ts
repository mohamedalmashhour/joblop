import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as SessionBoundaryModule from "../sessionBoundary";

const { gatewayRequest, sessionBoundaryMock, resolveOrganizationMock } = vi.hoisted(() => ({
  gatewayRequest: vi.fn(),
  sessionBoundaryMock: vi.fn(),
  resolveOrganizationMock: vi.fn()
}));

vi.mock("../sessionBoundary", async (importOriginal) => {
  const actual = await importOriginal<typeof SessionBoundaryModule>();
  return { ...actual, sessionBoundary: sessionBoundaryMock, resolveClientOrganizationId: resolveOrganizationMock };
});

import { POST as editPOST } from "./[jobRequestId]/edit/route";

const context = () => ({ params: Promise.resolve({ jobRequestId: "req-1" }) });
function sameOrigin(body: unknown) {
  return new Request("http://localhost:3000/api/job-requests/req-1/edit", {
    method: "POST",
    headers: { origin: "http://localhost:3000", "sec-fetch-site": "same-origin", "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

beforeEach(() => {
  gatewayRequest.mockReset();
  sessionBoundaryMock.mockReset();
  resolveOrganizationMock.mockReset();
  sessionBoundaryMock.mockResolvedValue({ gateway: { request: gatewayRequest }, organizationId: null, token: "session-token", cookieStore: {} });
  resolveOrganizationMock.mockResolvedValue({ status: "ok", organizationId: "org-1" });
});

describe("edit BFF route", () => {
  it("forwards proposed + expectedVersion; drops a client-supplied classification", async () => {
    gatewayRequest.mockResolvedValue({ status: "ok", payload: { classification: "MATERIAL", materialFields: ["work_date"], requiresReconfirmation: true, proposal: { status: "reconfirmation_pending" } } });
    const res = await editPOST(sameOrigin({ proposed: { startAt: "2026-09-15T20:00:00.000Z" }, expectedVersion: 2, classification: "NON_MATERIAL" }), context());
    expect(res.status).toBe(200);
    const body = await res.json();
    // server classification wins; client's "NON_MATERIAL" is ignored
    expect(body.classification).toBe("MATERIAL");
    expect(body.proposalStatus).toBe("reconfirmation_pending");
    const [path, , , forwarded] = gatewayRequest.mock.calls[0] ?? [];
    expect(path).toBe("/organizations/org-1/job-requests/req-1/edit");
    expect(forwarded).toEqual({ proposed: { startAt: "2026-09-15T20:00:00.000Z" }, expectedVersion: 2 });
    expect(forwarded).not.toHaveProperty("classification");
  });

  it("rejects missing proposed/version with 400; cross-site with 401", async () => {
    expect((await editPOST(sameOrigin({ expectedVersion: 2 }), context())).status).toBe(400);
    const cross = new Request("http://localhost:3000/api/job-requests/req-1/edit", { method: "POST", headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site" }, body: "{}" });
    expect((await editPOST(cross, context())).status).toBe(401);
    expect(gatewayRequest).not.toHaveBeenCalled();
  });
});
