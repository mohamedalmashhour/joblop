import { beforeEach, describe, expect, it, vi } from "vitest";

const request = vi.fn();
vi.mock("../../../sessionBoundary", () => ({
  isSameOriginMutation: () => true,
  resolveClientOrganizationId: async () => ({ status: "ok", organizationId: "org-1" }),
  sessionBoundary: async () => ({ gateway: { request }, organizationId: "org-1", token: "token" }),
  sessionFailure: (status: string) => Response.json({ status }, { status: 500 })
}));

const { POST } = await import("./route");
const call = (body: unknown) =>
  POST(new Request("http://localhost/api", { method: "POST", body: JSON.stringify(body) }), {
    params: Promise.resolve({ residenceId: "site-1" })
  });

describe("site location route", () => {
  beforeEach(() => request.mockReset());

  it("sends the postal code to the location service for this company's site", async () => {
    request.mockResolvedValue({ status: "ok", payload: { location: { city: "Laval" } } });
    const response = await call({ postalCode: " H7V 1A1 " });
    expect(response.status).toBe(200);
    expect(request).toHaveBeenCalledWith("/organizations/org-1/residences/site-1/geocode", "POST", "token", {
      postalCode: "H7V 1A1"
    });
  });

  it("refuses a missing postal code without calling the service", async () => {
    expect((await call({})).status).toBe(400);
    expect(request).not.toHaveBeenCalled();
  });
});
