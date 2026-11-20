import { describe, expect, it } from "vitest";
import { homeDestinations } from "./homeContent";

describe("home destinations", () => {
  it("routes to every live destination plus onboarding", () => {
    expect(homeDestinations.map((d) => d.id)).toEqual(["available", "myShifts", "calendar", "earnings", "onboarding"]);
  });

  it("every destination has a label and description", () => {
    for (const d of homeDestinations) {
      expect(d.label.length).toBeGreaterThan(0);
      expect(d.description.length).toBeGreaterThan(0);
    }
  });
});
