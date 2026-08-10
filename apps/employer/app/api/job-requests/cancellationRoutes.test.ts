import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as SessionBoundaryModule from "../sessionBoundary";

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

import { POST as previewPOST } from "./[jobRequestId]/cancel/preview/route";
import { POST as confirmPOST } from "./[jobRequestId]/cancel/confirm/route";

const preview = {
  jobRequestId: "req-1",
  shiftStartAt: "2026-08-20T20:00:00.000Z",
  cause: "EMPLOYER_CANCELLED",
  hoursBeforeStart: 10,
  withinCutoff: true,
  affectedConfirmedWorkers: 2,
  governedRateMinor: 3000,
  currency: "CAD",
  minimumShiftHours: 6,
  cutoffHours: 48,
  obligationApplies: true,
  obligationAmountMinor: 36000,
  requiresPlatformHandoff: true
};

const context = () => ({ params: Promise.resolve({ jobRequestId: "req-1" }) });

function sameOrigin(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { origin: "http://localhost:3000", "sec-fetch-site": "same-origin", "content-type": "application/json" },
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

describe("cancel preview BFF route", () => {
  it("returns the whitelisted authoritative preview and forwards no body", async () => {
    gatewayRequest.mockResolvedValue({ status: "ok", payload: { preview: { ...preview, secretInternal: "x" } } });
    const res = await previewPOST(sameOrigin("http://localhost:3000/api/job-requests/req-1/cancel/preview", {}), context());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.preview.obligationAmountMinor).toBe(36000);
    expect(body.preview).not.toHaveProperty("secretInternal");
    expect(gatewayRequest).toHaveBeenCalledWith(
      "/organizations/org-1/job-requests/req-1/cancel/preview",
      "POST",
      "session-token",
      {}
    );
  });

  it("rejects a cross-site preview before any network call", async () => {
    const req = new Request("http://localhost:3000/api/job-requests/req-1/cancel/preview", {
      method: "POST",
      headers: { origin: "https://attacker.example", "sec-fetch-site": "cross-site" }
    });
    const res = await previewPOST(req, context());
    expect(res.status).toBe(401);
    expect(gatewayRequest).not.toHaveBeenCalled();
  });
});

describe("cancel confirm BFF route", () => {
  it("forwards ONLY the idempotency key — tampered amount/rate/count are dropped", async () => {
    gatewayRequest.mockResolvedValue({
      status: "ok",
      payload: { cancellation: { id: "cx-1", status: "assignment_cancellation_pending", cause: "EMPLOYER_CANCELLED", affectedConfirmedWorkers: 2, obligation: { id: "ob-1", amountMinor: 36000, currency: "CAD", status: "RECORDED" } }, preview }
    });
    const res = await confirmPOST(
      sameOrigin("http://localhost:3000/api/job-requests/req-1/cancel/confirm", {
        idempotencyKey: "k1",
        // Tampered authoritative values — must never reach the API.
        obligationAmountMinor: 1,
        governedRateMinor: 1,
        affectedConfirmedWorkers: 99,
        withinCutoff: false
      }),
      context()
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cancellation.status).toBe("assignment_cancellation_pending");
    expect(body.cancellation.obligationAmountMinor).toBe(36000);

    const [path, method, token, forwarded] = gatewayRequest.mock.calls[0] ?? [];
    expect(path).toBe("/organizations/org-1/job-requests/req-1/cancel/confirm");
    expect(method).toBe("POST");
    expect(token).toBe("session-token");
    expect(forwarded).toEqual({ idempotencyKey: "k1" }); // nothing else crosses the boundary
  });

  it("rejects a missing idempotency key with 400 before any network call", async () => {
    const res = await confirmPOST(
      sameOrigin("http://localhost:3000/api/job-requests/req-1/cancel/confirm", {}),
      context()
    );
    expect(res.status).toBe(400);
    expect(gatewayRequest).not.toHaveBeenCalled();
  });

  it("rejects a cross-site confirm before any network call", async () => {
    const req = new Request("http://localhost:3000/api/job-requests/req-1/cancel/confirm", {
      method: "POST",
      headers: { origin: "https://attacker.example", "sec-fetch-site": "cross-site" },
      body: JSON.stringify({ idempotencyKey: "k1" })
    });
    const res = await confirmPOST(req, context());
    expect(res.status).toBe(401);
    expect(gatewayRequest).not.toHaveBeenCalled();
  });
});
