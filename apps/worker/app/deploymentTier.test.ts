import { describe, expect, it } from "vitest";
import { isProductionTier } from "./deploymentTier";

describe("isProductionTier", () => {
  it("is true only for the production tier", () => {
    expect(isProductionTier("production")).toBe(true);
    expect(isProductionTier("staging")).toBe(false);
    expect(isProductionTier("test")).toBe(false);
    expect(isProductionTier(undefined)).toBe(false);
    expect(isProductionTier("")).toBe(false);
  });
});
