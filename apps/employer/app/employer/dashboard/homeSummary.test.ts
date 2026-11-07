import { describe, expect, it } from "vitest";
import { attentionItems, summarizeHome } from "./homeSummary";

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

  it("lists the next shifts soonest first, five at most, leaving out past and closed ones", () => {
    const now = new Date("2026-11-03T00:00:00Z");
    const requests = [
      ...[8, 7, 6, 5, 4, 9].map((day) => request(`JR-${day}`, `2026-11-0${day}T14:00:00Z`)),
      request("JR-past", "2026-11-01T14:00:00Z"),
      { ...request("JR-closed", "2026-11-04T10:00:00Z"), status: "cancelled" }
    ];
    const numbers = summarizeHome({ requests, timesheets: [], invoices: [] }, now).upcomingShifts.map((r) => r.requestNumber);
    expect(numbers).toEqual(["JR-4", "JR-5", "JR-6", "JR-7", "JR-8"]);
  });

  it("only raises items that need doing", () => {
    const summary = summarizeHome({
      requests: [request("JR-1", "2026-11-07T14:00:00Z")],
      timesheets: [{ status: "employer_review" }],
      invoices: []
    });
    expect(attentionItems(summary)).toEqual([{ kind: "timesheets", count: 1, href: "/employer/timesheets" }]);
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
