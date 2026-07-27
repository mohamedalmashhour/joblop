import type {
  ShiftCategory,
  ShiftDiscoveryFilters,
  ShiftDiscoveryRecord,
  ShiftDiscoveryRepository
} from "@rwos/shared";
import { shiftDiscoveryRecordSchema } from "@rwos/validation";
import { mockShiftDiscoveryRecords } from "../../data/mock/shifts";
import { isProductionWorkerBuild } from "../../runtime/environment";
import { normalizeFilters, shiftMatchesFilters } from "./filters";

export class MockShiftDiscoveryRepository implements ShiftDiscoveryRepository {
  private readonly shifts: readonly ShiftDiscoveryRecord[];

  constructor(
    shifts: readonly ShiftDiscoveryRecord[] = isProductionWorkerBuild()
      ? []
      : mockShiftDiscoveryRecords
  ) {
    this.shifts = shifts.map((shift) => shiftDiscoveryRecordSchema.parse(shift));
  }

  async listAvailableShifts(
    filters: ShiftDiscoveryFilters = {}
  ): Promise<readonly ShiftDiscoveryRecord[]> {
    const normalizedFilters = normalizeFilters(filters);
    return this.shifts.filter((shift) => shiftMatchesFilters(shift, normalizedFilters));
  }

  async getShiftById(id: string): Promise<ShiftDiscoveryRecord | null> {
    return this.shifts.find((shift) => shift.id === id) ?? null;
  }

  async listShiftCategories(): Promise<readonly ShiftCategory[]> {
    return [
      ...new Set(
        this.shifts.filter((shift) => shift.status === "open").map((shift) => shift.category)
      )
    ].sort();
  }

  async listSupportedCities(): Promise<readonly string[]> {
    return [
      ...new Set(this.shifts.filter((shift) => shift.status === "open").map((shift) => shift.city))
    ].sort();
  }
}

export const mockShiftDiscoveryRepository = new MockShiftDiscoveryRepository();
