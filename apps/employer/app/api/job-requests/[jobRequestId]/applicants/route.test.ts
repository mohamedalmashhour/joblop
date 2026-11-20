import { beforeEach, describe, expect, it, vi } from "vitest";

const { boundary, mocked, request } = vi.hoisted(() => {
  const request = vi.fn();
  const boundary = { context: { status: "ok", organizationId: "org" } as Record<string, unknown>, sameOrigin: true };
  const mocked = () => ({
    isSameOriginMutation: () => boundary.sameOrigin,
    resolveClientOrganizationId: async () => boundary.context,
    sessionBoundary: async () => ({ gateway: { request }, organizationId: null, token: "t" }),
    sessionFailure: (status: string) =>
      Response.json({ status }, { status: status === "denied" ? 401 : status === "stale" ? 409 : 404 })
  });
  return { boundary, mocked, request };
});
vi.mock("../../../sessionBoundary", mocked);
vi.mock("../../../../../sessionBoundary", mocked);

import { POST } from "./[interestId]/favorite/route";
import { GET } from "./route";

const job = "11111111-1111-4111-8111-111111111111";
const interest = "22222222-2222-4222-8222-222222222222";
const params = (jobRequestId = job) => ({ params: Promise.resolve({ jobRequestId, interestId: interest }) });
const post = (body: unknown = { favorite: true }) => new Request("http://employer.test/x", { method: "POST", body: JSON.stringify(body) });

describe("employer applicants routes", () => {
  beforeEach(() => {
    request.mockReset().mockResolvedValue({ status: "ok", payload: { applicants: [] } });
    boundary.context = { status: "ok", organizationId: "org" };
    boundary.sameOrigin = true;
  });

  it("reads applicants for the employer's own company", async () => {
    expect((await GET(new Request("http://employer.test/x"), params())).status).toBe(200);
    expect(request).toHaveBeenCalledWith(`/organizations/org/job-requests/${job}/applicants`, "GET", "t");
  });

  it("forwards only the favourite flag", async () => {
    expect((await POST(post({ favorite: true, status: "shortlisted" }), params())).status).toBe(200);
    expect(request).toHaveBeenCalledWith(
      `/organizations/org/job-requests/${job}/applicants/${interest}/favorite`,
      "POST",
      "t",
      { favorite: true }
    );
  });

  it("refuses bad references, bad values and cross-site requests without calling the API", async () => {
    expect((await GET(new Request("http://employer.test/x"), params("nope"))).status).toBe(404);
    expect((await POST(post({ favorite: "yes" }), params())).status).toBe(404);
    boundary.sameOrigin = false;
    expect((await POST(post(), params())).status).toBe(401);
    expect(request).not.toHaveBeenCalled();
  });
});
