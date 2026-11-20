import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { requestDayKey, sortRequestsForList } from "./calendar/requestCalendarGrid";

// Pre-launch audit (round 6): employer listings and money wiring.
const read = (...path: string[]) => readFileSync(join(__dirname, ...path), "utf8");

describe("request calendar", () => {
  it("puts a request on the day it starts in its own time zone", () => {
    // 9 p.m. in Montréal on Nov 12 is Nov 13 in UTC: it must stay on the 12th (month index 10).
    expect(requestDayKey("2026-11-13T02:00:00.000Z", "America/Toronto")).toBe("2026-10-12");
    expect(requestDayKey("2026-11-13T02:00:00.000Z", null)).toBe("2026-10-12");
    expect(requestDayKey("not a date", "America/Toronto")).toBeNull();
  });

  it("lists requests still to come soonest first, then finished ones most recent first", () => {
    const now = Date.parse("2026-11-12T12:00:00.000Z");
    const r = (id: string, start: string, end: string) => ({ id, startAt: start, endAt: end });
    const list = [
      r("created-last-but-far", "2026-12-20T13:00:00.000Z", "2026-12-20T19:00:00.000Z"),
      r("old", "2026-10-01T13:00:00.000Z", "2026-10-01T19:00:00.000Z"),
      r("soon", "2026-11-14T13:00:00.000Z", "2026-11-14T19:00:00.000Z"),
      r("older", "2026-09-01T13:00:00.000Z", "2026-09-01T19:00:00.000Z")
    ];
    expect(sortRequestsForList(list, now).map((x) => x.id)).toEqual(["soon", "created-last-but-far", "old", "older"]);
  });
});

describe("money on employer screens", () => {
  it("the request price box and the order form use the invoice rules (estimateEmployerRequest)", () => {
    const create = read("calendar", "create", "CreatePersistedRequestPanel.tsx");
    expect(create).toContain("estimateEmployerRequest({");
    expect(create).toContain("urgency: form.urgency,");
    expect(create).not.toContain("estimateRequestCost(");
    const order = read("orders", "create", "OrderBuilderPanel.tsx");
    expect(order).toContain("estimateEmployerRequest({ contractRateMinor: role.hourlyRateMinor, urgency: shared.urgency");
  });

  it("formats money in the viewer's language on the rate card, dashboard and money overview", () => {
    expect(read("contract", "ContractSignPanel.tsx")).toContain("}, fmtLocale(locale))}");
    expect(read("dashboard", "EmployerHomePanel.tsx")).toContain("money(summary.invoicesToPayMinor ?? 0, fmtLocale(locale))");
    expect(read("money", "EmployerMoneyPanel.tsx")).toContain("const moneyLocale = fmtLocale(useLocale());");
  });

  it("the payments page no longer points at the blocked payment-method page", () => {
    expect(read("payments", "page.tsx")).not.toContain('href="/employer/payments/method"');
  });

  it("the order detail shows times in the order's own time zone", () => {
    const detail = read("orders", "[orderId]", "OrderDetailPanel.tsx");
    expect(detail).not.toContain("toLocaleString(undefined");
    expect(detail).toContain('timeZone: order.timezone || "America/Toronto"');
  });
});
