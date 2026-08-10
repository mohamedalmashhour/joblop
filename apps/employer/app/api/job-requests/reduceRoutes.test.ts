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

import { POST as previewPOST } from "./[jobRequestId]/reduce/preview/route";
import { POST as confirmPOST } from "./[jobRequestId]/reduce/confirm/route";

const preview = {
  jobRequestId: "req-1",
  previousTarget: 5,
  newTarget: 2,
  confirmedWorkers: 3,
  unfilledCapacity: 2,
  unfilledRemoved: 2,
  affectedConfirmed: 1,
  requiresConfirmedSelection: true,
  eligibleAssignments: [{ id: "as-1", status: "confirmed", startAt: "2026-08-20T20:00:00.000Z", endAt: "2026-08-21T04:00:00.000Z" }],
  withinCutoff: true,
  governedRateMinor: 3000,
  currency: "CAD",
  obligationApplies: true,
  obligationAmountMinor: 18000
};

const context = () => ({ params: Promise.resolve({ jobRequestId: "req-1" }) });
function sameOrigin(url: string, body: unknown) {
  return new Request(url, { method: "POST", headers: { origin: "http://localhost:3000", "sec-fetch-site": "same-origin", "content-type": "application/json" }, body: JSON.stringify(body) });
}

beforeEach(() => {
  gatewayRequest.mockReset();
  sessionBoundaryMock.mockReset();
  resolveOrganizationMock.mockReset();
  sessionBoundaryMock.mockResolvedValue({ gateway: { request: gatewayRequest }, organizationId: null, token: "session-token", cookieStore: {} });
  resolveOrganizationMock.mockResolvedValue({ status: "ok", organizationId: "org-1" });
});

describe("reduce preview BFF route", () => {
  it("forwards only newTarget and returns the whitelisted preview", async () => {
    gatewayRequest.mockResolvedValue({ status: "ok", payload: { preview: { ...preview, secret: "x" } } });
    const res = await previewPOST(sameOrigin("http://localhost:3000/api/job-requests/req-1/reduce/preview", { newTarget: 2, obligationAmountMinor: 1 }), context());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.preview.obligationAmountMinor).toBe(18000);
    expect(body.preview).not.toHaveProperty("secret");
    expect(gatewayRequest).toHaveBeenCalledWith("/organizations/org-1/job-requests/req-1/reduce/preview", "POST", "session-token", { newTarget: 2 });
  });

  it("rejects cross-site before any network call", async () => {
    const req = new Request("http://localhost:3000/api/job-requests/req-1/reduce/preview", { method: "POST", headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site" } });
    expect((await previewPOST(req, context())).status).toBe(401);
    expect(gatewayRequest).not.toHaveBeenCalled();
  });
});

describe("reduce confirm BFF route", () => {
  it("forwards ONLY newTarget/selection/version/key — tampered rate/amount/count dropped", async () => {
    gatewayRequest.mockResolvedValue({
      status: "ok",
      payload: { reduction: { id: "rx-1", status: "assignment_cancellation_pending", previousTarget: 5, newTarget: 2, affectedConfirmed: 1, obligationAmountMinor: 18000, obligationCurrency: "CAD" }, preview }
    });
    const res = await confirmPOST(
      sameOrigin("http://localhost:3000/api/job-requests/req-1/reduce/confirm", {
        newTarget: 2,
        selectedAssignmentIds: ["as-1"],
        expectedVersion: 3,
        idempotencyKey: "k1",
        // tampered authoritative values:
        obligationAmountMinor: 1,
        governedRateMinor: 1,
        confirmedWorkers: 99,
        affectedConfirmed: 5
      }),
      context()
    );
    expect(res.status).toBe(200);
    const [path, , , forwarded] = gatewayRequest.mock.calls[0] ?? [];
    expect(path).toBe("/organizations/org-1/job-requests/req-1/reduce/confirm");
    expect(forwarded).toEqual({ newTarget: 2, selectedAssignmentIds: ["as-1"], expectedVersion: 3, idempotencyKey: "k1" });
  });

  it("rejects a missing idempotency key / version with 400", async () => {
    const res = await confirmPOST(sameOrigin("http://localhost:3000/api/job-requests/req-1/reduce/confirm", { newTarget: 2, selectedAssignmentIds: [] }), context());
    expect(res.status).toBe(400);
    expect(gatewayRequest).not.toHaveBeenCalled();
  });
});
