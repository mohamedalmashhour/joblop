import { describe, expect, it } from "vitest";
import {
  createFixtureGeocodingProvider,
  createOsmGeocodingProvider,
  type GeocodeFixture,
  type GeocodingAddressCapability
} from "./geocodingProviders";
import {
  isWithinCanadaBounds,
  normalizeCanadianPostalCode,
  provinceHintFromPostalCode
} from "./canadaLocation";

// Canada address capability built from the existing functions (mirrors countries/canada's
// canadaAddressAdapter without importing it — that would create a shared↔country build cycle).
// Preserves the exact previous behavior for these tests.
const canadaCapability: GeocodingAddressCapability = {
  normalizePostalCode: normalizeCanadianPostalCode,
  isWithinCountryBounds: isWithinCanadaBounds,
  regionHintFromPostalCode: provinceHintFromPostalCode,
  geocodeCountryRestriction: "CA"
};

const fixtures: Record<string, GeocodeFixture> = {
  "H7V": { province: "QC", city: "Laval", latitude: 45.6066, longitude: -73.7124 },
  "M5V 2T6": { province: "ON", city: "Toronto", latitude: 43.6426, longitude: -79.3871, precision: "rooftop" }
};

describe("fixture geocoding provider", () => {
  const provider = createFixtureGeocodingProvider(fixtures, { countryAddress: canadaCapability });

  it("resolves a known postal code (FSA or full) to a Canadian location", async () => {
    const r = await provider.geocode({ postalCode: "h7v0b1", countryRestriction: "CA" });
    expect(r.status).toBe("ok");
    if (r.status === "ok") {
      expect(r.location).toMatchObject({ country: "CA", province: "QC", city: "Laval", postalCode: "H7V 0B1", provider: "fixture" });
    }
    const full = await provider.geocode({ postalCode: "M5V 2T6", countryRestriction: "CA" });
    expect(full.status).toBe("ok");
  });

  it("returns not_found for an invalid or unknown postal code", async () => {
    expect((await provider.geocode({ postalCode: "12345", countryRestriction: "CA" })).status).toBe("not_found");
    expect((await provider.geocode({ postalCode: "K1A 0B1", countryRestriction: "CA" })).status).toBe("not_found");
  });
});

describe("OSM geocoding provider", () => {
  const make = (fetchImpl: typeof fetch) => createOsmGeocodingProvider({ fetch: fetchImpl, userAgent: "Joblop-test/1.0", countryAddress: canadaCapability });
  const ok = (body: unknown): typeof fetch =>
    (async () => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } })) as unknown as typeof fetch;

  it("maps a single Canadian result to CanadianLocation", async () => {
    const provider = make(ok([{ lat: "45.6066", lon: "-73.7124", address: { state: "Quebec", city: "Laval", postcode: "H7V 0B1", country_code: "ca" } }]));
    const r = await provider.geocode({ postalCode: "H7V 0B1", countryRestriction: "CA" });
    expect(r.status).toBe("ok");
    if (r.status === "ok") expect(r.location).toMatchObject({ province: "QC", city: "Laval", provider: "osm" });
  });

  it("treats multiple results as ambiguous", async () => {
    const provider = make(ok([{ lat: "45", lon: "-73", address: { state: "Quebec", country_code: "ca" } }, { lat: "46", lon: "-72", address: { state: "Quebec", country_code: "ca" } }]));
    expect((await provider.geocode({ address: "Main St", countryRestriction: "CA" })).status).toBe("ambiguous");
  });

  it("rejects a non-Canadian result / out-of-bounds coordinates", async () => {
    const usa = make(ok([{ lat: "40.7", lon: "-74.0", address: { state: "New York", country_code: "us" } }]));
    expect((await usa.geocode({ address: "NYC", countryRestriction: "CA" })).status).toBe("outside_canada");
  });

  it("returns provider_unavailable on network failure / non-200", async () => {
    const down = make((async () => { throw new Error("network"); }) as unknown as typeof fetch);
    expect((await down.geocode({ postalCode: "H7V 0B1", countryRestriction: "CA" })).status).toBe("provider_unavailable");
    const err = make((async () => new Response("nope", { status: 503 })) as unknown as typeof fetch);
    expect((await err.geocode({ postalCode: "H7V 0B1", countryRestriction: "CA" })).status).toBe("provider_unavailable");
  });

  it("rejects an invalid Canadian postal format before calling out", async () => {
    let called = false;
    const provider = make((async () => { called = true; return new Response("[]"); }) as unknown as typeof fetch);
    expect((await provider.geocode({ postalCode: "ZZZZZZ", countryRestriction: "CA" })).status).toBe("not_found");
    expect(called).toBe(false);
  });
});
