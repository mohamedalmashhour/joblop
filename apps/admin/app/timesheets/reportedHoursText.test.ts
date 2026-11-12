import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { approveBody } from "./ReportedHours";
import { fill, reportedHoursText } from "./reportedHoursText";

const ARABIC = /[؀-ۿ]/;

describe("Reported hours (Timesheets page)", () => {
  it("has the same keys in English, French and Arabic, each filled and in its language", () => {
    const keys = Object.keys(reportedHoursText.en).sort();
    for (const locale of ["fr", "ar"] as const) expect(Object.keys(reportedHoursText[locale]).sort()).toEqual(keys);
    for (const key of keys as (keyof typeof reportedHoursText.en)[]) {
      expect(reportedHoursText.fr[key], key).not.toBe(reportedHoursText.en[key]);
      expect(reportedHoursText.ar[key], key).toMatch(ARABIC);
      expect(reportedHoursText.en[key], key).not.toMatch(ARABIC);
    }
    expect(reportedHoursText.en.overrideLede).toContain("12-hour");
  });

  it("the component reads every word from the page text (no English literals in the markup)", () => {
    const source = readFileSync(new URL("./ReportedHours.tsx", import.meta.url), "utf8");
    expect(source).toContain("usePageText(reportedHoursText)");
    expect(source).not.toMatch(/>\s*(Approve|Reject|Enter hours|Arrival|Departure)\b/);
  });

  it("approves with only the times staff changed", () => {
    expect(approveBody({ reportedArrival: "08:00", reportedDeparture: "14:00" }, { arrival: "08:00", departure: "14:00" })).toEqual({});
    expect(approveBody({ reportedArrival: "08:00", reportedDeparture: "14:00" }, { arrival: "08:15", departure: "14:00" })).toEqual({ arrivalTime: "08:15" });
    expect(fill("{a}–{b}", { a: "08:00", b: "14:00" })).toBe("08:00–14:00");
  });
});
