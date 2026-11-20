import { beforeEach, describe, expect, it, vi } from "vitest";

const request = vi.fn();
vi.mock("../../../sessionBoundary", () => ({
  isSameOriginMutation: () => true,
  resolveClientOrganizationId: async () => ({ status: "ok", organizationId: "org-1" }),
  sessionBoundary: async () => ({ gateway: { request }, organizationId: "org-1", token: "token" }),
  sessionFailure: (status: string) => Response.json({ status }, { status: 500 })
}));

const { POST } = await import("./route");

describe("invoice card checkout route", () => {
  beforeEach(() => {
    request.mockReset();
    request.mockResolvedValue({ status: "ok", payload: { checkoutUrl: "https://checkout.stripe.com/x" } });
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it("gives Stripe the public address, not the server's internal one", async () => {
    await POST(
      new Request("http://0.0.0.0:10000/api/invoices/inv-1/checkout", {
        method: "POST",
        headers: { "x-forwarded-host": "joblop-employer.onrender.com", "x-forwarded-proto": "https" }
      }),
      { params: Promise.resolve({ invoiceId: "inv-1" }) }
    );
    expect(request).toHaveBeenCalledWith("/organizations/org-1/invoices/inv-1/checkout", "POST", "token", {
      origin: "https://joblop-employer.onrender.com"
    });
  });
});
