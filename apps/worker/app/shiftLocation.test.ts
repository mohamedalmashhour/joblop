import { describe, expect, it } from "vitest";
import { checkInOpensAt, directionsUrlForAddress, embedUrlForAddress, isCheckInOpen, isMappableAddress } from "./shiftLocation";

describe("confirmed shift map links", () => {
  it("opens Google Maps directions to the encoded address", () => {
    expect(directionsUrlForAddress(" 901 Avenue du Parc, Laval, QC ")).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=901%20Avenue%20du%20Parc%2C%20Laval%2C%20QC"
    );
  });

  it("embeds the address without any API key, in the page language", () => {
    const url = embedUrlForAddress("901 Avenue du Parc, Laval", "fr-CA");
    expect(url).toContain("output=embed");
    expect(url).toContain("hl=fr");
    expect(url).not.toMatch(/key=/);
  });

  it("maps only a real address", () => {
    expect(isMappableAddress("901 Avenue du Parc, Laval")).toBe(true);
    expect(isMappableAddress(null)).toBe(false);
    expect(isMappableAddress("  ")).toBe(false);
    expect(isMappableAddress("Address restricted")).toBe(false);
  });
});

describe("check-in window", () => {
  const start = "2026-11-12T12:30:00.000Z";
  it("opens 30 minutes before the start", () => {
    expect(checkInOpensAt(start).toISOString()).toBe("2026-11-12T12:00:00.000Z");
  });
  it("is closed days before and one minute before the window", () => {
    expect(isCheckInOpen(start, Date.parse("2026-11-09T15:00:00.000Z"))).toBe(false);
    expect(isCheckInOpen(start, Date.parse("2026-11-12T11:59:00.000Z"))).toBe(false);
  });
  it("is open from 30 minutes before, and after the start", () => {
    expect(isCheckInOpen(start, Date.parse("2026-11-12T12:00:00.000Z"))).toBe(true);
    expect(isCheckInOpen(start, Date.parse("2026-11-12T13:00:00.000Z"))).toBe(true);
  });
});
