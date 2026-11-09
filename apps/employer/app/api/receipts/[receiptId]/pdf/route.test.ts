import { beforeEach, describe, expect, it, vi } from "vitest";

const requestPdf = vi.fn();
vi.mock("../../../sessionBoundary", () => ({
  resolveClientOrganizationId: async () => ({ status: "ok", organizationId: "org-1" }),
  sessionBoundary: async () => ({ gateway: { requestPdf }, organizationId: "org-1", token: "token" }),
  sessionFailure: (status: string) => Response.json({ status }, { status: status === "denied" ? 401 : status === "not_found" ? 404 : 500 })
}));

const { GET } = await import("./route");
const RECEIPT = "3f2b6a1e-1111-4111-8111-111111111111";
const call = (receiptId: string) => GET(new Request("http://localhost/api"), { params: Promise.resolve({ receiptId }) });

describe("receipt PDF route", () => {
  beforeEach(() => requestPdf.mockReset());

  it("returns this company's receipt PDF as a download", async () => {
    requestPdf.mockResolvedValue({ status: "ok", bytes: new Uint8Array([37, 80, 68, 70]) });
    const response = await call(RECEIPT);
    expect(requestPdf).toHaveBeenCalledWith(`/employer/receipts/${RECEIPT}/pdf?organizationId=org-1`, "token");
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("attachment");
  });

  it("refuses odd ids without calling the API, and passes refusals through", async () => {
    expect((await call("../../secrets")).status).toBe(404);
    expect(requestPdf).not.toHaveBeenCalled();
    requestPdf.mockResolvedValue({ status: "denied" });
    expect((await call(RECEIPT)).status).toBe(401);
  });
});
