import { describe, expect, it } from "vitest";
import { summarizeHome } from "./homeSummary";

const request = (requestNumber: string, startAt: string, actionRequired: string | null = null) => ({
  requestNumber,
  title: requestNumber,
  startAt,
  timezone: "America/Toronto",
  status: "submitted",
  actionRequired
});

describe("summarizeHome", () => {
  it("counts what needs the employer", () => {
    const summary = summarizeHome({
      requests: [request("JR-1", "2026-11-07T14:00:00Z", "information_required"), request("JR-2", "2026-11-08T14:00:00Z")],
      timesheets: [{ status: "employer_review" }, { status: "locked" }],
      invoices: [
        { status: "sent", totalMinor: 20696 },
        { status: "overdue", totalMinor: 1000 },
        { status: "paid", totalMinor: 5000 }
      ]
    });
    expect(summary).toMatchObject({
      requestCount: 2,
      requestsNeedingAction: 1,
      timesheetsToConfirm: 1,
      invoicesToPay: 2,
      invoicesToPayMinor: 21696
    });
  });

  it("shows the latest requests first, five at most", () => {
    const requests = [1, 2, 3, 4, 5, 6].map((day) => request(`JR-${day}`, `2026-11-0${day}T14:00:00Z`));
    const numbers = summarizeHome({ requests, timesheets: [], invoices: [] }).recentRequests.map((r) => r.requestNumber);
    expect(numbers).toEqual(["JR-6", "JR-5", "JR-4", "JR-3", "JR-2"]);
  });

  it("keeps an unreadable source apart from zero", () => {
    expect(summarizeHome({ requests: null, timesheets: null, invoices: null })).toMatchObject({
      requestCount: null,
      timesheetsToConfirm: null,
      invoicesToPay: null,
      invoicesToPayMinor: null
    });
  });
});
