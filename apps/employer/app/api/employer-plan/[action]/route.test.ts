import { beforeEach, describe, expect, it, vi } from "vitest";

const request = vi.fn();
vi.mock("../../sessionBoundary", () => ({
  isSameOriginMutation: () => true,
  resolveClientOrganizationId: async () => ({ status: "ok", organizationId: "org-1" }),
  sessionBoundary: async () => ({ gateway: { request }, organizationId: "org-1", token: "token" }),
  sessionFailure: (status: string) => Response.json({ status }, { status: status === "not_found" ? 404 : 500 })
}));

const { POST } = await import("./route");

function call(action: string, body: unknown) {
  return POST(
    new Request(`http://0.0.0.0:10000/api/employer-plan/${action}`, {
      method: "POST",
      headers: { "x-forwarded-host": "joblop-employer.onrender.com", "x-forwarded-proto": "https" },
      body: JSON.stringify(body)
    }),
    { params: Promise.resolve({ action }) }
  );
}

describe("employer plan action proxy", () => {
  beforeEach(() => {
    request.mockReset();
    request.mockResolvedValue({ status: "ok", payload: { ok: true } });
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it("adds the session's organization to a trial, never trusting the browser's", async () => {
    await call("trial", { plan: "shift_pro", organizationId: "someone-else" });
    expect(request).toHaveBeenCalledWith("/employer/plan/trial", "POST", "token", { organizationId: "org-1", plan: "shift_pro" });
  });

  it("subscribes with the public address so Stripe can send the employer back", async () => {
    await call("subscribe", { plan: "contract_plus", method: "stripe" });
    expect(request).toHaveBeenCalledWith("/employer/plan/subscribe", "POST", "token", {
      organizationId: "org-1",
      plan: "contract_plus",
      method: "stripe",
      origin: "https://joblop-employer.onrender.com"
    });
  });

  it("cancels one track", async () => {
    await call("cancel", { track: "long_term" });
    expect(request).toHaveBeenCalledWith("/employer/plan/cancel", "POST", "token", { organizationId: "org-1", track: "long_term" });
  });

  it("refuses unknown actions without calling the API", async () => {
    const response = await call("delete-everything", {});
    expect(response.status).toBe(404);
    expect(request).not.toHaveBeenCalled();
  });
});
