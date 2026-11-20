import { describe, expect, it } from "vitest";
import {
  foldPlaceText,
  looksLikePostalCode,
  matchingPlaceNames,
  placeMatches,
  postalAreaOf,
  resolveKnownPlace
} from "./placeSearch";

describe("foldPlaceText", () => {
  it("drops accents, case and punctuation", () => {
    expect(foldPlaceText("Montréal")).toBe("montreal");
    expect(foldPlaceText("LÉVIS")).toBe("levis");
    expect(foldPlaceText("Trois-Rivières")).toBe("trois rivieres");
    expect(foldPlaceText("Val-d'Or")).toBe("val d or");
  });

  it("treats St / Ste as Saint / Sainte", () => {
    expect(foldPlaceText("St-Jérôme")).toBe(foldPlaceText("Saint-Jérôme"));
    expect(foldPlaceText("Ste-Julie")).toBe("sainte julie");
  });

  it("is empty for missing text", () => {
    expect(foldPlaceText(null)).toBe("");
    expect(foldPlaceText("  ")).toBe("");
  });
});

describe("placeMatches", () => {
  it("matches with or without accents, in any case", () => {
    expect(placeMatches("Montréal", "Montreal")).toBe(true);
    expect(placeMatches("Montréal", "montreal")).toBe(true);
    expect(placeMatches("Montreal", "Montréal")).toBe(true);
    expect(placeMatches("Lévis", "levis")).toBe(true);
    expect(placeMatches("Québec", "QUEBEC")).toBe(true);
  });

  it("ignores a trailing province", () => {
    expect(placeMatches("Laval", "Laval, QC")).toBe(true);
    expect(placeMatches("Lévis", "Levis, Québec")).toBe(true);
  });

  it("does not match a different place", () => {
    expect(placeMatches("Laval", "Montreal")).toBe(false);
    expect(placeMatches(null, "Montreal")).toBe(false);
  });

  it("returns the matching stored names", () => {
    expect(matchingPlaceNames(["Montréal", "Laval", "Montréal-Nord", null, "Montréal"], "montreal")).toEqual(["Montréal", "Montréal-Nord"]);
  });
});

describe("resolveKnownPlace", () => {
  it("finds a city without its accents", () => {
    expect(resolveKnownPlace("Montreal")?.name).toBe("Montréal");
    expect(resolveKnownPlace("levis")?.name).toBe("Lévis");
    expect(resolveKnownPlace("trois rivieres")?.name).toBe("Trois-Rivières");
    expect(resolveKnownPlace("St-Jerome")?.name).toBe("Saint-Jérôme");
    expect(resolveKnownPlace("Quebec City")?.name).toBe("Québec");
    expect(resolveKnownPlace("Laval, QC")?.province).toBe("QC");
  });

  it("accepts a unique start of a name", () => {
    expect(resolveKnownPlace("sherb")?.name).toBe("Sherbrooke");
  });

  it("returns null for unknown or ambiguous text", () => {
    expect(resolveKnownPlace("ZZZ")).toBeNull();
    expect(resolveKnownPlace("saint")).toBeNull(); // several cities start with Saint
    expect(resolveKnownPlace("")).toBeNull();
  });
});

describe("postal codes", () => {
  it("recognises a postal code or its first half", () => {
    expect(looksLikePostalCode("H2X 1Y4")).toBe(true);
    expect(looksLikePostalCode("h2x")).toBe(true);
    expect(looksLikePostalCode("Montreal")).toBe(false);
    expect(postalAreaOf("h2x 1y4")).toBe("H2X");
    expect(postalAreaOf("ZZZ")).toBeNull();
  });
});
