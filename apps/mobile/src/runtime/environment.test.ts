import { describe, expect, it } from "vitest";
import { isProductionWorkerBuild } from "./environment";

describe("worker production fixture gate", () => {
  it("enables the secure production entry only for an explicit production build", () => {
    expect(isProductionWorkerBuild({ EXPO_PUBLIC_RWOS_ENV: "production" })).toBe(true);
    expect(isProductionWorkerBuild({ EXPO_PUBLIC_RWOS_ENV: "staging" })).toBe(false);
    expect(isProductionWorkerBuild({})).toBe(false);
  });
});
