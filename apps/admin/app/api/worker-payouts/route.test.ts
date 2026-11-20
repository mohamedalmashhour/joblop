import { beforeEach, describe, expect, it, vi } from "vitest";

const request = vi.fn();
const boundary = vi.hoisted(() => ({ sameOrigin: true, token: "t" as string | null }));
vi.mock("../sessionBoundary", () => ({
  isSameOriginMutation: () => boundary.sameOrigin,
  sessionBoundary: async () => ({ gateway: { request }, token: boundary.token }),
  sessionFailure: (status: string) => Response.json({ status }, { status: status === "denied" ? 403 : 500 })
}));

import { POST } from "./[payoutId]/test-payout/route";
import { GET } from "./route";

const context = { params: Promise.resolve({ payoutId: "a/b" }) };
const post = () => new Request("http://admin.test/x", { method: "POST" });

describe("worker payout staff proxy", () => {
  beforeEach(() => {
    request.mockReset().mockResolvedValue({ status: "ok", payload: { ok: true } });
    boundary.sameOrigin = true;
    boundary.token = "t";
  });

  it("forwards the list read with the staff session", async () => {
    expect((await GET()).status).toBe(200);
    expect(request).toHaveBeenCalledWith("/platform/worker-payouts", "GET", "t");
  });

  it("sends only the encoded payout to the test route", async () => {
    expect((await POST(post(), context)).status).toBe(200);
    expect(request).toHaveBeenCalledWith("/platform/worker-payouts/a%2Fb/execute-test-payout", "POST", "t", {});
  });

  it("refuses a cross-site request or a missing session without calling the API", async () => {
    boundary.sameOrigin = false;
    expect((await POST(post(), context)).status).toBe(403);
    boundary.sameOrigin = true;
    boundary.token = null;
    expect((await POST(post(), context)).status).toBe(403);
    expect((await GET()).status).toBe(403);
    expect(request).not.toHaveBeenCalled();
  });
});
