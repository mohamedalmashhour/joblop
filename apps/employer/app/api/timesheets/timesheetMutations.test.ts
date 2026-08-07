import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as SessionBoundaryModule from "../sessionBoundary";

// Fake only the network boundary. isSameOriginMutation (CSRF) and sessionFailure
// (status mapping) stay real, so the route's own guard + validation logic is tested.
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

import { POST as confirmPOST } from "./[timesheetId]/confirm/route";
import { POST as disputePOST } from "./[timesheetId]/dispute/route";

const timesheetPayload = {
  id: "ts-1",
  assignmentId: "as-1",
  status: "platform_review",
  scheduledStartAt: "2026-08-10T22:00:00.000Z",
  scheduledEndAt: "2026-08-11T06:00:00.000Z",
  actualCheckInAt: "2026-08-10T22:02:00.000Z",
  actualCheckOutAt: "2026-08-11T06:01:00.000Z",
  timezone: "America/Toronto",
  payableMinutes: 480,
  billableMinutes: 480,
  breakMinutes: 30,
  excludedMinutes: 0,
  exceptionSummary: null,
  workerReviewStatus: "confirmed",
  employerReviewStatus: "confirmed",
  platformReviewStatus: "not_started",
  employerReviewedAt: "2026-08-11T06:10:00.000Z",
  approvedAt: null,
  lockedAt: null,
  rejectedAt: null,
  cancelledAt: null,
  version: 3,
  updatedAt: "2026-08-11T06:10:00.000Z",
  // sensitive fields the API serializer also spreads — must never reach the client
  workerIdentityId: "worker-secret",
  employerReviewedByUserId: "user-secret"
};

const context = () => ({ params: Promise.resolve({ timesheetId: "ts-1" }) });

function sameOriginRequest(url: string, body: unknown) {
  return new Request(url, {
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
  gatewayRequest.mockResolvedValue({ status: "ok", payload: { timesheet: timesheetPayload } });
});

describe("employer timesheet confirm BFF route", () => {
  it("proxies a same-origin confirm to the org-scoped endpoint and returns the whitelisted timesheet", async () => {
    const response = await confirmPOST(
      sameOriginRequest("http://localhost:3000/api/timesheets/ts-1/confirm", { expectedVersion: 2 }),
      context()
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.timesheet.status).toBe("platform_review");
    expect(body.timesheet.versionToken).toBe(3);
    expect(body.timesheet).not.toHaveProperty("workerIdentityId");
    expect(body.timesheet).not.toHaveProperty("employerReviewedByUserId");
    expect(gatewayRequest).toHaveBeenCalledWith(
      "/organizations/org-1/timesheets/ts-1/confirm",
      "POST",
      "session-token",
      { expectedVersion: 2 }
    );
  });

  it("rejects a cross-site confirm before any network call (CSRF)", async () => {
    const request = new Request("http://localhost:3000/api/timesheets/ts-1/confirm", {
      method: "POST",
      headers: { origin: "https://attacker.example", "sec-fetch-site": "cross-site" },
      body: JSON.stringify({ expectedVersion: 2 })
    });
    const response = await confirmPOST(request, context());
    expect(response.status).toBe(401);
    expect(gatewayRequest).not.toHaveBeenCalled();
  });

  it("rejects a missing or non-positive expectedVersion with 400", async () => {
    const missing = await confirmPOST(
      sameOriginRequest("http://localhost:3000/api/timesheets/ts-1/confirm", {}),
      context()
    );
    const zero = await confirmPOST(
      sameOriginRequest("http://localhost:3000/api/timesheets/ts-1/confirm", { expectedVersion: 0 }),
      context()
    );
    expect(missing.status).toBe(400);
    expect(zero.status).toBe(400);
    expect(gatewayRequest).not.toHaveBeenCalled();
  });

  it("maps an upstream version conflict to 409 stale", async () => {
    gatewayRequest.mockResolvedValueOnce({ status: "stale" });
    const response = await confirmPOST(
      sameOriginRequest("http://localhost:3000/api/timesheets/ts-1/confirm", { expectedVersion: 2 }),
      context()
    );
    expect(response.status).toBe(409);
  });
});

describe("employer timesheet dispute BFF route", () => {
  it("proxies a same-origin dispute with a trimmed reason", async () => {
    const response = await disputePOST(
      sameOriginRequest("http://localhost:3000/api/timesheets/ts-1/dispute", {
        expectedVersion: 2,
        reason: "  hours look wrong  "
      }),
      context()
    );
    expect(response.status).toBe(200);
    expect(gatewayRequest).toHaveBeenCalledWith(
      "/organizations/org-1/timesheets/ts-1/dispute",
      "POST",
      "session-token",
      { expectedVersion: 2, reason: "hours look wrong" }
    );
  });

  it("rejects a dispute with a missing or empty reason with 400", async () => {
    const missing = await disputePOST(
      sameOriginRequest("http://localhost:3000/api/timesheets/ts-1/dispute", { expectedVersion: 2 }),
      context()
    );
    const empty = await disputePOST(
      sameOriginRequest("http://localhost:3000/api/timesheets/ts-1/dispute", {
        expectedVersion: 2,
        reason: "   "
      }),
      context()
    );
    expect(missing.status).toBe(400);
    expect(empty.status).toBe(400);
    expect(gatewayRequest).not.toHaveBeenCalled();
  });
});
