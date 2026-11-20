import { describe, expect, it } from "vitest";
import { calendarDayKey, formatRwosCurrency } from "@rwos/shared";
import { isHourlyLeadPay, leadPayLabel } from "./leadPay";
import { groupByTorontoDay, torontoStartOfDayIso } from "./torontoTime";
import { formatAmount } from "./jobs-calendar/JobsCalendar";
import { splitSchedule } from "./schedule/MySchedule";
import { sortOffers } from "./offers/Offers";
import { hours } from "./pay/MyPay";
import { formatWhen } from "./MarketplaceExplorer";
import { dictionaries } from "./i18n/messages";

// Pre-launch audit (round 6): every money figure and date a worker sees, checked against the shared
// domain formatter and America/Toronto.

describe("outside job-board pay (Find work, public board)", () => {
  const cases = [
    { name: "hourly by period", lead: { salaryMaxMinor: 2500, salaryPeriod: "hour" }, en: "$25.00/h", fr: "25,00 $/h" },
    { name: "hourly by size (no period) — used to show $0k", lead: { salaryMaxMinor: 1660, salaryPeriod: null }, en: "$16.60/h", fr: "16,60 $/h" },
    { name: "yearly", lead: { salaryMaxMinor: 4500000, salaryPeriod: "year" }, en: "$45K/yr", fr: "45 k $/an" },
    { name: "yearly range", lead: { salaryMinMinor: 4000000, salaryMaxMinor: 4500000, salaryPeriod: "year" }, en: "$40K–$45K/yr", fr: "40 k $–45 k $/an" }
  ] as const;
  for (const c of cases) {
    it(c.name, () => {
      // Intl may use a narrow no-break space in French; compare with plain spaces.
      const plain = (s: string | null) => (s ?? "").replace(new RegExp(`[${String.fromCharCode(0xa0, 0x202f)}]`, "g"), " ");
      expect(plain(leadPayLabel(c.lead, "en-CA"))).toBe(c.en);
      expect(plain(leadPayLabel(c.lead, "fr-CA"))).toBe(c.fr);
      expect(leadPayLabel(c.lead, "ar")).toContain("$");
    });
  }

  it("no pay → no label; period beats the size rule", () => {
    expect(leadPayLabel({ salaryMaxMinor: null, salaryMinMinor: null }, "en-CA")).toBeNull();
    expect(isHourlyLeadPay(19999, null)).toBe(true);
    expect(isHourlyLeadPay(20000, null)).toBe(false);
    expect(isHourlyLeadPay(50000, "hour")).toBe(true);
  });
});

describe("My calendar amounts match the shared currency formatter", () => {
  for (const minor of [1660, 2500, 123450, 5]) {
    it(`${minor} cents`, () => {
      expect(formatAmount(minor, "en-CA")).toBe(formatRwosCurrency(minor / 100, "CAD", { locale: "en-CA" }));
      expect(formatAmount(minor, "fr-CA")).toBe(formatRwosCurrency(minor / 100, "CAD", { locale: "fr-CA" }));
    });
  }
  it("shows cents and thousands separators (was $1234.50 / $25)", () => {
    expect(formatAmount(123450, "en-CA")).toBe("$1,234.50");
    expect(formatAmount(2500, "en-CA")).toBe("$25.00");
  });
});

describe("My pay hours", () => {
  it("uses the reader's decimal mark", () => {
    expect(hours(450, "en-CA")).toBe("7.50");
    expect(hours(450, "fr-CA")).toBe("7,50");
  });
});

describe("Québec time for listings", () => {
  it("a 'from' date starts at midnight in Toronto, winter and summer", () => {
    expect(torontoStartOfDayIso("2026-11-12")).toBe("2026-11-12T05:00:00.000Z");
    expect(torontoStartOfDayIso("2026-07-01")).toBe("2026-07-01T04:00:00.000Z");
    expect(torontoStartOfDayIso("12/11/2026")).toBeNull();
  });

  it("the agenda groups by Québec day in date order", () => {
    const jobs = [
      { id: "late", startAt: "2026-11-13T02:00:00.000Z" }, // Nov 12, 9 p.m. in Toronto
      { id: "first", startAt: "2026-11-11T15:00:00.000Z" },
      { id: "noon", startAt: "2026-11-12T17:00:00.000Z" }
    ];
    const groups = groupByTorontoDay(jobs, (j) => j.startAt);
    expect(groups.map((g) => g.key)).toEqual(["2026-11-11", "2026-11-12"]);
    expect(groups[1]!.items.map((j) => j.id)).toEqual(["late", "noon"]);
  });

  it("job times are Eastern time, not the device's", () => {
    expect(calendarDayKey("2026-11-13T02:00:00.000Z")).toBe("2026-11-12");
    expect(formatWhen("2026-11-13T02:00:00.000Z", "2026-11-13T04:00:00.000Z", "en-CA")).toBe("Thu, Nov 12 · 9:00 p.m. – 11:00 p.m.");
  });
});

describe("My schedule order", () => {
  const now = Date.parse("2026-11-12T12:00:00.000Z");
  const shift = (id: string, start: string, end: string) => ({ id, scheduledStartAt: start, scheduledEndAt: end });
  const items = [
    shift("dec", "2026-12-20T13:00:00.000Z", "2026-12-20T19:00:00.000Z"),
    shift("nov", "2026-11-14T13:00:00.000Z", "2026-11-14T19:00:00.000Z"),
    shift("old", "2026-10-01T13:00:00.000Z", "2026-10-01T19:00:00.000Z"),
    shift("older", "2026-09-01T13:00:00.000Z", "2026-09-01T19:00:00.000Z")
  ];

  it("lists upcoming shifts soonest first and history most recent first", () => {
    const { upcoming, past } = splitSchedule(items, [], now);
    expect(upcoming.map((s) => s.id)).toEqual(["nov", "dec"]);
    expect(past.map((s) => s.id)).toEqual(["old", "older"]);
  });

  it("keeps showing accepted offers that have no shift yet, even when the worker has past shifts", () => {
    const pending = [
      { workerOfferId: "o1", startAt: "2026-11-14T13:00:00.000Z" }, // already a shift → hidden
      { workerOfferId: "o2", startAt: "2026-11-20T13:00:00.000Z" } // no shift yet → shown
    ];
    expect(splitSchedule(items, pending, now).waiting.map((o) => o.workerOfferId)).toEqual(["o2"]);
  });
});

describe("Offers order", () => {
  it("puts offers that need an answer first, soonest shift first", () => {
    const offers = [
      { id: "declined", status: "declined", startAt: "2026-11-13T13:00:00.000Z" },
      { id: "later", status: "sent", startAt: "2026-11-30T13:00:00.000Z" },
      { id: "accepted", status: "accepted", startAt: "2026-11-15T13:00:00.000Z" },
      { id: "soon", status: "viewed", startAt: "2026-11-14T13:00:00.000Z" }
    ];
    expect(sortOffers(offers).map((o) => o.id)).toEqual(["soon", "later", "declined", "accepted"]);
  });
});

describe("wording", () => {
  it("has a singular line for one job off the map", () => {
    for (const locale of ["en-CA", "fr-CA", "ar"] as const) {
      expect(dictionaries[locale]["fw.mapOffMapOne"], locale).toBeTruthy();
    }
    expect(dictionaries["en-CA"]["fw.mapOffMapOne"]).toContain("1 more job is");
  });
});
