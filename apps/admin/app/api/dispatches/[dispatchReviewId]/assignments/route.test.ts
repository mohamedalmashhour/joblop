import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  sessionBoundary: vi.fn()
}));

vi.mock("../../../sessionBoundary", () => ({
  isSameOriginMutation: (input: Request) =>
    input.headers.get("origin") === new URL(input.url).origin &&
    input.headers.get("sec-fetch-site") !== "cross-site",
  sessionBoundary: mocks.sessionBoundary,
  sessionFailure: (status: string) =>
    Response.json({ status }, { status: status === "denied" ? 401 : 500 })
}));

import { POST } from "./route";

const { request, sessionBoundary } = mocks;
const dispatchReviewId = "00000000-0000-4000-8000-000000000001";
const workerOfferId = "00000000-0000-4000-8000-000000000002";
const originalEnvironment = {
  RWOS_ENV: process.env.RWOS_ENV,
  ASSIGNMENT_HANDOFF_ENABLED: process.env.ASSIGNMENT_HANDOFF_ENABLED
};

afterEach(() => {
  vi.clearAllMocks();
  restore("RWOS_ENV", originalEnvironment.RWOS_ENV);
  restore("ASSIGNMENT_HANDOFF_ENABLED", originalEnvironment.ASSIGNMENT_HANDOFF_ENABLED);
});

sessionBoundary.mockImplementation(async () => ({
  gateway: { request },
  token: "admin-session-token"
}));

describe("admin dispatch Assignment mutation boundary", () => {
  it("returns a truthful 404 before session or gateway work when the handoff is disabled", async () => {
    process.env.RWOS_ENV = "test";
    process.env.ASSIGNMENT_HANDOFF_ENABLED = "disabled";
    const response = await POST(
      new Request(`https://admin.example.test/api/dispatches/${dispatchReviewId}/assignments`, {
        method: "POST"
      }),
      { params: Promise.resolve({ dispatchReviewId }) }
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      status: "resource_unavailable",
      message: "Assignment creation is not enabled in this environment."
    });
    expect(sessionBoundary).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it("forwards only the dispatch-bound, version-bound command when explicitly enabled", async () => {
    process.env.RWOS_ENV = "test";
    process.env.ASSIGNMENT_HANDOFF_ENABLED = "enabled";
    request.mockResolvedValue({
      status: "ok",
      payload: {
        assignment: {
          id: "00000000-0000-4000-8000-000000000003",
          dispatchReviewId,
          workerOfferId,
          workerIdentityId: "00000000-0000-4000-8000-000000000004",
          status: "confirmed",
          confirmedTitle: "Dinner Chef Coverage",
          confirmedStartAt: "2026-08-01T16:00:00.000Z",
          confirmedEndAt: "2026-08-01T20:00:00.000Z",
          timezone: "America/Toronto",
          attendanceBoundary: "not_started",
          versionToken: 1,
          updatedAt: "2026-07-27T12:00:00.000Z"
        }
      }
    });
    const response = await POST(
      new Request(`https://admin.example.test/api/dispatches/${dispatchReviewId}/assignments`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://admin.example.test",
          "sec-fetch-site": "same-origin"
        },
        body: JSON.stringify({ workerOfferId, expectedOfferVersion: 2 })
      }),
      { params: Promise.resolve({ dispatchReviewId }) }
    );

    expect(response.status).toBe(201);
    expect(request).toHaveBeenCalledWith("/platform/assignments", "POST", "admin-session-token", {
      workerOfferId,
      dispatchReviewId,
      expectedOfferVersion: 2
    });
    expect(await response.json()).toEqual({
      assignment: expect.objectContaining({ workerOfferId, dispatchReviewId, status: "confirmed" })
    });
  });

  it("rejects cross-site and extra-field commands before gateway mutation", async () => {
    process.env.RWOS_ENV = "test";
    process.env.ASSIGNMENT_HANDOFF_ENABLED = "enabled";
    const crossSite = await POST(
      new Request(`https://admin.example.test/api/dispatches/${dispatchReviewId}/assignments`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://evil.example.test",
          "sec-fetch-site": "cross-site"
        },
        body: JSON.stringify({ workerOfferId, expectedOfferVersion: 2 })
      }),
      { params: Promise.resolve({ dispatchReviewId }) }
    );
    const extraField = await POST(
      new Request(`https://admin.example.test/api/dispatches/${dispatchReviewId}/assignments`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://admin.example.test",
          "sec-fetch-site": "same-origin"
        },
        body: JSON.stringify({
          workerOfferId,
          expectedOfferVersion: 2,
          workerIdentityId: "private"
        })
      }),
      { params: Promise.resolve({ dispatchReviewId }) }
    );

    expect(crossSite.status).toBe(401);
    expect(extraField.status).toBe(400);
    expect(request).not.toHaveBeenCalled();
  });

  it("preserves a privacy-safe source-unavailable response from the API", async () => {
    process.env.RWOS_ENV = "test";
    process.env.ASSIGNMENT_HANDOFF_ENABLED = "enabled";
    request.mockResolvedValue({ status: "not_found" });

    const response = await POST(
      new Request(`https://admin.example.test/api/dispatches/${dispatchReviewId}/assignments`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://admin.example.test",
          "sec-fetch-site": "same-origin"
        },
        body: JSON.stringify({ workerOfferId, expectedOfferVersion: 2 })
      }),
      { params: Promise.resolve({ dispatchReviewId }) }
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      status: "source_unavailable",
      message: "Assignment source is unavailable."
    });
  });

  it("forwards the shift-overlap refusal so staff see which shift is in the way", async () => {
    process.env.RWOS_ENV = "test";
    process.env.ASSIGNMENT_HANDOFF_ENABLED = "enabled";
    const conflict = {
      error: "RWOS_SHIFT_OVERLAP",
      message: "You already have a shift at that time (Tue, Nov 10, 9:00–17:00).",
      messages: { en: "You already have a shift at that time (Tue, Nov 10, 9:00–17:00)." }
    };
    request.mockResolvedValue({ status: "stale", conflict });

    const response = await POST(
      new Request(`https://admin.example.test/api/dispatches/${dispatchReviewId}/assignments`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://admin.example.test",
          "sec-fetch-site": "same-origin"
        },
        body: JSON.stringify({ workerOfferId, expectedOfferVersion: 2 })
      }),
      { params: Promise.resolve({ dispatchReviewId }) }
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ status: "shift_overlap", ...conflict });
  });

  it("keeps the generic conflict answer for any other 409", async () => {
    process.env.RWOS_ENV = "test";
    process.env.ASSIGNMENT_HANDOFF_ENABLED = "enabled";
    request.mockResolvedValue({ status: "stale" });

    const response = await POST(
      new Request(`https://admin.example.test/api/dispatches/${dispatchReviewId}/assignments`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://admin.example.test",
          "sec-fetch-site": "same-origin"
        },
        body: JSON.stringify({ workerOfferId, expectedOfferVersion: 2 })
      }),
      { params: Promise.resolve({ dispatchReviewId }) }
    );

    expect(response.status).toBe(409);
    expect((await response.json()).status).toBe("conflict");
  });
});

function restore(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
