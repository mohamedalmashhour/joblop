import { beforeEach, describe, expect, it, vi } from "vitest";

const request = vi.fn();
const boundary = vi.hoisted(() => ({ sameOrigin: true, token: "t" as string | null }));
vi.mock("../sessionBoundary", () => ({
  isSameOriginMutation: () => boundary.sameOrigin,
  sessionBoundary: async () => ({ gateway: { request }, token: boundary.token }),
  sessionFailure: (status: string) => Response.json({ status }, { status: status === "denied" ? 403 : 500 })
}));

import { POST } from "./[disputeId]/resolve/route";
import { GET } from "./route";

const context = { params: Promise.resolve({ disputeId: "a/b" }) };
const post = () => new Request("http://admin.test/x", { method: "POST", body: JSON.stringify({ resolution: "Done" }) });

describe("worker dispute staff proxy", () => {
  beforeEach(() => {
    request.mockReset().mockResolvedValue({ status: "ok", payload: { ok: true } });
    boundary.sameOrigin = true;
    boundary.token = "t";
  });

  it("forwards the queue read with the staff session", async () => {
    const res = await GET(new Request("http://admin.test/api/worker-disputes?status=open"));
    expect(res.status).toBe(200);
    expect(request).toHaveBeenCalledWith("/platform/worker-disputes?status=open", "GET", "t");
  });

  it("forwards a settlement to only the encoded dispute", async () => {
    const res = await POST(post(), context);
    expect(res.status).toBe(200);
    expect(request).toHaveBeenCalledWith("/platform/worker-disputes/a%2Fb/resolve", "POST", "t", { resolution: "Done" });
  });

  it("refuses a cross-site settlement or a missing session without calling the API", async () => {
    boundary.sameOrigin = false;
    expect((await POST(post(), context)).status).toBe(403);
    boundary.sameOrigin = true;
    boundary.token = null;
    expect((await POST(post(), context)).status).toBe(403);
    expect((await GET(new Request("http://admin.test/api/worker-disputes"))).status).toBe(403);
    expect(request).not.toHaveBeenCalled();
  });
});
