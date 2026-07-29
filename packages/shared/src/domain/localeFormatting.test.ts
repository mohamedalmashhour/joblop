import { describe, expect, it } from "vitest";
import {
  defaultRwosLocale,
  formatRwosCurrency,
  formatRwosDateTime,
  formatRwosDateTimeRange,
  formatRwosNumber,
  invalidFormatFallback,
  resolveRwosLocale,
  supportedRwosLocales
} from "./localeFormatting";

describe("locale-ready formatting", () => {
  it("supports only the explicitly approved default locale", () => {
    expect(supportedRwosLocales).toEqual(["en-CA"]);
    expect(defaultRwosLocale).toBe("en-CA");
    expect(resolveRwosLocale("en-CA")).toBe("en-CA");
    expect(resolveRwosLocale("ar")).toBe("en-CA");
  });

  it("formats dates in the explicit requested time zone", () => {
    const value = "2026-07-28T16:00:00.000Z";
    expect(
      formatRwosDateTime(value, {
        timeZone: "America/Toronto",
        dateStyle: "medium",
        timeStyle: "short"
      })
    ).not.toBe(
      formatRwosDateTime(value, {
        timeZone: "UTC",
        dateStyle: "medium",
        timeStyle: "short"
      })
    );
  });

  it("returns one deterministic fallback for invalid dates, zones and numbers", () => {
    expect(formatRwosDateTime("invalid", { timeZone: "UTC" })).toBe(invalidFormatFallback);
    expect(formatRwosDateTime(0, { timeZone: "invalid/zone" })).toBe(invalidFormatFallback);
    expect(formatRwosDateTimeRange("invalid", 0, { timeZone: "UTC" })).toBe(invalidFormatFallback);
    expect(formatRwosNumber(Number.NaN)).toBe(invalidFormatFallback);
    expect(formatRwosCurrency(10, "invalid")).toBe(invalidFormatFallback);
  });
});
