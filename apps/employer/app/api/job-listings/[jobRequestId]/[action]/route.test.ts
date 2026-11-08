import { beforeEach, describe, expect, it, vi } from "vitest";

const request = vi.fn();
vi.mock("../../../sessionBoundary", () => ({
  isSameOriginMutation: () => true,
  resolveClientOrganizationId: async () => ({ status: "ok", organizationId: "org-1" }),
  sessionBoundary: async () => ({ gateway: { request }, organizationId: "org-1", token: "token" }),
  sessionFailure: (status: string) => Response.json({ status }, { status: status === "not_found" ? 404 : 500 })
}));

const { POST } = await import("./route");
const JOB = "44444444-4444-4444-8444-444444444444";

function call(jobRequestId: string, action: string, body: unknown) {
  return POST(
    new Request(`http://0.0.0.0:10000/api/job-listings/${jobRequestId}/${action}`, {
      method: "POST",
      headers: { "x-forwarded-host": "joblop-employer.onrender.com", "x-forwarded-proto": "https" },
      body: JSON.stringify(body)
    }),
    { params: Promise.resolve({ jobRequestId, action }) }
  );
}

describe("long-term listing proxy", () => {
  beforeEach(() => {
    request.mockReset();
    request.mockResolvedValue({ status: "ok", payload: { ok: true } });
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it("starts a trial for the session's organization, never the browser's", async () => {
    await call(JOB, "trial", { organizationId: "someone-else" });
    expect(request).toHaveBeenCalledWith(`/employer/job-listings/${JOB}/trial`, "POST", "token", { organizationId: "org-1" });
  });

  it("pays by card with the public address so Stripe can send the employer back", async () => {
    await call(JOB, "pay", { method: "stripe" });
    expect(request).toHaveBeenCalledWith(`/employer/job-listings/${JOB}/pay`, "POST", "token", {
      organizationId: "org-1",
      method: "stripe",
      origin: "https://joblop-employer.onrender.com"
    });
  });

  it("refuses unknown actions and malformed job ids without calling the API", async () => {
    expect((await call(JOB, "delete", {})).status).toBe(404);
    expect((await call("../../platform", "trial", {})).status).toBe(404);
    expect(request).not.toHaveBeenCalled();
  });
});
