import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatRwosCurrency } from "@rwos/shared";
import { adminDateTime, adminMoney } from "./i18n/adminFormat";
import { entryDayKey, mondayFirstOffset } from "./calendar/MonthCalendar";
import { formatMoney } from "./calendar/job-coverage/BonusSection";
import { shiftWhen, sortRowsBySoonestShift } from "./dispatches/dispatchListRows";

const read = (...path: string[]) => readFileSync(join(__dirname, ...path), "utf8");

// Round 7: staff money, dates and calendars.
describe("admin money follows the domain formatter and the admin's language", () => {
  for (const minor of [1660, 54000, 123450]) {
    it(`${minor} cents`, () => {
      expect(adminMoney(minor, "CAD", "en-CA")).toBe(formatRwosCurrency(minor / 100, "CAD", { locale: "en-CA" }));
      expect(adminMoney(minor, "CAD", "fr-CA")).toBe(formatRwosCurrency(minor / 100, "CAD", { locale: "fr-CA" }));
      // Arabic formats money like en-CA ("$16.60"), never "CA$" or "16.60 CA$".
      expect(adminMoney(minor, "CAD", "ar")).toBe(formatRwosCurrency(minor / 100, "CAD", { locale: "en-CA" }));
    });
  }

  it("never uses the browser's locale on payroll, payouts, invoices or coverage", () => {
    for (const file of [
      ["payroll", "PayrollConsole.tsx"],
      ["payouts", "WorkerPayoutsPanel.tsx"],
      ["invoices", "InvoiceApprovalPanel.tsx"],
      ["calendar", "job-coverage", "BonusSection.tsx"],
      ["calendar", "job-coverage", "CoverageCalendarPanel.tsx"]
    ]) {
      expect(read(...file), file.join("/")).not.toContain("NumberFormat(undefined");
    }
    expect(formatMoney(1660)).toBe("$16.60");
    expect(read("calendar", "PersistedAdminReviewPanel.tsx")).toContain("adminMoney(minor, pricing?.currency ?? \"CAD\", appLocale)");
  });

  it("shows dates in Toronto time", () => {
    // 02:00 UTC on Nov 13 is 9:00 p.m. on Nov 12 in Toronto.
    expect(adminDateTime("2026-11-13T02:00:00.000Z", "en-CA", { dateStyle: "medium" })).toBe("Nov 12, 2026");
    expect(adminDateTime("not a date", "en-CA")).toBe("—");
  });
});

describe("staff month calendar", () => {
  it("places entries on their Toronto day; a date-only value stays that day", () => {
    expect(entryDayKey("2026-11-13T02:00:00.000Z")).toBe("2026-11-12");
    expect(entryDayKey("2026-11-12")).toBe("2026-11-12");
    expect(entryDayKey("garbage")).toBeNull();
  });

  it("starts weeks on Monday", () => {
    expect(mondayFirstOffset(new Date(2026, 10, 1))).toBe(6); // Nov 1, 2026 is a Sunday
    expect(mondayFirstOffset(new Date(2026, 5, 1))).toBe(0); // June 1, 2026 is a Monday
    expect(read("calendar", "MonthCalendar.tsx")).toContain("const weekdays = [...t.weekdays.slice(1), t.weekdays[0]];");
  });
});

describe("dispatch list", () => {
  it("shows the shift date and lists the soonest shift first", () => {
    const rows = [
      { id: "b", jobRequestId: "j", state: "active", priority: "normal", requiredWorkerCount: 1, createdAt: "2026-11-01T00:00:00.000Z", shiftStartAt: "2026-11-20T13:00:00.000Z" },
      { id: "c", jobRequestId: "j", state: "active", priority: "normal", requiredWorkerCount: 1, createdAt: "2026-11-01T00:00:00.000Z", shiftStartAt: null },
      { id: "a", jobRequestId: "j", state: "active", priority: "normal", requiredWorkerCount: 1, createdAt: "2026-11-01T00:00:00.000Z", shiftStartAt: "2026-11-12T13:00:00.000Z" }
    ];
    expect(sortRowsBySoonestShift(rows).map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(shiftWhen({ shiftStartAt: "2026-11-12T13:00:00.000Z", shiftEndAt: "2026-11-12T19:00:00.000Z", shiftTimezone: "America/Toronto" })).toBe(
      "Thu, Nov 12, 8:00 a.m. – 2:00 p.m."
    );
    expect(shiftWhen({ shiftStartAt: null })).toBeNull();
  });
});
