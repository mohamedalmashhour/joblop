import { describe, expect, it } from "vitest";
import { formatWorksiteAddress, isWorksiteAddressVisible, type WorksiteAddressFields } from "./worksiteAddress";

const empty: WorksiteAddressFields = { addressLine1: null, addressLine2: null, city: null, province: null, region: null, postalCode: null, addressSummary: null };

describe("worksite address", () => {
  it("joins the parts the worksite holds, skipping blanks", () => {
    expect(formatWorksiteAddress({ ...empty, addressLine1: " 1 Main St ", addressLine2: "  ", city: "Town", region: "RG", postalCode: "12345" })).toBe("1 Main St, Town, RG, 12345");
  });

  it("does not pass a city off as an exact address", () => {
    expect(formatWorksiteAddress({ ...empty, city: "Town" })).toBeNull();
    expect(formatWorksiteAddress({ ...empty, city: "Town", addressSummary: "Behind the market" })).toBe("Behind the market");
  });

  it("shows the address only while the shift is still to be worked", () => {
    expect(["pending_start", "checked_in"].every(isWorksiteAddressVisible)).toBe(true);
    expect(["checked_out", "completed", "missed", "cancelled", "exception"].some(isWorksiteAddressVisible)).toBe(false);
  });
});
