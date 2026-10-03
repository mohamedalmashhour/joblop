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
    expect(supportedRwosLocales).toEqual(["en-CA", "fr-CA"]);
    expect(defaultRwosLocale).toBe("en-CA");
    expect(resolveRwosLocale("en-CA")).toBe("en-CA");
    expect(resolveRwosLocale("fr-CA")).toBe("fr-CA");
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

  // CHARACTERIZATION (Stage 2b.3a): Canadian CAD display must stay byte-identical after the display
  // decoupling. These are the ACTUAL current-behavior strings for en-CA/CAD (captured, not invented):
  // zero, one cent, a normal rate, a thousands-separated amount, a negative value, and a large amount.
  it("renders CAD amounts byte-identically (en-CA)", () => {
    expect(formatRwosCurrency(0, "CAD")).toBe("$0.00");
    expect(formatRwosCurrency(0.01, "CAD")).toBe("$0.01");
    expect(formatRwosCurrency(30, "CAD")).toBe("$30.00");
    expect(formatRwosCurrency(1234.56, "CAD")).toBe("$1,234.56");
    expect(formatRwosCurrency(-12.5, "CAD")).toBe("-$12.50");
    expect(formatRwosCurrency(1000000.99, "CAD")).toBe("$1,000,000.99");
  });

  // Fraction digits are per-CURRENCY (ISO 4217 exponent), NOT a universal 2. Removing the old
  // hard-coded 2/2 override must not silently render every currency with two decimals.
  it("uses each currency's own minor-unit exponent, not a universal 2", () => {
    expect(formatRwosCurrency(1000, "JPY")).toBe("JP¥1,000"); // 0-decimal currency → no fraction part
    expect(formatRwosCurrency(30, "USD")).toBe("US$30.00"); // 2-decimal currency → unchanged
    // an explicit country/currency-specific override is still honored when supplied
    expect(formatRwosCurrency(1000, "JPY", { fractionDigits: 2 })).toBe("JP¥1,000.00");
  });
});
