import { describe, expect, it } from "vitest";
import { MockShiftDiscoveryRepository } from "./mockShiftDiscoveryRepository";
import { mockShiftDiscoveryRecords } from "../../data/mock/shifts";

describe("MockShiftDiscoveryRepository", () => {
  const repository = new MockShiftDiscoveryRepository(mockShiftDiscoveryRecords);

  it("lists only available open shifts", async () => {
    const shifts = await repository.listAvailableShifts();

    expect(shifts.length).toBe(12);
    expect(shifts.every((shift) => shift.status === "open")).toBe(true);
  });

  it("gets a shift by ID", async () => {
    const shift = await repository.getShiftById("shift_emergency_chef_001");

    expect(shift?.title).toBe("Emergency Chef");
  });

  it("returns null for an unknown shift", async () => {
    await expect(repository.getShiftById("missing")).resolves.toBeNull();
  });

  it("filters by keyword, city, category and urgency together", async () => {
    const shifts = await repository.listAvailableShifts({
      category: "kitchen",
      city: "Montreal",
      keyword: "chef",
      urgency: "immediate"
    });

    expect(shifts.map((shift) => shift.id)).toEqual(["shift_emergency_chef_001"]);
  });

  it("supports empty filter results", async () => {
    const shifts = await repository.listAvailableShifts({ city: "Quebec City" });

    expect(shifts).toEqual([]);
  });

  it("lists supported filter options from open shifts", async () => {
    await expect(repository.listShiftCategories()).resolves.toEqual([
      "care",
      "housekeeping",
      "kitchen",
      "maintenance"
    ]);
    await expect(repository.listSupportedCities()).resolves.toEqual([
      "Laval",
      "Longueuil",
      "Montreal"
    ]);
  });
});
