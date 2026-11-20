import { describe, expect, it } from "vitest";
import { whitelistSearchQuery } from "./searchQuery";

describe("whitelistSearchQuery", () => {
  it("forwards every filter the search page offers (none are dropped)", () => {
    expect(
      whitelistSearchQuery({
        place: " Montreal ",
        radiusKm: 25,
        role: "Nurse",
        sort: "soonest",
        dateFrom: "2026-11-20",
        dateTo: "2026-11-30T00:00:00.000Z",
        minOpenings: 2,
        verifiedOnly: true,
        cursor: 20
      })
    ).toEqual({
      place: "Montreal",
      radiusKm: 25,
      role: "Nurse",
      sort: "soonest",
      dateFrom: "2026-11-20T00:00:00.000Z",
      dateTo: "2026-11-30T00:00:00.000Z",
      minOpenings: 2,
      verifiedOnly: true,
      cursor: 20
    });
  });

  it("still accepts postalCode from older pages", () => {
    expect(whitelistSearchQuery({ postalCode: "H2X 1Y4" })).toEqual({ place: "H2X 1Y4" });
  });

  it("drops anything the browser must not influence or that is malformed", () => {
    expect(
      whitelistSearchQuery({ place: "Laval", latitude: 45, sort: "cheapest", dateFrom: "not a date", minOpenings: -1, verifiedOnly: "yes", radiusKm: 9999 })
    ).toEqual({ place: "Laval", radiusKm: 500 });
  });

  it("needs a place", () => {
    expect(whitelistSearchQuery({ place: "   " })).toBeNull();
    expect(whitelistSearchQuery(null)).toBeNull();
  });
});
