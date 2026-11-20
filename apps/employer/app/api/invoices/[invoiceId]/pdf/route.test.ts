import { beforeEach, describe, expect, it, vi } from "vitest";

const requestPdf = vi.fn();
vi.mock("../../../sessionBoundary", () => ({
  resolveClientOrganizationId: async () => ({ status: "ok", organizationId: "org-1" }),
  sessionBoundary: async () => ({ gateway: { requestPdf }, organizationId: "org-1", token: "token" }),
  sessionFailure: (status: string) => Response.json({ status }, { status: status === "denied" ? 401 : 500 })
}));

const { GET } = await import("./route");
const call = () => GET(new Request("http://localhost/api"), { params: Promise.resolve({ invoiceId: "inv-1" }) });

describe("invoice PDF route", () => {
  beforeEach(() => requestPdf.mockReset());

  it("returns this company's invoice PDF as a download", async () => {
    requestPdf.mockResolvedValue({ status: "ok", bytes: new Uint8Array([37, 80, 68, 70]) });
    const response = await call();
    expect(requestPdf).toHaveBeenCalledWith("/organizations/org-1/invoices/inv-1/pdf", "token");
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([37, 80, 68, 70]));
  });

  it("refuses when the API refuses", async () => {
    requestPdf.mockResolvedValue({ status: "denied" });
    expect((await call()).status).toBe(401);
  });
});
