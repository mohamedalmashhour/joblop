import { describe, expect, it } from "vitest";
import { DEFAULT_ALL_JOBS_PLACE, savedSearchPlace } from "./defaultJobSearch";
import { whitelistSearchQuery } from "./api/marketplace/search/searchQuery";

describe("default jobs on the signed-in home", () => {
  it("uses the saved postal code first, then the saved city", () => {
    expect(savedSearchPlace({ postalCode: " H7G 1A1 ", city: "Laval" })).toBe("H7G 1A1");
    expect(savedSearchPlace({ postalCode: "", city: " Laval " })).toBe("Laval");
  });

  it("has no saved place when the profile has none", () => {
    expect(savedSearchPlace(null)).toBeNull();
    expect(savedSearchPlace({ city: null, postalCode: null })).toBeNull();
  });

  it("the 'all open jobs' query passes the search whitelist with no radius (any distance)", () => {
    expect(whitelistSearchQuery({ place: DEFAULT_ALL_JOBS_PLACE, sort: "soonest" })).toEqual({ place: "Montréal", sort: "soonest" });
  });
});
