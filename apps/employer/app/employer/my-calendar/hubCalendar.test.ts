import { describe, expect, it } from "vitest";
import { en, fr } from "../../i18n/messages";
import {
  dayKey,
  gridRange,
  groupByDay,
  hrefFor,
  layerOf,
  monthGrid,
  parseHubPayload,
  toneColor,
  toneOf,
  type HubItem
} from "./hubCalendar";

const base: HubItem = {
  id: "job:1",
  type: "job",
  startAt: "2026-11-10T13:00:00.000Z",
  endAt: null,
  title: "Cook",
  subtitle: null,
  status: "open",
  amountMinor: 2500,
  bonus: null,
  placesLeft: 2,
  placesAsked: 2,
  placesTaken: 0,
  jobRequestId: "11111111-1111-4111-8111-111111111111",
  refId: null
};

describe("employer calendar hub helpers", () => {
  it("colours jobs by coverage and review state", () => {
    expect(toneOf(base)).toBe("open");
    expect(toneOf({ ...base, status: "partly_filled" })).toBe("partly");
    expect(toneOf({ ...base, status: "full" })).toBe("full");
    expect(toneOf({ ...base, status: "under_review" })).toBe("review");
    expect(toneOf({ ...base, status: "open", placesTaken: 1 })).toBe("partly");
    expect(toneOf({ ...base, type: "cancelled_job", status: "cancelled" })).toBe("cancelled");
    expect(toneOf({ ...base, type: "bonus_offer" })).toBe("bonus");
    expect(toneOf({ ...base, type: "invoice_due" })).toBe("invoice");
  });

  it("never uses blue or teal", () => {
    for (const colour of Object.values(toneColor)) {
      expect(["#f8b808", "#3ddc84", "#e4756b", "#f4efe4", "#8f8574"]).toContain(colour);
    }
  });

  it("sorts items into filter layers", () => {
    expect(layerOf(base)).toBe("jobs");
    expect(layerOf({ ...base, type: "bonus_offer" })).toBe("bonus");
    expect(layerOf({ ...base, type: "invoice_due" })).toBe("invoices");
    expect(layerOf({ ...base, type: "cancelled_job" })).toBe("cancelled");
    expect(layerOf({ ...base, status: "withdrawn" })).toBe("cancelled");
  });

  it("links jobs and bonus offers to the request page and invoices to the invoice detail", () => {
    expect(hrefFor(base)).toBe(`/employer/calendar/request?request=${base.jobRequestId}`);
    expect(hrefFor({ ...base, type: "bonus_offer", refId: "b1" })).toBe(
      `/employer/calendar/request?request=${base.jobRequestId}`
    );
    expect(hrefFor({ type: "invoice_due", jobRequestId: null, refId: "inv 1" })).toBe(
      "/employer/invoices/detail?invoice=inv%201"
    );
    expect(hrefFor({ type: "invoice_due", jobRequestId: null, refId: null })).toBeNull();
  });

  it("builds a Monday-first grid and a request window covering it", () => {
    const days = monthGrid(new Date(2026, 10, 1)); // November 2026 starts on a Sunday
    expect(days.length % 7).toBe(0);
    expect(days[0]?.getDay()).toBe(1);
    expect(dayKey(days[6] as Date)).toBe("2026-11-01");
    const range = gridRange(new Date(2026, 10, 1));
    expect(new Date(range.to).getTime() - new Date(range.from).getTime()).toBeLessThan(93 * 86_400_000);
  });

  it("parses the contract payload defensively and groups by day", () => {
    const parsed = parseHubPayload({
      items: [base, { id: "bad" }, { ...base, id: "job:2", startAt: "2026-11-10T12:00:00.000Z" }],
      today: [{ type: "job", title: "Cook today", severity: "urgent" }, { title: 3 }],
      from: "x",
      to: "y"
    });
    expect(parsed?.items).toHaveLength(2);
    expect(parsed?.today).toEqual([
      { type: "job", title: "Cook today", detail: null, severity: "urgent", startAt: null, jobRequestId: null, refId: null }
    ]);
    const grouped = groupByDay(parsed?.items ?? []);
    const list = grouped.get(dayKey(new Date("2026-11-10T13:00:00.000Z")));
    expect(list?.[0]?.id).toBe("job:2");
    expect(parseHubPayload(null)).toBeNull();
  });

  it("ships every hub string in English and French", () => {
    const hubKeys = Object.keys(en).filter((key) => key.startsWith("hub.") || key === "shell.nav.myCalendar");
    expect(hubKeys.length).toBeGreaterThan(10);
    for (const key of hubKeys) expect(fr[key as keyof typeof fr]).toBeTruthy();
  });
});
