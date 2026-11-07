import { describe, expect, it } from "vitest";
import { attentionItems, summarizeHome, type HomeSources } from "./homeSummary";

const extras: Pick<HomeSources, "attendance" | "contractUnsigned" | "verificationStatus"> = {
  attendance: [],
  contractUnsigned: false,
  verificationStatus: "business_verified"
};

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
      ],
      ...extras,
      attendance: [{ status: "checked_in" }, { status: "completed" }]
    });
    expect(summary).toMatchObject({
      requestCount: 2,
      requestsNeedingAction: 1,
      timesheetsToConfirm: 1,
      invoicesToPay: 2,
      invoicesToPayMinor: 21696,
      workingNow: 1
    });
  });

  it("lists the next shifts soonest first, five at most, leaving out past and closed ones", () => {
    const now = new Date("2026-11-03T00:00:00Z");
    const requests = [
      ...[8, 7, 6, 5, 4, 9].map((day) => request(`JR-${day}`, `2026-11-0${day}T14:00:00Z`)),
      request("JR-past", "2026-11-01T14:00:00Z"),
      { ...request("JR-closed", "2026-11-04T10:00:00Z"), status: "cancelled" }
    ];
    const numbers = summarizeHome({ requests, timesheets: [], invoices: [], ...extras }, now).upcomingShifts.map((r) => r.requestNumber);
    expect(numbers).toEqual(["JR-4", "JR-5", "JR-6", "JR-7", "JR-8"]);
  });

  it("only raises items that need doing", () => {
    const summary = summarizeHome({
      requests: [request("JR-1", "2026-11-07T14:00:00Z")],
      timesheets: [{ status: "employer_review" }],
      invoices: [],
      ...extras
    });
    expect(attentionItems(summary)).toEqual([{ kind: "timesheets", count: 1, href: "/employer/timesheets" }]);
  });

  it("puts an unsigned contract and missing verification first", () => {
    const summary = summarizeHome({
      requests: [],
      timesheets: [],
      invoices: [{ status: "sent", totalMinor: 100 }],
      attendance: [],
      contractUnsigned: true,
      verificationStatus: "unverified"
    });
    expect(attentionItems(summary).map((item) => item.kind)).toEqual(["contract", "verification", "invoices"]);
  });

  it("does not ask for verification that is already moving", () => {
    for (const verificationStatus of ["pending", "review_required", "business_verified"]) {
      const summary = summarizeHome({ requests: [], timesheets: [], invoices: [], attendance: [], contractUnsigned: false, verificationStatus });
      expect(attentionItems(summary)).toEqual([]);
    }
  });

  it("keeps an unreadable source apart from zero", () => {
    expect(summarizeHome({ requests: null, timesheets: null, invoices: null, attendance: null, contractUnsigned: false, verificationStatus: null })).toMatchObject({
      requestCount: null,
      timesheetsToConfirm: null,
      invoicesToPay: null,
      invoicesToPayMinor: null,
      workingNow: null
    });
  });
});
