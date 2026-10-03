import { describe, expect, it } from "vitest";
import { compareToMarket } from "./marketWage";

describe("market-wage comparison (pure)", () => {
  it("is unknown without a usable market median", () => {
    expect(compareToMarket(3000, null)).toBe("unknown");
    expect(compareToMarket(3000, 0)).toBe("unknown");
    expect(compareToMarket(3000, undefined)).toBe("unknown");
  });

  it("classifies below / at / above with a ±5% band", () => {
    // median 2000 -> band 100 -> [1900, 2100] is "at"
    expect(compareToMarket(2000, 2000)).toBe("at");
    expect(compareToMarket(1900, 2000)).toBe("at");
    expect(compareToMarket(2100, 2000)).toBe("at");
    expect(compareToMarket(1899, 2000)).toBe("below");
    expect(compareToMarket(2101, 2000)).toBe("above");
  });
});
