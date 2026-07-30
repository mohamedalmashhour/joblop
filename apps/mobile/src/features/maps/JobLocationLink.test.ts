import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { directionsUrl, mapSearchUrl } from "./mapUrls";

const source = readFileSync(new URL("./JobLocationLink.tsx", import.meta.url), "utf8");

describe("worker job location capsule", () => {
  it("encodes the synthetic destination without embedding an origin or location tracker", () => {
    const address = "Test Employer Organization A, Montréal, QC";
    const directions = directionsUrl(address);

    expect(directions).toContain(`destination=${encodeURIComponent(address)}`);
    expect(directions).not.toContain("origin=");
    expect(directions).not.toContain("latitude");
    expect(directions).not.toContain("longitude");
  });

  it("uses a keyless map search URL for the visible address", () => {
    const address = "Test Employer Organization B, Laval, QC";

    expect(mapSearchUrl(address)).toBe(
      `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`
    );
  });

  it("gives repeated map controls address-specific accessible names", () => {
    expect(source).toContain("accessibilityLabel={`Get directions to ${trimmed}`}");
    expect(source).toContain("accessibilityLabel={`View ${trimmed} on map`}");
  });
});
