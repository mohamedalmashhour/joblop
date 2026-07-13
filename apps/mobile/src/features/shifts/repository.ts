import type {
  ShiftDiscoveryFilters,
  ShiftDiscoveryRecord,
  ShiftDiscoveryRepository
} from "@rwos/shared";

export type ShiftDiscoveryState =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "populated"; shifts: readonly ShiftDiscoveryRecord[] }>
  | Readonly<{ status: "empty"; message: string }>
  | Readonly<{ status: "error"; message: string }>;

export type { ShiftDiscoveryFilters, ShiftDiscoveryRecord, ShiftDiscoveryRepository };
