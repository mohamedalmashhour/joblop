import { describe, expect, it } from "vitest";
import { formatHourlyRate, formatMoney } from "./contractPricing";
import { formatRwosCurrency } from "./localeFormatting";

// Employer screens (rate card, request price box, dashboard, money overview, orders) format money
// with these helpers. With a locale they must agree with the shared currency formatter; without one
// they keep their old English output so existing callers do not change.
const cad = (amountMinor: number) => ({ amountMinor, currency: "CAD" as const });

describe("formatMoney / formatHourlyRate by language", () => {
  for (const minor of [1660, 2500, 123450, 62086]) {
    it(`${minor} cents matches formatRwosCurrency`, () => {
      expect(formatMoney(cad(minor), "en-CA")).toBe(formatRwosCurrency(minor / 100, "CAD", { locale: "en-CA" }));
      expect(formatMoney(cad(minor), "fr-CA")).toBe(formatRwosCurrency(minor / 100, "CAD", { locale: "fr-CA" }));
    });
  }

  it("writes French the Québec way", () => {
    const plain = (s: string) => s.replace(new RegExp(`[${String.fromCharCode(0xa0, 0x202f)}]`, "g"), " ");
    expect(plain(formatMoney(cad(1660), "fr-CA"))).toBe("16,60 $");
    expect(plain(formatHourlyRate(cad(1660), "fr-CA"))).toBe("16,60 $/h");
  });

  it("keeps English (and the no-locale default) unchanged", () => {
    expect(formatMoney(cad(1660))).toBe("$16.60");
    expect(formatHourlyRate(cad(1660))).toBe("$16.60/hr");
    expect(formatHourlyRate(cad(1660), "en-CA")).toBe("$16.60/hr");
  });
});
