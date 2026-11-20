import { describe, expect, it, vi } from "vitest";
import {
  createFixtureGeocodingProvider,
  isWithinCanadaBounds,
  normalizeCanadianPostalCode,
  provinceHintFromPostalCode,
  type GeocodingProvider
} from "@rwos/shared";

// The Canada address capability (same behaviour as countries/canada's adapter).
const canadaAddressAdapter = {
  normalizePostalCode: normalizeCanadianPostalCode,
  isWithinCountryBounds: isWithinCanadaBounds,
  regionHintFromPostalCode: provinceHintFromPostalCode,
  geocodeCountryRestriction: "CA"
};
import { cleanPlaceInput, resolveSearchPlace, searchPlaceFailure } from "./searchPlace";

const geocoder = createFixtureGeocodingProvider(
  { H2X: { province: "QC", city: "Montréal", latitude: 45.5088, longitude: -73.5678 } },
  { countryAddress: canadaAddressAdapter }
);
const deps = { countryAddress: canadaAddressAdapter, geocoder };

describe("resolveSearchPlace", () => {
  it("resolves a known postal code", async () => {
    const result = await resolveSearchPlace("h2x 1y4", deps);
    expect(result).toMatchObject({ status: "ok", place: { city: "Montréal", province: "QC", postalCode: "H2X 1Y4", label: "H2X 1Y4" } });
  });

  it("resolves a city typed without accents, without calling the geocoder", async () => {
    const spy: GeocodingProvider = { name: "spy", geocode: vi.fn(async () => ({ status: "not_found" as const })) };
    const montreal = await resolveSearchPlace("Montreal", { ...deps, geocoder: spy });
    expect(montreal).toMatchObject({ status: "ok", place: { city: "Montréal", province: "QC", postalCode: null, label: "Montréal, QC" } });
    const levis = await resolveSearchPlace("levis", { ...deps, geocoder: spy });
    expect(levis).toMatchObject({ status: "ok", place: { city: "Lévis" } });
    expect(spy.geocode).not.toHaveBeenCalled();
  });

  it("an unknown postal code or place is not_found (a friendly 400, never a 500)", async () => {
    expect(await resolveSearchPlace("H9X 9X9", deps)).toEqual({ status: "not_found" });
    expect(await resolveSearchPlace("ZZZ", deps)).toEqual({ status: "not_found" });
    expect(await resolveSearchPlace("H7V 1A1H2X 1Y4", deps)).toEqual({ status: "not_found" });
    expect(await resolveSearchPlace("12345", deps)).toEqual({ status: "not_found" });
  });

  it("empty input is missing", async () => {
    expect(await resolveSearchPlace("   ", deps)).toEqual({ status: "missing" });
    expect(await resolveSearchPlace(undefined, deps)).toEqual({ status: "missing" });
  });

  it("a geocoder outage is unavailable, and a thrown error never escapes", async () => {
    const down: GeocodingProvider = { name: "down", geocode: async () => ({ status: "provider_unavailable" }) };
    expect(await resolveSearchPlace("H2X 1Y4", { ...deps, geocoder: down })).toEqual({ status: "unavailable" });
    const broken: GeocodingProvider = { name: "broken", geocode: async () => { throw new Error("boom"); } };
    expect(await resolveSearchPlace("Rimouskiville", { ...deps, geocoder: broken })).toEqual({ status: "unavailable" });
  });

  it("an unlisted town goes to the geocoder as an address", async () => {
    const google: GeocodingProvider = {
      name: "g",
      geocode: vi.fn(async () => ({
        status: "ok" as const,
        location: {
          country: "CA" as const, province: "QC" as const, city: "Sainte-Adèle", postalCode: null, addressLines: [],
          latitude: 45.95, longitude: -74.13, precision: "approximate" as const, provider: "g", providerReference: null, resolvedAt: ""
        }
      }))
    };
    const result = await resolveSearchPlace("Sainte-Adele", { ...deps, geocoder: google });
    expect(result).toMatchObject({ status: "ok", place: { city: "Sainte-Adèle", label: "Sainte-Adèle, QC" } });
    expect(google.geocode).toHaveBeenCalledWith({ countryRestriction: "CA", address: "Sainte-Adele" });
  });
});

describe("searchPlaceFailure", () => {
  it("answers 400 / 503 with a plain message", () => {
    expect(searchPlaceFailure("not_found")).toEqual({
      code: 400,
      body: { error: "RWOS_PLACE_NOT_FOUND", message: "We couldn't find that place. Check the city or postal code, or try a nearby one." }
    });
    expect(searchPlaceFailure("missing").code).toBe(400);
    expect(searchPlaceFailure("unavailable").code).toBe(503);
  });

  it("cleans the input", () => {
    expect(cleanPlaceInput("  Laval   QC ")).toBe("Laval QC");
    expect(cleanPlaceInput(42)).toBeNull();
    expect(cleanPlaceInput("x".repeat(200))?.length).toBe(80);
  });
});
