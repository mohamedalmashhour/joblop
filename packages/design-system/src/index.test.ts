import { describe, expect, it } from "vitest";
import { colors } from "./index";

describe("design system colors", () => {
  it("uses the approved dark-blue foundation palette", () => {
    expect(colors.deepTeal).toBe("#071f4d");
    expect(colors.deepTealMuted).toBe("#123b78");
    expect(colors.text).toBe("#0b1f3a");
  });
});
