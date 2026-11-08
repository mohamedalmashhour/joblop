import { describe, expect, it } from "vitest";
import { isProductionTier } from "./deploymentTier";

describe("isProductionTier", () => {
  it("is true only for the production tier", () => {
    expect(isProductionTier("production")).toBe(true);
    expect(isProductionTier("staging")).toBe(false);
    expect(isProductionTier("test")).toBe(false);
    expect(isProductionTier(undefined, "development")).toBe(false);
    expect(isProductionTier("", "test")).toBe(false);
  });
  it("treats a release build with no tier (deploy/Dockerfile on Render) as production", () => {
    expect(isProductionTier(undefined, "production")).toBe(true);
    expect(isProductionTier("staging", "production")).toBe(false);
  });
});
